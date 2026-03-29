'use client'

import { useQuery } from '@tanstack/react-query'
import { getPositions } from '@/lib/api'
import { useFlowNetwork } from './useFlowNetwork'

export interface Position {
  account: string
  collateralToken: string
  indexToken: string
  isLong: boolean
  size: number
  collateral: number
  averagePrice: number
  entryFundingRate: number
  reserveAmount: number
  lastIncreasedTime: number
  realisedPnl: number
  hasProfit: boolean
  delta: number
}

export function usePositions() {
  const { user, isConnected } = useFlowNetwork()
  return useQuery<Position[]>({
    queryKey: ['positions', user.addr],
    queryFn: async () => {
      if (!user.addr) return []
      const data = await getPositions(user.addr)
      return data.positions ?? []
    },
    enabled: isConnected && !!user.addr,
    refetchInterval: 10_000,
  })
}

