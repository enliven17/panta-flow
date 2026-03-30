'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStakingInfo, stakeTokens, unstakeTokens, claimStakingRewards, buyPANTA } from '@/lib/api'
import { setupAccount } from '@/lib/fcl'
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
      // Backend returns flat { pantaStaked, pantaPending, plpStaked, plpPending } with UFix64 strings
      const raw = await getStakingInfo(user.addr)
      return {
        panta: {
          tokenType: 'PANTA',
          stakedAmount: parseFloat(raw.pantaStaked ?? '0') || 0,
          pendingRewards: parseFloat(raw.pantaPending ?? '0') || 0,
        },
        plp: {
          tokenType: 'PLP',
          stakedAmount: parseFloat(raw.plpStaked ?? '0') || 0,
          pendingRewards: parseFloat(raw.plpPending ?? '0') || 0,
        },
      }
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

export function useBuyPANTA() {
  const queryClient = useQueryClient()
  const { user } = useFlowNetwork()
  return useMutation({
    mutationFn: async (usdcAmount: number) => {
      if (!user.addr) throw new Error('Not connected')
      // setupAccount creates the PANTA vault if it doesn't exist yet.
      // It's idempotent — safe to call every time.
      // Wallet will open here so the user signs the setup tx.
      await setupAccount()
      return buyPANTA(user.addr, usdcAmount)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stakingInfo', user.addr] }),
  })
}
