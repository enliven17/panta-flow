'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fcl } from '@/lib/fcl'
import { CLOSE_POSITION_TX } from '@/lib/transactions'
import { useFlowNetwork } from './useFlowNetwork'

export type TxStatus = 'idle' | 'pending' | 'sealed' | 'error'

export function useClosePosition() {
  const { user } = useFlowNetwork()
  const queryClient = useQueryClient()
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')

  const mutation = useMutation({
    mutationFn: async (params: {
      indexToken: string
      collateralDelta: number
      sizeDelta: number
      isLong: boolean
    }) => {
      if (!user.addr) throw new Error('Not connected')

      setTxStatus('pending')

      const id = await fcl.mutate({
        cadence: CLOSE_POSITION_TX,
        args: (arg: any, t: any) => [
          arg(params.indexToken, t.String),
          arg(params.collateralDelta.toFixed(8), t.UFix64),
          arg(params.sizeDelta.toFixed(8), t.UFix64),
          arg(params.isLong, t.Bool),
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 9999,
      })

      await fcl.tx(id).onceSealed()
      setTxStatus('sealed')
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions', user.addr] })
      setTimeout(() => setTxStatus('idle'), 2000)
    },
    onError: () => {
      setTxStatus('error')
    },
  })

  return {
    closePosition: mutation.mutate,
    isClosing: mutation.isPending,
    txStatus,
    variables: mutation.variables,
  }
}
