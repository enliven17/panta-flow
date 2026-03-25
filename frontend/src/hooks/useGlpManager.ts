'use client'

import { useReadContracts } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { ADDRESSES } from '@/lib/contracts/addresses'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<{
        tvl: string
        volume24h: string
        openInterest: string
        plpPrice: string
        plpApr: string
      }>
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}
