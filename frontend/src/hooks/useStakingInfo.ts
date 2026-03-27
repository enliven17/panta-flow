'use client'
import { useQuery } from '@tanstack/react-query'
import { fcl, FLOW_FAUCET_URL } from '@/lib/config/flow'
import { useFlowNetwork } from './useFlowNetwork'

const GET_STAKING_INFO_SCRIPT = `
  import StakingRewards from 0xPLACEHOLDER
  access(all) fun main(account: Address, tokenType: String): {String: UFix64} {
    let record = StakingRewards.getStakeRecord(account: account, tokenType: tokenType)
    let stakedAmount = record?.stakedAmount ?? 0.0
    let pendingRewards = StakingRewards.calculatePendingRewards(account: account, tokenType: tokenType)
    return { "stakedAmount": stakedAmount, "pendingRewards": pendingRewards }
  }
`

export function useStakingInfo(tokenType: 'PANTA' | 'PLP') {
  const { user, isConnected } = useFlowNetwork()
  return useQuery({
    queryKey: ['stakingInfo', user.addr, tokenType],
    queryFn: () => fcl.query({
      cadence: GET_STAKING_INFO_SCRIPT,
      args: (arg: any, t: any) => [arg(user.addr, t.Address), arg(tokenType, t.String)]
    }),
    enabled: isConnected && !!user.addr,
    refetchInterval: 15_000,
  })
}

export { FLOW_FAUCET_URL }
