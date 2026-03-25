'use client'

import { useQuery } from '@tanstack/react-query'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface Prices {
  ETH: string
  BTC: string
  WETH: string
  USDC: string
  [key: string]: string
}

interface OHLCVCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function usePrices() {
  return useQuery<Prices>({
    queryKey: ['prices'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/prices`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      return res.json()
    },
    refetchInterval: 3_000,
    staleTime: 2_000,
  })
}

export function usePriceHistory(token: string, interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d', limit = 500) {
  return useQuery<OHLCVCandle[]>({
    queryKey: ['prices', 'history', token, interval],
    queryFn: async () => {
      const res = await fetch(
        `${BACKEND_URL}/api/prices/history?token=${token}&interval=${interval}&limit=${limit}`
      )
      if (!res.ok) throw new Error('Failed to fetch price history')
      return res.json()
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}
