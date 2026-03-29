'use client'

import { useQuery } from '@tanstack/react-query'
import { useFlowNetwork } from './useFlowNetwork'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface LimitOrder {
  id: number
  account: string
  indexToken: string
  sizeDelta: number
  isLong: boolean
  limitPrice: number
  collateralAmount: number
  createdAt: number
}

export function useLimitOrders() {
  const { user } = useFlowNetwork()
  return useQuery<LimitOrder[]>({
    queryKey: ['limit-orders', user.addr],
    queryFn: async () => {
      if (!user.addr) return []
      const res = await fetch(`${BASE}/orders?account=${user.addr}`)
      const data = await res.json()
      return data.orders ?? []
    },
    enabled: !!user.addr,
    refetchInterval: 10_000,
  })
}
