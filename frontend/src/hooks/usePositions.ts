'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export function usePositions() {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['positions', address],
    queryFn: async () => {
      if (!address) return []
      const res = await fetch(`${BACKEND_URL}/api/positions/${address}`)
      if (!res.ok) throw new Error('Failed to fetch positions')
      return res.json()
    },
    enabled: !!address,
    refetchInterval: 10_000,
  })
}
