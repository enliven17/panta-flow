'use client'

import { useQuery } from '@tanstack/react-query'
import { getPrices, getPriceHistory } from '@/lib/api'

export interface Prices {
  BTC: string
  ETH: string
  FLOW: string
  USDC: string
  [key: string]: string
}

export interface OHLCVCandle {
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
    queryFn: getPrices,
    refetchInterval: 3_000,
    staleTime: 2_000,
  })
}

export function usePriceHistory(token: string, interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d', limit = 500) {
  return useQuery<OHLCVCandle[]>({
    queryKey: ['prices', 'history', token, interval],
    queryFn: () => getPriceHistory(token, interval, limit),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
}
