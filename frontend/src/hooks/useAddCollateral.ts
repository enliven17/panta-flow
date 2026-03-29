'use client'

import { useState } from 'react'
import * as fcl from '@onflow/fcl'
import { ADD_COLLATERAL_TX } from '@/lib/transactions'
import { useQueryClient } from '@tanstack/react-query'

export type TxStatus = 'idle' | 'pending' | 'sealed' | 'error'

export function useAddCollateral() {
  const [status, setStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const qc = useQueryClient()

  async function addCollateral(params: {
    indexToken: string
    collateralAmount: number
    isLong: boolean
  }) {
    setStatus('pending')
    setTxError(null)
    try {
      const id = await (fcl as any).mutate({
        cadence: ADD_COLLATERAL_TX,
        args: (arg: any, t: any) => [
          arg(params.indexToken, t.String),
          arg(params.collateralAmount.toFixed(8), t.UFix64),
          arg(params.isLong, t.Bool),
        ],
        proposer: (fcl as any).authz,
        payer: (fcl as any).authz,
        authorizations: [(fcl as any).authz],
        limit: 9999,
      })
      await (fcl as any).tx(id).onceSealed()
      setStatus('sealed')
      qc.invalidateQueries({ queryKey: ['positions'] })
    } catch (err: any) {
      setStatus('error')
      setTxError(err?.message || String(err))
    }
  }

  function reset() {
    setStatus('idle')
    setTxError(null)
  }

  return { addCollateral, status, txError, reset, isAdding: status === 'pending' }
}
