'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePrices } from '@/hooks/usePrices'
import { formatPrice } from '@/lib/utils/format'
import { getTokenImage } from '@/lib/tokenImages'

interface MarketSelectorProps {
  selectedToken: string
  onSelect: (token: string) => void
}

const MARKETS = [
  { token: 'BTC',  label: 'BTC / USDC',  color: '#FF9900' },
  { token: 'ETH',  label: 'ETH / USDC',  color: '#627EEA' },
  { token: 'FLOW', label: 'FLOW / USDC', color: '#00EF8B' },
]

function CoinIcon({ token }: { token: string }) {
  const src = getTokenImage(token)
  if (src) {
    return <Image src={src} alt={token} width={20} height={20} className="rounded-full" />
  }
  const color = MARKETS.find(m => m.token === token)?.color ?? '#666'
  return <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: color }} />
}

export function MarketSelector({ selectedToken, onSelect }: MarketSelectorProps) {
  const { data: prices } = usePrices()

  return (
    <div className="flex items-center px-2 md:px-6 py-2 overflow-x-auto bg-[#080808]"
         style={{ scrollbarWidth: 'none' }}>
      {/* Logo — only on mobile (sidebar hidden) */}
      <Link href="/" className="md:hidden shrink-0 mr-3">
        <Image src="/logo.svg" alt="Panta" width={28} height={28} />
      </Link>
      {MARKETS.map((market) => {
        const isActive = selectedToken === market.token
        const price = prices?.[market.token]
        return (
          <button
            key={market.token}
            onClick={() => onSelect(market.token)}
            className={`group relative flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-lg transition-all duration-200 border shrink-0 ${
              isActive
                ? 'bg-[#111] border-[#222] shadow-sm'
                : 'bg-transparent border-transparent hover:bg-[#0E0E0E] text-[#444]'
            }`}
          >
            <CoinIcon token={market.token} />
            <div className="flex flex-col md:flex-row md:items-center md:gap-2">
              <span className={`text-[11px] md:text-[12px] font-bold leading-tight ${isActive ? 'text-white' : 'text-[#555]'}`}>
                {market.label}
              </span>
              <span className={`text-[10px] md:text-[11px] tabular-nums font-medium leading-tight ${isActive ? 'text-[#AAA]' : 'text-[#333]'}`}>
                {price ? `$${formatPrice(price)}` : '—'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
