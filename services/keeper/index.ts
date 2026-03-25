import fs from 'fs'
import path from 'path'
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ─── Feed IDs ────────────────────────────────────────────────────────────────

const ETH_FEED_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'
const BTC_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KeeperConfig {
  rpcUrl: string
  keeperPrivateKey: string
  positionRouterAddress: Address
  fastPriceFeedAddress: Address
  pythAddress: Address
  hermesApiUrl: string
  pollIntervalMs: number
}

interface KeeperState {
  lastVaaFetchTime: number
  lastExecutionTime: number
  totalExecuted: number
  totalFeeEarned: bigint
  consecutiveErrors: number
}

interface HermesResponse {
  binary: {
    encoding: 'hex'
    data: string[]
  }
  parsed: Array<{
    id: string
    price: {
      price: string
      conf: string
      expo: number
      publish_time: number
    }
    ema_price: {
      price: string
      conf: string
      expo: number
      publish_time: number
    }
  }>
}

// ─── ABIs ────────────────────────────────────────────────────────────────────

const POSITION_ROUTER_ABI = [
  {
    name: 'getRequestQueueLengths',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'increasePositionRequestKeysStart', type: 'uint256' },
      { name: 'increasePositionRequestKeys', type: 'uint256' },
      { name: 'decreasePositionRequestKeysStart', type: 'uint256' },
      { name: 'decreasePositionRequestKeys', type: 'uint256' },
    ],
  },
] as const

const PYTH_ABI = [
  {
    name: 'getUpdateFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'updateData', type: 'bytes[]' }],
    outputs: [{ name: 'feeAmount', type: 'uint256' }],
  },
] as const

const FAST_PRICE_FEED_ABI = [
  {
    name: 'setPricesWithDataAndExecute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_positionRouter', type: 'address' },
      { name: '_priceUpdateData', type: 'bytes[]' },
      { name: '_endIndexForIncreasePositions', type: 'uint256' },
      { name: '_endIndexForDecreasePositions', type: 'uint256' },
      { name: '_maxIncreasePositions', type: 'uint256' },
      { name: '_maxDecreasePositions', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

// ─── Config loading ───────────────────────────────────────────────────────────

function loadConfig(): KeeperConfig {
  const addressesPath = path.resolve(__dirname, '../../deployed-addresses.json')
  let deployedAddresses: Record<string, string> = {}

  if (fs.existsSync(addressesPath)) {
    deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'))
  } else {
    console.warn('[keeper] deployed-addresses.json not found, using zero addresses')
  }

  const rpcUrl = process.env.INITIA_TESTNET_RPC_URL
  if (!rpcUrl) throw new Error('INITIA_TESTNET_RPC_URL env var is required')

  const keeperPrivateKey = process.env.KEEPER_PRIVATE_KEY
  if (!keeperPrivateKey) throw new Error('KEEPER_PRIVATE_KEY env var is required')

  return {
    rpcUrl,
    keeperPrivateKey,
    positionRouterAddress: (deployedAddresses.PositionRouter ?? '0x0000000000000000000000000000000000000000') as Address,
    fastPriceFeedAddress: (deployedAddresses.FastPriceFeed ?? '0x0000000000000000000000000000000000000000') as Address,
    pythAddress: (deployedAddresses.Pyth ?? '0x0000000000000000000000000000000000000000') as Address,
    hermesApiUrl: 'https://hermes.pyth.network/v2/updates/price/latest',
    pollIntervalMs: 3_000,
  }
}

// ─── Hermes VAA fetch ─────────────────────────────────────────────────────────

async function fetchVaa(hermesApiUrl: string): Promise<{ priceUpdateData: `0x${string}`[]; parsed: HermesResponse['parsed'] }> {
  const url = `${hermesApiUrl}?ids[]=${ETH_FEED_ID}&ids[]=${BTC_FEED_ID}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Hermes API error: ${response.status} ${response.statusText}`)
  }

  const data: HermesResponse = await response.json()

  // binary.data contains hex-encoded VAA strings; prefix with 0x for viem
  const priceUpdateData = data.binary.data.map((hex) =>
    (hex.startsWith('0x') ? hex : `0x${hex}`) as `0x${string}`
  )

  return { priceUpdateData, parsed: data.parsed }
}

// ─── Main keeper loop ─────────────────────────────────────────────────────────

