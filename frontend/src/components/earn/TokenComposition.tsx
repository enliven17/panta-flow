'use client'

import { motion } from 'framer-motion'

const POOL_COMPOSITION = [
  { symbol: 'WETH', weight: 50, color: '#334155' },
  { symbol: 'USDC', weight: 50, color: '#1e293b' },
]

export function TokenComposition({ bare }: { bare?: boolean }) {
  const inner = (
    <>
      <div className="space-y-10">
        {POOL_COMPOSITION.map((token) => (
          <div key={token.symbol}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter text-white bg-[#111] border border-[#222]">
                  {token.symbol[0]}
                </div>
                <span className="text-xl font-black text-white tracking-tight">{token.symbol}</span>
              </div>
              <span className="text-sm font-bold text-[#444] tabular-nums tracking-widest">{token.weight}%</span>
            </div>
            <div className="h-4 bg-[#080808] rounded-full overflow-hidden border border-[#151515] p-1 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${token.weight}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: token.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-[#080808]/50 border border-[#151515] backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#333] shrink-0" />
          <p className="text-[11px] text-[#444] font-black uppercase tracking-widest leading-relaxed">
            Dynamic weights optimized for deep liquidity and trade efficiency.
          </p>
        </div>
      </div>
    </>
  )

  if (bare) return inner

  return (
    <div className="rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] opacity-0 group-hover:opacity-100 blur-[100px] pointer-events-none transition-opacity duration-700" />
      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10">Pool Composition</h3>
      {inner}
    </div>
  )
}
