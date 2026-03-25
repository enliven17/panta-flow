'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TradingChart } from '@/components/trade/TradingChart'
import { OrderPanel } from '@/components/trade/OrderPanel'
import { MarketSelector } from '@/components/trade/MarketSelector'
import { PositionsTable } from '@/components/trade/PositionsTable'
import { OrdersTable } from '@/components/trade/OrdersTable'
import { TradeHistory } from '@/components/trade/TradeHistory'
import { usePrices } from '@/hooks/usePrices'
import { formatPrice } from '@/lib/utils/format'

type Tab = 'positions' | 'orders' | 'history'

function PriceHeaderBar({ token }: { token: string }) {
  const { data: prices } = usePrices()
  const price = prices?.[token] ? parseFloat(prices[token]) : (token === 'BTC' ? 63601.08 : 3452.12)

  return (
    <div className="flex items-center gap-8 px-8 py-3 bg-[#0A0A0A]">
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${token === 'BTC' ? 'bg-[#FF9900]' : 'bg-[#627EEA]'}`}>
          <div className="w-2 h-2 bg-white rounded-full opacity-40" />
        </div>
        <span className="text-2xl font-bold tabular-nums text-white tracking-tight">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#444] uppercase tracking-wider">Change</span>
          <span className="text-[13px] font-bold tabular-nums text-[var(--green)]">+0.76%</span>
        </div>

        <div className="w-[1px] h-6 bg-[#1A1A1A]" />

        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#444] uppercase tracking-wider">24h High/Low</span>
          <span className="text-[13px] font-bold tabular-nums text-white">$63,601 / $64,210</span>
        </div>

        <div className="w-[1px] h-6 bg-[#1A1A1A]" />

        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-[#444] uppercase tracking-wider">Funding</span>
          <span className="text-[13px] font-bold tabular-nums text-[#666]">0.0100%</span>
        </div>
      </div>
    </div>
  )
}

export default function TradePage() {
  const [selectedToken, setSelectedToken] = useState('BTC')
  const [tab, setTab] = useState<Tab>('positions')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full bg-[#080808]"
    >
      {/* Market pair tabs */}
      <MarketSelector selectedToken={selectedToken} onSelect={setSelectedToken} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 h-full flex flex-col">
          {/* Rounded inner container like in the image */}
          <div className="flex-1 bg-[#0A0A0A] rounded-[32px] border border-[#151515] overflow-hidden flex flex-col shadow-2xl">
            {/* Price stats bar */}
            <PriceHeaderBar token={selectedToken} />

            {/* Main trading area */}
            <div className="flex flex-1 min-h-0 px-4 pb-4">
              {/* Left: chart + positions */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 min-h-0 mb-2">
                  <TradingChart token={selectedToken} />
                </div>

                {/* Positions/Orders/History tabs */}
                <div className="bg-[#0E0E0E] rounded-2xl border border-[#1A1A1A] overflow-hidden">
                  <div className="flex border-b border-[#1A1A1A] px-2">
                    {(['positions', 'orders', 'history'] as Tab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`relative px-6 py-4 text-[13px] font-bold transition-all duration-150 ${
                          tab === t
                            ? 'text-white'
                            : 'text-[#555] hover:text-[#888]'
                        }`}
                      >
                        {t.toUpperCase()}
                        {tab === t && (
                          <motion.span
                            layoutId="tab-indicator"
                            className="absolute bottom-0 left-6 right-6 h-[2px] bg-white rounded-full"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 h-[240px] overflow-y-auto">
                    {tab === 'positions' && <PositionsTable />}
                    {tab === 'orders' && <OrdersTable />}
                    {tab === 'history' && <TradeHistory />}
                  </div>
                </div>
              </div>

              {/* Right: order panel */}
              <div className="w-[380px] shrink-0 ml-4 border border-[#1A1A1A] rounded-2xl bg-[#0E0E0E] overflow-y-auto">
                <div className="p-6">
                  <OrderPanel market={selectedToken as 'ETH' | 'BTC'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
