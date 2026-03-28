'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStakingInfo, stakeTokens, unstakeTokens, claimStakingRewards } from '@/lib/api'
import { useFlowNetwork } from './useFlowNetwork'

export interface StakingRecord {
  tokenType: string
  stakedAmount: number
  pendingRewards: number
}

export function useStakingInfo() {
  const { user, isConnected } = useFlowNetwork()
  return useQuery<{ panta: StakingRecord; plp: StakingRecord }>({
    queryKey: ['stakingInfo', user.addr],
    queryFn: async () => {
      if (!user.addr) return { panta: { tokenType: 'PANTA', stakedAmount: 0, pendingRewards: 0 }, plp: { tokenType: 'PLP', stakedAmount: 0, pendingRewards: 0 } }
      return getStakingInfo(user.addr)
    },
    enabled: isConnected && !!user.addr,
    refetchInterval: 15_000,
  })
}

export function useStake() {
  const queryClient = useQueryClient()
  const { user } = useFlowNetwork()
  return useMutation({
    mutationFn: ({ tokenType, amount }: { tokenType: string; amount: number }) => {
      if (!user.addr) throw new Error('Not connected')
      return stakeTokens(user.addr, tokenType, amount)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stakingInfo', user.addr] }),
  })
}

export function useUnstake() {
  const queryClient = useQueryClient()
  const { user } = useFlowNetwork()
  return useMutation({
    mutationFn: (tokenType: string) => {
      if (!user.addr) throw new Error('Not connected')
      return unstakeTokens(user.addr, tokenType)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stakingInfo', user.addr] }),
  })
}

export function useClaimRewards() {
  const queryClient = useQueryClient()
  const { user } = useFlowNetwork()
  return useMutation({
    mutationFn: (tokenType: string) => {
      if (!user.addr) throw new Error('Not connected')
      return claimStakingRewards(user.addr, tokenType)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stakingInfo', user.addr] }),
  })
}
