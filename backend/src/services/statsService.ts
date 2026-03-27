import { executeScript } from '../config/flow'
import { FLOW_CONTRACT_ADDRESSES } from '../config/flow'

export interface Stats {
  tvl: string
  volume24h: string
  openInterest: string
  plpPrice: string
  plpApr: string
}

let cachedStats: Stats = {
  tvl: '0',
  volume24h: '0',
  openInterest: '0',
  plpPrice: '1.00',
  plpApr: '0',
}

const VAULT_STATS_SCRIPT = `
import Vault from ${FLOW_CONTRACT_ADDRESSES.Vault || '0xPLACEHOLDER'}
access(all) fun main(): {String: UFix64} {
  let aum = Vault.getAUM()
  let usdcPool = Vault.getTokenPool("USDC")
  let flowPool = Vault.getTokenPool("FLOW")
  return {
    "aum": aum,
    "usdcReserved": usdcPool?.reservedAmount ?? 0.0,
    "flowReserved": flowPool?.reservedAmount ?? 0.0,
  }
}
`

export async function updateStats(): Promise<void> {
  const vaultAddress = FLOW_CONTRACT_ADDRESSES.Vault
  if (!vaultAddress) return

  try {
    const result = await executeScript(VAULT_STATS_SCRIPT)
    const aum: number = parseFloat(result?.aum ?? '0')

    cachedStats = {
      tvl: aum.toFixed(2),
      volume24h: '0',
      openInterest: '0',
      plpPrice: '1.00',
      plpApr: '0',
    }
  } catch {
    // Keep cached stats on script failure
  }
}

export function getStats(): Stats {
  return cachedStats
}

export function startStatsPolling(): void {
  updateStats()
  setInterval(updateStats, 30_000)
}
