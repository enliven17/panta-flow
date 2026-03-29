'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fcl } from '@/lib/fcl'
import { OPEN_POSITION_TX } from '@/lib/transactions'
import { useFlowNetwork } from './useFlowNetwork'

export type OrderType = 'market' | 'limit'
export type Direction = 'long' | 'short'

export type TxStatus = 'idle' | 'pending' | 'sealed' | 'error'

interface TradeFormState {
  direction: Direction
  orderType: OrderType
  collateral: string
  leverage: number
  limitPrice: string
}

export function useTradeForm(market: 'BTC' | 'ETH' | 'FLOW' = 'BTC') {
  const { user } = useFlowNetwork()
  const queryClient = useQueryClient()

  const [state, setState] = useState<TradeFormState>({
    direction: 'long',
    orderType: 'market',
    collateral: '',
    leverage: 2,
    limitPrice: '',
  })

  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txId, setTxId] = useState<string | null>(null)

  const sizeUsd = state.collateral ? parseFloat(state.collateral) * state.leverage : 0

  function setDirection(direction: Direction) { setState((s) => ({ ...s, direction })) }
  function setOrderType(orderType: OrderType) { setState((s) => ({ ...s, orderType })) }
  function setCollateral(collateral: string) { setState((s) => ({ ...s, collateral })) }
  function setLeverage(leverage: number) { setState((s) => ({ ...s, leverage })) }
  function setLimitPrice(limitPrice: string) { setState((s) => ({ ...s, limitPrice })) }

  function reset() {
    setState({ direction: 'long', orderType: 'market', collateral: '', leverage: 2, limitPrice: '' })
    setTxStatus('idle')
    setTxId(null)
  }

  const isValid =
    !!state.collateral &&
    parseFloat(state.collateral) > 0 &&
    (state.orderType === 'market' || (!!state.limitPrice && parseFloat(state.limitPrice) > 0))

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user.addr || !isValid) throw new Error('Invalid state')

      const collateralNum = parseFloat(state.collateral)
      const sizeNum = collateralNum * state.leverage

      setTxStatus('pending')
      setTxId(null)

      // User signs directly via wallet — no backend involvement
      const id = await fcl.mutate({
        cadence: OPEN_POSITION_TX,
        args: (arg: any, t: any) => [
          arg(market, t.String),
          arg(collateralNum.toFixed(8), t.UFix64),
          arg(sizeNum.toFixed(8), t.UFix64),
          arg(state.direction === 'long', t.Bool),
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 9999,
      })

      setTxId(id)

      // Wait for on-chain confirmation
      await fcl.tx(id).onceSealed()
      setTxStatus('sealed')

      return id
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: ['positions', user.addr] })
    },
    onError: () => {
      setTxStatus('error')
    },
  })

  return {
    ...state,
    sizeUsd,
    isValid,
    txStatus,
    txId,
    setDirection,
    setOrderType,
    setCollateral,
    setLeverage,
    setLimitPrice,
    reset,
    submit: submitMutation.mutate,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,
  }
}
