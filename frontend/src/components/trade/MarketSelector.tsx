'use client'

import { usePrices } from '@/hooks/usePrices'
import { formatPrice } from '@/lib/utils/format'

interface MarketSelectorProps {
  selectedToken: string
  onSelect: (token: string) => void
}

const MARKETS = [
  { token: 'BTC', label: 'BTC / USDT', symbol: 'BTC', price: '63601.08' },
  { token: 'ETH', label: 'ETH / USDT', symbol: 'ETH', price: '3452.12' },
]

function CoinIcon({ symbol, isActive }: { symbol: string; isActive: boolean }) {
  const bgColor = isActive ? 'bg-[#FF9900]' : 'bg-[#1A1A1A]' // Orange for BTC, usually blue for ETH but minimal is better
  return (
    <div className={`w-3 h-3 rounded-full shadow-sm ${symbol === 'BTC' ? 'bg-[#FF9900]' : 'bg-[#627EEA]'}`} />
  )
}

export function MarketSelector({ selectedToken, onSelect }: MarketSelectorProps) {
  const { data: prices } = usePrices()

  return (
    <div className="flex items-center gap-1 px-6 py-2 overflow-x-auto bg-[#080808]"
         style={{ scrollbarWidth: 'none' }}>
      {MARKETS.map((market) => {
        const isActive = selectedToken === market.token
        return (
          <button
            key={market.token}
            onClick={() => onSelect(market.token)}
            className={`group relative flex items-center gap-3 px-4 py-1.5 rounded-lg transition-all duration-200 border ${
              isActive
                ? 'bg-[#111] border-[#222] shadow-sm'
                : 'bg-transparent border-transparent hover:bg-[#0E0E0E] text-[#444]'
            }`}
          >
            <CoinIcon symbol={market.symbol} isActive={isActive} />
            
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-bold ${isActive ? 'text-white' : 'text-[#555]'}`}>
                {market.label}
              </span>
              <span className={`text-[11px] tabular-nums font-medium ${isActive ? 'text-[#AAA]' : 'text-[#333]'}`}>
                ${prices?.[market.token] ? formatPrice(prices[market.token]) : market.price}
              </span>
            </div>

            {isActive && (
              <div className="ml-1 w-3 h-3 flex items-center justify-center text-[#444] hover:text-[#888]">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
