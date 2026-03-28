'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { openPosition } from '@/lib/api'
import { useFlowNetwork } from './useFlowNetwork'

export type OrderType = 'market' | 'limit'
export type Direction = 'long' | 'short'

interface TradeFormState {
  direction: Direction
  orderType: OrderType
  collateral: string
  leverage: number
  limitPrice: string
}

export function useTradeForm(market: 'BTC' | 'ETH' = 'BTC') {
  const { user } = useFlowNetwork()
  const queryClient = useQueryClient()

  const [state, setState] = useState<TradeFormState>({
    direction: 'long',
    orderType: 'market',
    collateral: '',
    leverage: 2,
    limitPrice: '',
  })

  const sizeUsd = state.collateral ? parseFloat(state.collateral) * state.leverage : 0

  function setDirection(direction: Direction) { setState((s) => ({ ...s, direction })) }
  function setOrderType(orderType: OrderType) { setState((s) => ({ ...s, orderType })) }
  function setCollateral(collateral: string) { setState((s) => ({ ...s, collateral })) }
  function setLeverage(leverage: number) { setState((s) => ({ ...s, leverage })) }
  function setLimitPrice(limitPrice: string) { setState((s) => ({ ...s, limitPrice })) }

  function reset() {
    setState({ direction: 'long', orderType: 'market', collateral: '', leverage: 2, limitPrice: '' })
  }

  const isValid =
    !!state.collateral &&
    parseFloat(state.collateral) > 0 &&
    (state.orderType === 'market' || (!!state.limitPrice && parseFloat(state.limitPrice) > 0))

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!user.addr || !isValid) throw new Error('Invalid state')
      return openPosition({
        account: user.addr,
        indexToken: market,
        collateralDelta: parseFloat(state.collateral),
        sizeDelta: parseFloat(state.collateral) * state.leverage,
        isLong: state.direction === 'long',
      })
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: ['positions', user.addr] })
    },
  })

  return {
    ...state,
    sizeUsd,
    isValid,
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
