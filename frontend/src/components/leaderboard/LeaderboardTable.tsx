'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { getTradeHistory } from '@/lib/api'

interface Trade {
  type: 'increase' | 'decrease'
  account: string
  isLong: boolean
  indexToken: string
  sizeDelta: number
  price: number
  fee: number
  pnl: number
  txHash: string
  timestamp: number
}

interface TraderStats {
  address: string
  trades: number
  volume: number
  pnl: number
  longs: number
  shorts: number
}

type Period = 'ALL' | '7D' | '24H'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function shortenAddr(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(2)}`
}

function formatPnl(pnl: number): string {
  const abs = Math.abs(pnl)
  const sign = pnl >= 0 ? '+' : '-'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

export function LeaderboardTable() {
  const [period, setPeriod] = useState<Period>('ALL')

  const { data: allTrades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ['leaderboard-trades'],
    queryFn: async () => {
      const data = await getTradeHistory()
      return data.trades ?? []
    },
    refetchInterval: 30_000,
  })

  const now = Date.now()
  const filtered = allTrades.filter(t => {
    if (!t.timestamp) return period === 'ALL'
    if (period === '24H') return now - t.timestamp <= MS_PER_DAY
    if (period === '7D') return now - t.timestamp <= 7 * MS_PER_DAY
    return true
  })

  const statsMap: Record<string, TraderStats> = {}
  for (const t of filtered) {
    const addr = t.account?.toLowerCase()
    if (!addr) continue
    if (!statsMap[addr]) {
      statsMap[addr] = { address: t.account, trades: 0, volume: 0, pnl: 0, longs: 0, shorts: 0 }
    }
    statsMap[addr].trades++
    statsMap[addr].volume += t.sizeDelta || 0
    if (t.type === 'decrease') {
      statsMap[addr].pnl += t.pnl || 0
    }
    if (t.isLong) statsMap[addr].longs++
    else statsMap[addr].shorts++
  }

  const ranked = Object.values(statsMap).sort((a, b) => b.pnl - a.pnl)

  const totalVolume = ranked.reduce((s, t) => s + t.volume, 0)
  const totalTrades = filtered.length
  const totalTraders = ranked.length

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: 'Traders', value: totalTraders.toLocaleString() },
          { label: 'Trades', value: totalTrades.toLocaleString() },
          { label: 'Volume', value: formatVolume(totalVolume) },
        ].map(s => (
          <div key={s.label} className="border-l border-[#111] first:border-l-0 px-3 md:px-6 py-2">
            <p className="text-[9px] md:text-[10px] text-[#444] uppercase tracking-widest">{s.label}</p>
            <p className="text-base md:text-xl font-medium text-white tabular-nums tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#080808]">
        {/* Toolbar */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex gap-4">
            {(['ALL', '7D', '24H'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-[10px] font-bold transition-all duration-200 uppercase tracking-[0.15em] ${
                  period === p ? 'text-white underline underline-offset-8 decoration-[var(--green)]' : 'text-[#333] hover:text-[#555]'
                }`}
              >
                {p === 'ALL' ? 'All Time' : p}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-[#222] font-black uppercase tracking-widest hidden sm:block">Real-time Data</p>
        </div>

        {/* Column headers — mobile shows Rank/Account/Trades/PnL, desktop adds Volume/Activity */}
        <div className="grid grid-cols-[36px_1fr_56px_80px] md:grid-cols-[50px_1fr_80px_100px_110px_90px] gap-2 md:gap-4 py-2 border-b border-[#111]">
          <span className="text-[9px] font-bold text-[#222] uppercase tracking-widest">Rank</span>
          <span className="text-[9px] font-bold text-[#222] uppercase tracking-widest">Account</span>
          <span className="text-[9px] font-bold text-[#222] uppercase tracking-widest text-right">Trades</span>
          <span className="hidden md:block text-[9px] font-bold text-[#222] uppercase tracking-widest text-right">Volume</span>
          <span className="text-[9px] font-bold text-[#222] uppercase tracking-widest text-right">PnL</span>
          <span className="hidden md:block text-[9px] font-bold text-[#222] uppercase tracking-widest text-right">Activity</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#0d0d0d]">
          {isLoading ? (
            <div className="py-20 text-center">
              <span className="text-[10px] text-[#222] uppercase tracking-widest animate-pulse">Syncing...</span>
            </div>
          ) : ranked.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-[10px] text-[#222] uppercase tracking-widest">No data yet</span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {ranked.map((trader, i) => (
                <motion.div
                  key={trader.address}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-[36px_1fr_56px_80px] md:grid-cols-[50px_1fr_80px_100px_110px_90px] gap-2 md:gap-4 py-3 md:py-4 hover:bg-[#111]/10 transition-all group"
                >
                  <div className="text-[11px] font-medium tabular-nums text-[#333] flex items-center">
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  <div className="flex items-center min-w-0">
                    <a
                      href={`https://testnet.flowscan.io/account/${trader.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[#666] hover:text-white transition-colors truncate"
                    >
                      {shortenAddr(trader.address)}
                    </a>
                  </div>

                  <div className="text-right flex items-center justify-end">
                    <span className="text-xs tabular-nums text-[#555]">{trader.trades}</span>
                  </div>

                  <div className="hidden md:flex text-right items-center justify-end">
                    <span className="text-xs tabular-nums text-[#888]">{formatVolume(trader.volume)}</span>
                  </div>

                  <div className="text-right flex items-center justify-end">
                    <span className={`text-xs tabular-nums ${
                      trader.pnl > 0 ? 'text-[var(--green)]' : trader.pnl < 0 ? 'text-[var(--red)]' : 'text-[#444]'
                    }`}>
                      {trader.pnl !== 0 ? formatPnl(trader.pnl) : '—'}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center justify-end">
                    <div className="w-16 h-0.5 bg-[#111] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500/50"
                        style={{ width: `${(trader.longs / (trader.longs + trader.shorts || 1)) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-500/50"
                        style={{ width: `${(trader.shorts / (trader.longs + trader.shorts || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
