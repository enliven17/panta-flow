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
  // Flow event indexing not yet implemented — no-op
}

export function startTradesPolling(): void {
  // No-op until Flow event indexing is implemented
}