async function runKeeperLoop(config: KeeperConfig, state: KeeperState): Promise<void> {
  const account = privateKeyToAccount(config.keeperPrivateKey as `0x${string}`)

  const chain = {
    id: 1320,
    name: 'Initia Testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  } as const

  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) })

  console.log(`[keeper] Starting. Keeper address: ${account.address}`)
  console.log(`[keeper] PositionRouter: ${config.positionRouterAddress}`)
  console.log(`[keeper] FastPriceFeed:  ${config.fastPriceFeedAddress}`)

  const loop = async () => {
    try {
      // ── 1. Check keeper balance ──────────────────────────────────────────
      const balance = await publicClient.getBalance({ address: account.address })
      if (balance < parseEther('0.01')) {
        console.warn(`[keeper] WARNING: Low balance — ${formatEther(balance)} ETH (< 0.01 ETH)`)
      }

      // ── 2. Fetch VAA from Hermes ─────────────────────────────────────────
      let priceUpdateData: `0x${string}`[]
      let parsed: HermesResponse['parsed']

      try {
        const result = await fetchVaa(config.hermesApiUrl)
        priceUpdateData = result.priceUpdateData
        parsed = result.parsed
        state.lastVaaFetchTime = Date.now()
      } catch (hermesErr) {
        console.error('[keeper] Hermes API error — skipping position execute this cycle:', hermesErr)
        state.consecutiveErrors++
        return
      }

      // ── 3. Get request queue lengths ─────────────────────────────────────
      const [incStart, incLen, decStart, decLen] = await publicClient.readContract({
        address: config.positionRouterAddress,
        abi: POSITION_ROUTER_ABI,
        functionName: 'getRequestQueueLengths',
      })

      const totalPending = incLen + decLen
      if (totalPending === 0n) {
        console.log(`[keeper] No pending requests in queue, skipping execute`)
        state.consecutiveErrors = 0
        return
      }

      // ── 4. Get update fee from Pyth ───────────────────────────────────────
      const fee = await publicClient.readContract({
        address: config.pythAddress,
        abi: PYTH_ABI,
        functionName: 'getUpdateFee',
        args: [priceUpdateData],
      })

      // ── 5. setPricesWithDataAndExecute ────────────────────────────────────
      const txHash = await walletClient.writeContract({
        address: config.fastPriceFeedAddress,
        abi: FAST_PRICE_FEED_ABI,
        functionName: 'setPricesWithDataAndExecute',
        args: [
          config.positionRouterAddress,
          priceUpdateData,
          incLen,   // endIndexForIncreasePositions
          decLen,   // endIndexForDecreasePositions
          10n,      // maxIncreasePositions
          10n,      // maxDecreasePositions
        ],
        value: fee,
      })

      // ── 6. Wait for receipt and log ───────────────────────────────────────
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      const executedCount = Number(incLen) + Number(decLen)
      state.totalExecuted += executedCount
      state.totalFeeEarned += fee
      state.lastExecutionTime = Date.now()
      state.consecutiveErrors = 0

      // Log price info from parsed response
      const ethPrice = parsed.find((p) => p.id.replace(/^0x/, '') === ETH_FEED_ID.replace(/^0x/, ''))
      const btcPrice = parsed.find((p) => p.id.replace(/^0x/, '') === BTC_FEED_ID.replace(/^0x/, ''))

      const ethUsd = ethPrice
        ? (parseInt(ethPrice.price.price) * Math.pow(10, ethPrice.price.expo)).toFixed(2)
        : 'N/A'
      const btcUsd = btcPrice
        ? (parseInt(btcPrice.price.price) * Math.pow(10, btcPrice.price.expo)).toFixed(2)
        : 'N/A'

      console.log(
        `[keeper] ✓ tx=${txHash} | executed=${executedCount} positions | fee=${formatEther(fee)} ETH | ETH=$${ethUsd} BTC=$${btcUsd} | totalExecuted=${state.totalExecuted} totalFeeEarned=${formatEther(state.totalFeeEarned)} ETH`
      )
    } catch (err) {
      state.consecutiveErrors++
      console.error(`[keeper] Error (consecutiveErrors=${state.consecutiveErrors}):`, err)
    }
  }

  // Run immediately, then on interval
  await loop()
  setInterval(loop, config.pollIntervalMs)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig()

  const state: KeeperState = {
    lastVaaFetchTime: 0,
    lastExecutionTime: 0,
    totalExecuted: 0,
    totalFeeEarned: 0n,
    consecutiveErrors: 0,
  }

  await runKeeperLoop(config, state)
}

main().catch((err) => {
  console.error('[keeper] Fatal error:', err)
  process.exit(1)
})
