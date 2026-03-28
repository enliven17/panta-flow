'use client'

import { useStats } from './useGlpManager'

export function usePLPPrice() {
  const { data: stats, isLoading } = useStats()
  return {
    data: stats?.plpPrice ? parseFloat(stats.plpPrice) : null,
    isLoading,
  }
}
