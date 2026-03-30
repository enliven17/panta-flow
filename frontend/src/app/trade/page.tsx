'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { TradingChart } from '@/components/trade/TradingChart'
import { OrderPanel } from '@/components/trade/OrderPanel'
import { MarketSelector } from '@/components/trade/MarketSelector'
import { PositionsTable } from '@/components/trade/PositionsTable'
import { OrdersTable } from '@/components/trade/OrdersTable'
import { TradeHistory } from '@/components/trade/TradeHistory'
import { OrderBook } from '@/components/trade/OrderBook'
import { usePrices } from '@/hooks/usePrices'
import { getTokenImage } from '@/lib/tokenImages'

type BottomTab = 'positions' | 'orders' | 'history' | 'orderbook'
type MobileView = 'chart' | 'order'

const TOKEN_COLORS: Record<string, string> = {
  BTC: '#FF9900',
  ETH: '#627EEA',
  FLOW: '#00EF8B',
}

function PriceHeaderBar({ token }: { token: string }) {
  const { data: prices } = usePrices()
  const price = prices?.[token] ? parseFloat(prices[token]) : 0
  const decimals = token === 'FLOW' ? 4 : 2

  return (
    <div className="flex items-center gap-4 px-4 md:px-8 py-2.5 bg-[#0A0A0A] overflow-x-auto"
         style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center gap-2 shrink-0">
        {getTokenImage(token) ? (
          <Image src={getTokenImage(token)!} alt={token} width={18} height={18} className="rounded-full" />
        ) : (
          <div className="w-4 h-4 rounded-full" style={{ background: TOKEN_COLORS[token] ?? '#666' }} />
        )}
        <span className="text-base md:text-2xl font-bold tabular-nums text-white tracking-tight">
          {price > 0 ? `$${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}` : '—'}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-[var(--green)] ml-1">+0.76%</span>
      </div>

      <div className="hidden sm:flex items-center gap-6 ml-2">
        <div className="w-[1px] h-5 bg-[#1A1A1A] shrink-0" />
        <div className="flex flex-col shrink-0">
          <span className="text-[9px] font-bold text-[#444] uppercase tracking-wider">24h High/Low</span>
          <span className="text-[11px] font-bold tabular-nums text-white">$63,601 / $64,210</span>
        </div>
        <div className="w-[1px] h-5 bg-[#1A1A1A] shrink-0" />
        <div className="flex flex-col shrink-0">
          <span className="text-[9px] font-bold text-[#444] uppercase tracking-wider">Funding</span>
          <span className="text-[11px] font-bold tabular-nums text-[#666]">0.0100%</span>
        </div>
      </div>
    </div>
  )
}

const EASE = [0.16, 1, 0.3, 1] as const
const fromLeft  = { hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } } }
const fromRight = { hidden: { opacity: 0, x:  48 }, visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } } }
const fromTop   = { hidden: { opacity: 0, y: -24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }
const stagger   = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }

export default function TradePage() {
  const [selectedToken, setSelectedToken] = useState('BTC')
  const [bottomTab, setBottomTab] = useState<BottomTab>('positions')
  const [mobileView, setMobileView] = useState<MobileView>('chart')

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="flex flex-col h-full bg-[#080808]"
    >
      {/* Market selector */}
      <motion.div variants={fromTop}>
        <MarketSelector selectedToken={selectedToken} onSelect={setSelectedToken} />
      </motion.div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        {/* Price bar */}
        <PriceHeaderBar token={selectedToken} />

        {/* Chart ↔ Order switcher */}
        <div className="flex border-b border-[#151515] bg-[#080808]">
          {(['chart', 'order'] as MobileView[]).map((v) => (
            <button
              key={v}
              onClick={() => setMobileView(v)}
              className={`relative flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors ${
                mobileView === v ? 'text-white' : 'text-[#444]'
              }`}
            >
              {v === 'chart' ? 'Chart' : 'Place Order'}
              {mobileView === v && (
                <motion.span
                  layoutId="mobile-view-indicator"
                  className="absolute bottom-0 left-8 right-8 h-[2px] bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Chart view */}
        <AnimatePresence mode="wait" initial={false}>
          {mobileView === 'chart' && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Chart fills remaining space */}
              <div className="flex-1 min-h-0">
                <TradingChart token={selectedToken} />
              </div>

              {/* Positions tabs strip */}
              <div className="bg-[#0A0A0A] border-t border-[#151515] shrink-0">
                <div className="flex overflow-x-auto border-b border-[#1A1A1A] px-1" style={{ scrollbarWidth: 'none' }}>
                  {(['positions', 'orders', 'history', 'orderbook'] as BottomTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBottomTab(t)}
                      className={`relative shrink-0 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        bottomTab === t ? 'text-white' : 'text-[#444]'
                      }`}
                    >
                      {t}
                      {bottomTab === t && (
                        <motion.span
                          layoutId="bottom-tab-indicator"
                          className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="h-[160px] overflow-y-auto p-3">
                  {bottomTab === 'positions' && <PositionsTable />}
                  {bottomTab === 'orders' && <OrdersTable />}
                  {bottomTab === 'history' && <TradeHistory />}
                  {bottomTab === 'orderbook' && <OrderBook token={selectedToken} />}
                </div>
              </div>
            </motion.div>
          )}

          {/* Order panel view */}
          {mobileView === 'order' && (
            <motion.div
              key="order"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-4">
                <OrderPanel market={selectedToken as 'ETH' | 'BTC' | 'FLOW'} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden md:flex flex-1 overflow-y-auto">
        <div className="p-2 w-full flex flex-col">
          <div className="flex-1 bg-[#0A0A0A] rounded-[32px] border border-[#151515] overflow-hidden flex flex-col shadow-2xl">
            <motion.div variants={fromTop}>
              <PriceHeaderBar token={selectedToken} />
            </motion.div>

            <div className="flex flex-1 min-h-0 px-4 pb-4">
              {/* Left: chart + positions */}
              <motion.div variants={fromLeft} className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 min-h-0 mb-2">
                  <TradingChart token={selectedToken} />
                </div>
                <div className="bg-[#0E0E0E] rounded-2xl border border-[#1A1A1A] overflow-hidden">
                  <div className="flex border-b border-[#1A1A1A] px-2">
                    {(['positions', 'orders', 'history', 'orderbook'] as BottomTab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setBottomTab(t)}
                        className={`relative px-6 py-4 text-[13px] font-bold transition-all duration-150 ${
                          bottomTab === t ? 'text-white' : 'text-[#555] hover:text-[#888]'
                        }`}
                      >
                        {t.toUpperCase()}
                        {bottomTab === t && (
                          <motion.span
                            layoutId="desktop-tab-indicator"
                            className="absolute bottom-0 left-6 right-6 h-[2px] bg-white rounded-full"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 h-[240px] overflow-y-auto">
                    {bottomTab === 'positions' && <PositionsTable />}
                    {bottomTab === 'orders' && <OrdersTable />}
                    {bottomTab === 'history' && <TradeHistory />}
                    {bottomTab === 'orderbook' && <OrderBook token={selectedToken} />}
                  </div>
                </div>
              </motion.div>

              {/* Right: order panel */}
              <motion.div variants={fromRight} className="w-[380px] shrink-0 ml-4 border border-[#1A1A1A] rounded-2xl bg-[#0E0E0E] overflow-hidden">
                <div className="p-6">
                  <OrderPanel market={selectedToken as 'ETH' | 'BTC' | 'FLOW'} />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
