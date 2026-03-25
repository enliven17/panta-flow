import fs from 'fs'
import path from 'path'
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Log,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiquidatorConfig {
  rpcUrl: string
  liquidatorPrivateKey: string
  vaultAddress: `0x${string}`
  readerAddress: `0x${string}`
  pollIntervalMs: number // 10000
}

// ─── Token config ─────────────────────────────────────────────────────────────
// 4 position slots: ETH long, ETH short, BTC long, BTC short

const POSITION_SLOTS = 4
// Indices per position in Reader.getPositions response
const POSITION_PROPS_LENGTH = 9

// ─── ABIs ────────────────────────────────────────────────────────────────────

const VAULT_ABI = [
  {
    name: 'validateLiquidation',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'indexToken', type: 'address' },
      { name: 'isLong', type: 'bool' },
      { name: 'raise', type: 'bool' },
    ],
    outputs: [
      { name: 'liquidationState', type: 'uint256' },
      { name: 'marginFees', type: 'uint256' },
    ],
  },
  {
    name: 'liquidatePosition',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'indexToken', type: 'address' },
      { name: 'isLong', type: 'bool' },
      { name: 'feeReceiver', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'IncreasePosition',
    type: 'event',
    inputs: [
      { name: 'key', type: 'bytes32', indexed: true },
      { name: 'account', type: 'address', indexed: false },
      { name: 'collateralToken', type: 'address', indexed: false },
      { name: 'indexToken', type: 'address', indexed: false },
      { name: 'collateralDelta', type: 'uint256', indexed: false },
      { name: 'sizeDelta', type: 'uint256', indexed: false },
      { name: 'isLong', type: 'bool', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
    ],
  },
] as const

