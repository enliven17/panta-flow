import { publicClient } from '../config/chain'
import { getAddress } from '../config/addresses'

const INCREASE_EVENT = {
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
} as const

const DECREASE_EVENT = {
  name: 'DecreasePosition',
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
} as const

export interface Trade {
  type: 'increase' | 'decrease'
  account: string
  indexToken: string
  sizeDelta: string
  isLong: boolean
  price: string
  fee: string
  blockNumber: string
  txHash: string
}

let cachedTrades: Trade[] = []

export function getCachedTrades(): Trade[] {
  return cachedTrades
}

export async function fetchRecentTrades(): Promise<void> {
  const vault = getAddress('Vault')
  if (vault === '0x0000000000000000000000000000000000000000') return

  try {
    const latestBlock = await publicClient.getBlockNumber()
    const fromBlock = latestBlock > 5000n ? latestBlock - 5000n : 0n

    const [increaseLogs, decreaseLogs] = await Promise.all([
      publicClient.getLogs({ address: vault, event: INCREASE_EVENT, fromBlock, toBlock: 'latest' }),
      publicClient.getLogs({ address: vault, event: DECREASE_EVENT, fromBlock, toBlock: 'latest' }),
    ])

    const trades: Trade[] = []

    for (const log of increaseLogs) {
      if (!log.args) continue
      trades.push({
        type: 'increase',
        account: (log.args.account as string) ?? '',
        indexToken: (log.args.indexToken as string) ?? '',
        sizeDelta: ((log.args.sizeDelta as bigint) ?? 0n).toString(),
        isLong: (log.args.isLong as boolean) ?? false,
        price: ((log.args.price as bigint) ?? 0n).toString(),
        fee: ((log.args.fee as bigint) ?? 0n).toString(),
        blockNumber: log.blockNumber?.toString() ?? '0',
        txHash: log.transactionHash ?? '',
      })
    }

    for (const log of decreaseLogs) {
      if (!log.args) continue
      trades.push({
        type: 'decrease',
        account: (log.args.account as string) ?? '',
        indexToken: (log.args.indexToken as string) ?? '',
        sizeDelta: ((log.args.sizeDelta as bigint) ?? 0n).toString(),
        isLong: (log.args.isLong as boolean) ?? false,
        price: ((log.args.price as bigint) ?? 0n).toString(),
        fee: ((log.args.fee as bigint) ?? 0n).toString(),
        blockNumber: log.blockNumber?.toString() ?? '0',
        txHash: log.transactionHash ?? '',
      })
    }

    trades.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)))
    cachedTrades = trades.slice(0, 100)
  } catch (err) {
    console.error('Failed to fetch trade history:', err)
  }
}

export function startTradesPolling(): void {
  fetchRecentTrades()
  setInterval(fetchRecentTrades, 15_000)
}
