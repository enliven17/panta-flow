'use client'

import { useState } from 'react'

export type OrderType = 'market' | 'limit'
export type Direction = 'long' | 'short'

interface TradeFormState {
  direction: Direction
  orderType: OrderType
  collateral: string
  leverage: number
  limitPrice: string
}

export function useTradeForm() {
  const [state, setState] = useState<TradeFormState>({
    direction: 'long',
    orderType: 'market',
    collateral: '',
    leverage: 2,
    limitPrice: '',
  })

  const sizeUsd = state.collateral
    ? parseFloat(state.collateral) * state.leverage
    : 0

  function setDirection(direction: Direction) {
    setState((s) => ({ ...s, direction }))
  }

  function setOrderType(orderType: OrderType) {
    setState((s) => ({ ...s, orderType }))
  }

  function setCollateral(collateral: string) {
    setState((s) => ({ ...s, collateral }))
  }

  function setLeverage(leverage: number) {
    setState((s) => ({ ...s, leverage }))
  }

  function setLimitPrice(limitPrice: string) {
    setState((s) => ({ ...s, limitPrice }))
  }

  function reset() {
    setState({
      direction: 'long',
      orderType: 'market',
      collateral: '',
      leverage: 2,
      limitPrice: '',
    })
  }

  const isValid =
    !!state.collateral &&
    parseFloat(state.collateral) > 0 &&
    (state.orderType === 'market' || (!!state.limitPrice && parseFloat(state.limitPrice) > 0))

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
  }
}
