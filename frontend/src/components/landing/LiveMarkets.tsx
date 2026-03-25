'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { formatPrice } from '@/lib/utils/format'

const PREVIEW_MARKETS = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#FF9900' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
]

export function LiveMarkets() {
  const { data: prices } = usePrices()

  return (
    <section className="py-32 px-4 bg-[#050505]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Available Markets</h2>
            <p className="text-[#666] font-medium max-w-md">Trade our most liquid pairs with deep liquidity and up to 10x leverage.</p>
          </div>
          <Link href="/trade" className="text-[13px] font-bold text-white uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-2">
            View All Markets
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PREVIEW_MARKETS.map((market, i) => {
            const price = prices?.[market.symbol] ? parseFloat(prices[market.symbol]) : (market.symbol === 'BTC' ? 63601.08 : 3452.12)
            
            return (
              <motion.div
                key={market.symbol}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="group relative p-8 rounded-3xl bg-[#0A0A0A] border border-[#151515] hover:border-[#222] transition-all overflow-hidden"
              >
                {/* Accent glow on hover */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-700"
                  style={{ backgroundColor: market.color }}
                />

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
                      style={{ backgroundColor: market.color }}
                    >
                      {market.symbol[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{market.name}</h3>
                      <p className="text-[11px] font-bold text-[#444] uppercase tracking-widest">{market.symbol} / USDT</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white tabular-nums">${formatPrice(price.toString())}</p>
                    <p className="text-[13px] font-bold text-[var(--green)]">+2.45%</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link 
                    href={`/trade?asset=${market.symbol}`}
                    className="flex-1 h-12 flex items-center justify-center rounded-xl bg-white text-black font-black text-[13px] uppercase tracking-widest hover:bg-[#EEE] transition-all"
                  >
                    Trade Now
                  </Link>
                  <button className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#111] border border-[#222] text-[#444] hover:text-white hover:border-[#333] transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
