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
  // Flow event indexing not yet implemented
  console.log('Flow event indexing not yet implemented')
}

export function startTradesPolling(): void {
  fetchRecentTrades()
  setInterval(fetchRecentTrades, 15_000)
}