const READER_ABI = [
  {
    name: 'getPositions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'account', type: 'address' },
      { name: 'collateralTokens', type: 'address[]' },
      { name: 'indexTokens', type: 'address[]' },
      { name: 'isLong', type: 'bool[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const

// ─── Config loading ───────────────────────────────────────────────────────────

function loadConfig(): LiquidatorConfig {
  const addressesPath = path.resolve(__dirname, '../../deployed-addresses.json')
  let deployedAddresses: Record<string, string> = {}

  if (fs.existsSync(addressesPath)) {
    deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'))
  } else {
    console.warn('[liquidator] deployed-addresses.json not found, using zero addresses')
  }

  const rpcUrl = process.env.INITIA_TESTNET_RPC_URL
  if (!rpcUrl) throw new Error('INITIA_TESTNET_RPC_URL env var is required')

  const liquidatorPrivateKey = process.env.LIQUIDATOR_PRIVATE_KEY
  if (!liquidatorPrivateKey) throw new Error('LIQUIDATOR_PRIVATE_KEY env var is required')

  const zero = '0x0000000000000000000000000000000000000000'

  return {
    rpcUrl,
    liquidatorPrivateKey,
    vaultAddress: (deployedAddresses.Vault ?? zero) as `0x${string}`,
    readerAddress: (deployedAddresses.Reader ?? zero) as `0x${string}`,
    pollIntervalMs: 10_000,
  }
}

// ─── Token addresses from deployed-addresses.json ────────────────────────────

function loadTokenAddresses(): {
  USDC: Address
  ETH: Address
  BTC: Address
  collaterals: Address[]
  indexTokens: Address[]
  isLong: boolean[]
} {
  const addressesPath = path.resolve(__dirname, '../../deployed-addresses.json')
  let deployedAddresses: Record<string, string> = {}

  if (fs.existsSync(addressesPath)) {
    deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'))
  }

  const zero = '0x0000000000000000000000000000000000000000' as Address
  const USDC = (deployedAddresses.USDC ?? zero) as Address
  const ETH = (deployedAddresses.ETH ?? zero) as Address
  const BTC = (deployedAddresses.BTC ?? zero) as Address

  // 4 position slots: ETH long, ETH short, BTC long, BTC short
  const collaterals: Address[] = [USDC, USDC, USDC, USDC]
  const indexTokens: Address[] = [ETH, ETH, BTC, BTC]
  const isLong: boolean[] = [true, false, true, false]

  return { USDC, ETH, BTC, collaterals, indexTokens, isLong }
}

// ─── Main liquidator loop ─────────────────────────────────────────────────────

async function runLiquidatorLoop(config: LiquidatorConfig): Promise<void> {
  const account = privateKeyToAccount(config.liquidatorPrivateKey as `0x${string}`)

  const chain = {
    id: 1320,
    name: 'Initia Testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  } as const

  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) })

  console.log(`[liquidator] Starting. Liquidator address: ${account.address}`)
  console.log(`[liquidator] Vault:  ${config.vaultAddress}`)
  console.log(`[liquidator] Reader: ${config.readerAddress}`)

  const { collaterals, indexTokens, isLong } = loadTokenAddresses()

  // ── Active accounts set ───────────────────────────────────────────────────
  // Seed with a small set of known accounts; IncreasePosition events will add more
  const activeAccounts = new Set<Address>()

  // ── Listen to IncreasePosition events ────────────────────────────────────
  publicClient.watchContractEvent({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    eventName: 'IncreasePosition',
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        const { args } = log as unknown as { args: { account: Address } }
        if (args?.account) {
          if (!activeAccounts.has(args.account)) {
            activeAccounts.add(args.account)
            console.log(`[liquidator] Tracking new account: ${args.account} (total: ${activeAccounts.size})`)
          }
        }
      }
    },
    onError: (err: Error) => {
      console.error('[liquidator] IncreasePosition event watch error:', err)
    },
  })

  // ── Poll loop ─────────────────────────────────────────────────────────────
  const loop = async () => {
    if (activeAccounts.size === 0) {
      console.log('[liquidator] No active accounts to check, waiting for IncreasePosition events...')
      return
    }

    for (const accountAddr of activeAccounts) {
      try {
        // 1. Get positions for this account
        const positionData = await publicClient.readContract({
          address: config.readerAddress,
          abi: READER_ABI,
          functionName: 'getPositions',
          args: [config.vaultAddress, accountAddr, collaterals, indexTokens, isLong],
        })

        // 2. Check each position slot
        for (let i = 0; i < POSITION_SLOTS; i++) {
          const baseIdx = i * POSITION_PROPS_LENGTH
          const size = positionData[baseIdx] // size is first field

          // Skip empty positions
          if (!size || size === 0n) continue

          const collateral = collaterals[i]
          const indexToken = indexTokens[i]
          const posIsLong = isLong[i]

          try {
            // 3. Validate liquidation
            const [liquidationState, marginFees] = await publicClient.readContract({
              address: config.vaultAddress,
              abi: VAULT_ABI,
              functionName: 'validateLiquidation',
              args: [accountAddr, collateral, indexToken, posIsLong, false],
            })

            // 4. Liquidate if state != 0
            if (liquidationState !== 0n) {
              console.log(
                `[liquidator] Liquidating position — account=${accountAddr} collateral=${collateral} index=${indexToken} isLong=${posIsLong} liquidationState=${liquidationState} marginFees=${marginFees}`
              )

              const txHash = await walletClient.writeContract({
                address: config.vaultAddress,
                abi: VAULT_ABI,
                functionName: 'liquidatePosition',
                args: [accountAddr, collateral, indexToken, posIsLong, account.address],
              })

              const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

              console.log(
                `[liquidator] ✓ Liquidated — tx=${txHash} status=${receipt.status} account=${accountAddr} collateral=${collateral} index=${indexToken} isLong=${posIsLong} size=${size} marginFees=${marginFees}`
              )
            }
          } catch (posErr) {
            console.error(
              `[liquidator] Error checking/liquidating position for account=${accountAddr} slot=${i}:`,
              posErr
            )
          }
        }
      } catch (accountErr) {
        console.error(`[liquidator] Error fetching positions for account=${accountAddr}:`, accountErr)
      }
    }
  }

  // Run immediately, then on interval
  await loop()
  setInterval(loop, config.pollIntervalMs)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig()
  await runLiquidatorLoop(config)
}

main().catch((err) => {
  console.error('[liquidator] Fatal error:', err)
  process.exit(1)
})
