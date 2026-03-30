'use client'

import { useState } from 'react'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useStats } from '@/hooks/useGlpManager'
import { TokenInput } from '@/components/shared/TokenInput'

type Mode = 'buy' | 'sell'

export function PLPCard({ isSimple }: { isSimple?: boolean }) {
  const { isConnected, connect } = useFlowNetwork()
  const { data: stats } = useStats()
  const [mode, setMode] = useState<Mode>('buy')
  const [amount, setAmount] = useState('')

  if (isSimple) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
          {(['buy', 'sell'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-200 ${
                mode === m ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm' : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {m === 'buy' ? 'Buy PLP' : 'Sell PLP'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[11px] text-[#555] font-black uppercase tracking-widest mb-1.5">APR</span>
            <span className="block text-[15px] text-[#64748b] font-bold tabular-nums">{stats?.plpApr || '0.00'}%</span>
          </div>
          <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[11px] text-[#555] font-black uppercase tracking-widest mb-1.5">Price</span>
            <span className="block text-[15px] text-white font-bold tabular-nums">
              ${stats ? parseFloat(stats.plpPrice).toFixed(4) : '0.0000'}
            </span>
          </div>
        </div>

        <TokenInput
          label={mode === 'buy' ? 'Pay USDC' : 'Burn PLP'}
          value={amount}
          onChange={setAmount}
          symbol={mode === 'buy' ? 'USDC' : 'PLP'}
        />

        <button
          disabled
          className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#222] text-[13px] font-black text-[#444] uppercase tracking-widest cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 opacity-[0.02] blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333] mb-4 block">Liquidity Provider</span>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3 uppercase">Panta LP</h2>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Multi-asset liquidity pool</span>
        </div>
        {stats && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#333] mb-2">Price</span>
            <p className="text-5xl font-black text-white tabular-nums tracking-tighter">
              <span className="text-lg align-top mr-1 opacity-20">$</span>
              {parseFloat(stats.plpPrice).toFixed(4)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Annual Yield</span>
          <p className="text-4xl font-black text-[#64748b] tabular-nums">{stats?.plpApr || '0'}%</p>
        </div>
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Pool TVL</span>
          <p className="text-4xl font-black text-white tabular-nums">
            <span className="text-lg align-top mr-1 opacity-20">$</span>
            {stats ? parseFloat(stats.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
        </div>
      </div>

      <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] text-center">
        <p className="text-[14px] font-black text-[#444] uppercase tracking-widest">PLP minting coming soon</p>
      </div>
    </div>
  )
}
