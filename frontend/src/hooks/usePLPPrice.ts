'use client'
import { useQuery } from '@tanstack/react-query'
import { fcl } from '@/lib/config/flow'

const GET_PLP_PRICE_SCRIPT = `
  import PLPToken from 0xPLACEHOLDER
  import Vault from 0xPLACEHOLDER
  access(all) fun main(): UFix64 {
    return PLPToken.getPLPPrice(aum: Vault.getAUM())
  }
`

export function usePLPPrice() {
  return useQuery({
    queryKey: ['plpPrice'],
    queryFn: () => fcl.query({ cadence: GET_PLP_PRICE_SCRIPT }),
    refetchInterval: 10_000,
  })
}
