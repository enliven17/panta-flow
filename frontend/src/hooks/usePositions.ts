'use client'
import { useQuery } from '@tanstack/react-query'
import { fcl } from '@/lib/config/flow'
import { useFlowNetwork } from './useFlowNetwork'

const GET_POSITION_SCRIPT = `
  import PositionManager from 0xPLACEHOLDER
  access(all) fun main(account: Address, collateralToken: String, indexToken: String, isLong: Bool): PositionManager.Position? {
    let key = PositionManager.getPositionKey(account: account, collateralToken: collateralToken, indexToken: indexToken, isLong: isLong)
    return PositionManager.getPosition(positionKey: key)
  }
`

export function usePositions() {
  const { user, isConnected } = useFlowNetwork()
  return useQuery({
    queryKey: ['positions', user.addr],
    queryFn: async () => {
      if (!user.addr) return []
      // Query FLOW/USD long and short positions
      const positions = await Promise.all([
        fcl.query({ cadence: GET_POSITION_SCRIPT, args: (arg: any, t: any) => [arg(user.addr, t.Address), arg("USDC", t.String), arg("FLOW", t.String), arg(true, t.Bool)] }),
        fcl.query({ cadence: GET_POSITION_SCRIPT, args: (arg: any, t: any) => [arg(user.addr, t.Address), arg("USDC", t.String), arg("FLOW", t.String), arg(false, t.Bool)] }),
      ])
      return positions.filter(Boolean)
    },
    enabled: isConnected && !!user.addr,
    refetchInterval: 10_000,
  })
}
