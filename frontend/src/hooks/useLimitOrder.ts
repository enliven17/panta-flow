'use client'

import { useState } from 'react'
import * as fcl from '@onflow/fcl'
import { CREATE_LIMIT_ORDER_TX, CANCEL_LIMIT_ORDER_TX } from '@/lib/transactions'
import { useQueryClient } from '@tanstack/react-query'

export type TxStatus = 'idle' | 'pending' | 'sealed' | 'error'

export function useLimitOrder() {
  const [status, setStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const qc = useQueryClient()

  async function createLimitOrder(params: {
    indexToken: string
    collateralAmount: number
    sizeDelta: number
    isLong: boolean
    limitPrice: number
  }) {
    setStatus('pending')
    setTxError(null)
    try {
      const id = await (fcl as any).mutate({
        cadence: CREATE_LIMIT_ORDER_TX,
        args: (arg: any, t: any) => [
          arg(params.indexToken, t.String),
          arg(params.collateralAmount.toFixed(8), t.UFix64),
          arg(params.sizeDelta.toFixed(8), t.UFix64),
          arg(params.isLong, t.Bool),
          arg(params.limitPrice.toFixed(8), t.UFix64),
        ],
        proposer: (fcl as any).authz,
        payer: (fcl as any).authz,
        authorizations: [(fcl as any).authz],
        limit: 9999,
      })
      await (fcl as any).tx(id).onceSealed()
      setStatus('sealed')
      qc.invalidateQueries({ queryKey: ['limit-orders'] })
    } catch (err: any) {
      setStatus('error')
      setTxError(err?.message || String(err))
    }
  }

  async function cancelLimitOrder(orderId: number) {
    setStatus('pending')
    setTxError(null)
    try {
      const id = await (fcl as any).mutate({
        cadence: CANCEL_LIMIT_ORDER_TX,
        args: (arg: any, t: any) => [arg(String(orderId), t.UInt64)],
        proposer: (fcl as any).authz,
        payer: (fcl as any).authz,
        authorizations: [(fcl as any).authz],
        limit: 9999,
      })
      await (fcl as any).tx(id).onceSealed()
      setStatus('sealed')
      qc.invalidateQueries({ queryKey: ['limit-orders'] })
    } catch (err: any) {
      setStatus('error')
      setTxError(err?.message || String(err))
    }
  }

  function reset() {
    setStatus('idle')
    setTxError(null)
  }

  return {
    createLimitOrder,
    cancelLimitOrder,
    status,
    txError,
    reset,
    isPending: status === 'pending',
  }
}
