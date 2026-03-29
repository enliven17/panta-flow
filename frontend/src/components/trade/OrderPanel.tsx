'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useTradeForm, Direction, TxStatus } from '@/hooks/useTradeForm'
import { useLimitOrder } from '@/hooks/useLimitOrder'
import { usePrices } from '@/hooks/usePrices'

type Market = 'ETH' | 'BTC' | 'FLOW'
type OrderType = 'market' | 'limit'

interface OrderPanelProps {
  market: Market
}

const MARGIN_FEE = 0.001 // 0.1%

const MARKET_DECIMALS: Record<Market, number> = {
  BTC: 6,
  ETH: 4,
  FLOW: 2,
}

function calcLiqPrice(entryPrice: number, leverage: number, isLong: boolean): number {
  if (isLong) return entryPrice * (1 - 1 / leverage + MARGIN_FEE / leverage)
  return entryPrice * (1 + 1 / leverage - MARGIN_FEE / leverage)
}

function validateLeverage(leverage: number): { isValid: boolean; error?: string } {
  if (leverage < 1 || leverage > 10) return { isValid: false, error: 'Maximum leverage is 10x' }
  return { isValid: true }
}

function TxStatusBadge({ status, txId }: { status: TxStatus | 'idle' | 'pending' | 'sealed' | 'error'; txId?: string | null }) {
  if (status === 'idle') return null

  const configs = {
    pending: { label: 'Awaiting signature…', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    sealed:  { label: 'Transaction confirmed', color: 'text-[#00C076]', bg: 'bg-[#00C076]/10 border-[#00C076]/20' },
    error:   { label: 'Transaction failed', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  }
  const cfg = configs[status as keyof typeof configs]
  if (!cfg) return null

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-bold ${cfg.bg}`}>
      {status === 'pending' && (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {status === 'sealed' && <span className="flex-shrink-0">✓</span>}
      {status === 'error' && <span className="flex-shrink-0">✗</span>}
      <span className={cfg.color}>{cfg.label}</span>
      {txId && status === 'sealed' && (
        <span className="text-[#555] font-mono truncate">{txId.slice(0, 8)}…</span>
      )}
    </div>
  )
}

// Flow blockchain icon SVG
function FlowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#00EF8B"/>
      <path d="M26.5 11H17.5C14.46 11 12 13.46 12 16.5C12 19.54 14.46 22 17.5 22H20V26.5C20 27.88 21.12 29 22.5 29C23.88 29 25 27.88 25 26.5V22H26.5C29.54 22 32 19.54 32 16.5C32 13.46 29.54 11 26.5 11ZM22.5 19H17.5C16.12 19 15 17.88 15 16.5C15 15.12 16.12 14 17.5 14H26.5C27.88 14 29 15.12 29 16.5C29 17.88 27.88 19 26.5 19H22.5Z" fill="white"/>
    </svg>
  )
}

export function OrderPanel({ market }: OrderPanelProps) {
  const { user, isConnected, connect } = useFlowNetwork()
  const { data: prices } = usePrices()
  const form = useTradeForm(market)
  const limitOrder = useLimitOrder()

  const [orderType, setOrderType] = useState<OrderType>('market')
  const [limitPrice, setLimitPrice] = useState('')

  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const currentPrice = prices?.[market] ? parseFloat(prices[market]) : 0

  const leverageFromPointer = useCallback((clientX: number) => {
    if (!sliderTrackRef.current) return
    const rect = sliderTrackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    form.setLeverage(Math.round((1 + pct * 9) * 10) / 10)
  }, [form])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) leverageFromPointer(e.clientX) }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [leverageFromPointer])

  const leverageValidation = validateLeverage(form.leverage)
  const collateralNum = parseFloat(form.collateral) || 0
  const limitPriceNum = parseFloat(limitPrice) || 0
  const positionSizeUsd = collateralNum * form.leverage
  const effectivePrice = orderType === 'limit' && limitPriceNum > 0 ? limitPriceNum : currentPrice
  const liqPrice = collateralNum > 0 && effectivePrice > 0
    ? calcLiqPrice(effectivePrice, form.leverage, form.direction === 'long')
    : null

  function handleSubmit() {
    if (!user.addr) return
    if (orderType === 'market') {
      if (!form.isValid) return
      form.submit()
    } else {
      if (!form.isValid || limitPriceNum <= 0) return
      limitOrder.createLimitOrder({
        indexToken: market,
        collateralAmount: collateralNum,
        sizeDelta: positionSizeUsd,
        isLong: form.direction === 'long',
        limitPrice: limitPriceNum,
      })
    }
  }

  const limitIsReady = orderType === 'limit' && form.isValid && limitPriceNum > 0 && leverageValidation.isValid
  const isDisabled = orderType === 'market'
    ? (!form.isValid || form.isSubmitting || !leverageValidation.isValid || form.txStatus === 'pending')
    : (!limitIsReady || limitOrder.isPending)

  const txStatus = orderType === 'market' ? form.txStatus : limitOrder.status
  const txId = orderType === 'market' ? form.txId : null

  return (
    <div className="flex flex-col gap-3">
      {/* Long/Short toggle */}
      <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
        {(['long', 'short'] as Direction[]).map((dir) => (
          <button
            key={dir}
            onClick={() => form.setDirection(dir)}
            className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-200 ${
              form.direction === dir
                ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm'
                : 'text-[#444] hover:text-[#666]'
            }`}
          >
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
          </button>
        ))}
      </div>

      {/* Order type + price row */}
      <div className="flex gap-2">
        <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
          <span className="block text-[12px] text-[#555] font-medium mb-1">
            {orderType === 'limit' ? 'Limit price' : 'Market price'}
          </span>
          <span className="block text-[15px] text-white font-bold tabular-nums">
            {currentPrice > 0
              ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </span>
        </div>
        {/* Market / Limit toggle */}
        <div className="flex flex-col justify-center p-1 rounded-2xl bg-[#080808] border border-[#111] gap-1">
          {(['market', 'limit'] as OrderType[]).map((ot) => (
            <button
              key={ot}
              onClick={() => setOrderType(ot)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-xl transition-all ${
                orderType === ot
                  ? 'bg-[#1A1A1A] text-white border border-[#222]'
                  : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {ot.charAt(0).toUpperCase() + ot.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Limit price input (only when limit order) */}
      <AnimatePresence initial={false}>
        {orderType === 'limit' && (
          <motion.div
            key="limit-price-box"
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 rounded-2xl bg-[#1A1A1A] border border-[#222]">
              <span className="block text-[11px] text-[#555] font-medium mb-1">
                Limit Price
                <span className="ml-1.5 text-[10px] text-[#444]">
                  {form.direction === 'long' ? '↓ ≤ trigger' : '↑ ≥ trigger'}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#555] font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
                  className="flex-1 bg-transparent text-[16px] font-bold text-white outline-none placeholder:text-[#333] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {limitPriceNum > 0 && currentPrice > 0 && (
                <div className="mt-1.5 text-[10px]">
                  {form.direction === 'long'
                    ? limitPriceNum < currentPrice
                      ? <span className="text-[#00C076]">✓ {((currentPrice - limitPriceNum) / currentPrice * 100).toFixed(1)}% below market</span>
                      : <span className="text-yellow-500">⚠ Above market — immediate execution</span>
                    : limitPriceNum > currentPrice
                      ? <span className="text-[#00C076]">✓ {((limitPriceNum - currentPrice) / currentPrice * 100).toFixed(1)}% above market</span>
                      : <span className="text-yellow-500">⚠ Below market — immediate execution</span>
                  }
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collateral / Size */}
      <div className="relative rounded-2xl bg-[#1A1A1A] border border-[#222] overflow-hidden">
        <div className="p-6 border-b border-[#222]">
          <span className="block text-[12px] text-[#555] font-medium mb-1">Collateral</span>
          <div className="flex items-center justify-between">
            <input
              type="number"
              value={form.collateral}
              onChange={(e) => form.setCollateral(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-[#333] tabular-nums"
            />
            <span className="text-[14px] font-bold text-[#555] ml-4">USDC</span>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[#444] shadow-2xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 15l-4-4 4-4" /><path d="M3 11h18" /><path d="M17 9l4 4-4 4" />
            </svg>
          </div>
        </div>

        <div className="p-6">
          <span className="block text-[12px] text-[#555] font-medium mb-1">Estimated size</span>
          <div className="flex items-center justify-between">
            <span className={`flex-1 text-3xl font-bold tabular-nums ${form.sizeUsd > 0 && effectivePrice > 0 ? 'text-white' : 'text-[#333]'}`}>
              {form.sizeUsd > 0 && effectivePrice > 0
                ? (form.sizeUsd / effectivePrice).toFixed(MARKET_DECIMALS[market])
                : '0.' + '0'.repeat(MARKET_DECIMALS[market])}
            </span>
            <span className="text-[14px] font-bold text-[#555] ml-4">{market}</span>
          </div>
        </div>
      </div>

      {/* Leverage */}
      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#222]">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] text-[#555] font-bold">Leverage</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={form.leverage}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v)) form.setLeverage(Math.min(10, Math.max(1, v)))
              }}
              className="w-14 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-[13px] font-bold text-white text-right outline-none focus:border-[#444] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[13px] font-bold text-[#555]">x</span>
          </div>
        </div>
        <div
          ref={sliderTrackRef}
          className="relative h-2 rounded-full bg-[#222] mb-6 mx-1 cursor-pointer"
          onMouseDown={(e) => { isDragging.current = true; leverageFromPointer(e.clientX) }}
        >
          <div className="h-2 bg-white rounded-full" style={{ width: `${((form.leverage - 1) / 9) * 100}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-xl pointer-events-none"
            style={{ left: `calc(${((form.leverage - 1) / 9) * 100}% - 10px)` }}
          />
        </div>
        <div className="flex justify-between px-1">
          {[1, 2, 5, 10].map((val) => (
            <button key={val} onClick={() => form.setLeverage(val)} className="group flex flex-col items-center gap-2">
              <div className={`w-[1px] h-2 transition-colors ${form.leverage >= val ? 'bg-white' : 'bg-[#333]'}`} />
              <span className={`text-[10px] font-bold transition-all ${Math.round(form.leverage) === val ? 'text-white' : 'text-[#333] group-hover:text-[#555]'}`}>{val}x</span>
            </button>
          ))}
        </div>
      </div>

      {/* Position info */}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#555] font-bold">Position Size:</span>
          <span className="text-[12px] text-[#AAA] font-bold tabular-nums">
            {positionSizeUsd > 0 ? `$${positionSizeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#555] font-bold">Liq. Price:</span>
          <span className="text-[12px] text-[#AAA] font-bold tabular-nums">
            {liqPrice !== null ? `$${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        </div>
        {orderType === 'limit' && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#555] font-bold">Execution:</span>
            <span className="text-[12px] text-[#AAA] font-bold">Keeper-triggered</span>
          </div>
        )}
        {orderType === 'market' && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#555] font-bold">Slippage:</span>
            <span className="text-[12px] text-[#AAA] font-bold">0.5%</span>
          </div>
        )}
      </div>

      {!leverageValidation.isValid && (
        <span className="text-[12px] text-red-400 font-bold px-1">{leverageValidation.error}</span>
      )}

      {form.submitError && form.txStatus === 'error' && (
        <span className="text-[11px] text-red-400 font-bold px-1">
          {(form.submitError as Error).message}
        </span>
      )}

      {limitOrder.txError && limitOrder.status === 'error' && (
        <span className="text-[11px] text-red-400 font-bold px-1">{limitOrder.txError}</span>
      )}

      <TxStatusBadge status={txStatus} txId={txId} />

      {!isConnected ? (
        <button
          onClick={connect}
          className="mt-2 w-full h-[64px] rounded-2xl bg-gradient-to-r from-[#00C076] to-[#00E090] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(0,192,118,0.3)] hover:shadow-[0_12px_28px_rgba(0,192,118,0.45)] active:scale-[0.98] transition-all"
        >
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={`mt-2 w-full h-[64px] rounded-2xl text-[16px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none ${
            form.direction === 'long'
              ? 'bg-gradient-to-r from-[#00C076] to-[#00E090] shadow-[0_8px_20px_rgba(0,192,118,0.3)] hover:shadow-[0_12px_28px_rgba(0,192,118,0.45)]'
              : 'bg-gradient-to-r from-[#FF4466] to-[#FF6688] shadow-[0_8px_20px_rgba(255,68,102,0.3)] hover:shadow-[0_12px_28px_rgba(255,68,102,0.45)]'
          }`}
        >
          {(form.txStatus === 'pending' || limitOrder.isPending) ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Confirm in wallet…</span>
            </div>
          ) : orderType === 'limit' ? (
            `Place Limit ${form.direction.charAt(0).toUpperCase() + form.direction.slice(1)}`
          ) : (
            `Open ${form.direction.charAt(0).toUpperCase() + form.direction.slice(1)}`
          )}
        </button>
      )}
    </div>
  )
}
