'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { claimFaucet, getFaucetStatus } from '@/lib/api'
import { useFlowNetwork } from './useFlowNetwork'

export function useFaucetStatus() {
  const { user } = useFlowNetwork()
  return useQuery({
    queryKey: ['faucetStatus', user.addr],
    queryFn: () => getFaucetStatus(user.addr!),
    enabled: !!user.addr,
    refetchInterval: 15_000,
  })
}

export function useClaimFaucet() {
  const queryClient = useQueryClient()
  const { user, isConnected } = useFlowNetwork()

  return useMutation({
    mutationFn: () => {
      if (!user.addr) throw new Error('Not connected')
      return claimFaucet(user.addr)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faucetStatus', user.addr] })
    },
    meta: { enabled: isConnected },
  })
}
