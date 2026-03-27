'use client'
import { useQuery } from '@tanstack/react-query'
import { fcl } from '@/lib/config/flow'

const GET_VAULT_STATS_SCRIPT = `
  import Vault from 0xPLACEHOLDER
  access(all) fun main(): {String: UFix64} {
    let aum = Vault.getAUM()
    let usdcPool = Vault.getTokenPool("USDC")
    let flowPool = Vault.getTokenPool("FLOW")
    return {
      "aum": aum,
      "usdcPoolAmount": usdcPool?.poolAmount ?? 0.0,
      "flowPoolAmount": flowPool?.poolAmount ?? 0.0,
    }
  }
`

export function useVaultStats() {
  return useQuery({
    queryKey: ['vaultStats'],
    queryFn: () => fcl.query({ cadence: GET_VAULT_STATS_SCRIPT }),
    refetchInterval: 15_000,
  })
}
