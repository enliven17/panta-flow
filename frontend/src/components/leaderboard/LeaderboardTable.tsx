'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

interface Trade {
  account: string
  isLong: boolean
  indexToken: string
  sizeDelta: string
  price: string
  action: 'increase' | 'decrease'
  blockNumber: number
  txHash: string
}

interface TraderStats {
  address: string
  trades: number
  volume: number
  longs: number
  shorts: number
  lastToken: string
}

type Period = 'ALL' | '7D' | '24H'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'
const BLOCK_TIME_SECS = 2
const BLOCKS_PER_DAY = (24 * 60 * 60) / BLOCK_TIME_SECS
const BLOCKS_7D = BLOCKS_PER_DAY * 7

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`
  return `$${usd.toFixed(2)}`
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-[#FFD700] font-black text-xs">01</span>
  if (rank === 2) return <span className="text-[#C0C0C0] font-black text-xs">02</span>
  if (rank === 3) return <span className="text-[#CD7F32] font-black text-xs">03</span>
  return <span className="text-[#333] font-black text-xs tabular-nums">{String(rank).padStart(2, '0')}</span>
}

export function LeaderboardTable() {
  const [period, setPeriod] = useState<Period>('ALL')

  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ['trades'],
    queryFn: () => fetch(`${BACKEND}/api/trades/history`).then(r => r.json()),
    refetchInterval: 30_000,
  })

  const latestBlock = trades.length > 0 ? Math.max(...trades.map(t => t.blockNumber)) : 0

  const filtered = trades.filter(t => {
    if (period === '24H') return latestBlock - t.blockNumber <= BLOCKS_PER_DAY
    if (period === '7D') return latestBlock - t.blockNumber <= BLOCKS_7D
    return true
  })

  const statsMap: Record<string, TraderStats> = {}
  for (const t of filtered) {
    const addr = t.account.toLowerCase()
    if (!statsMap[addr]) {
      statsMap[addr] = { address: t.account, trades: 0, volume: 0, longs: 0, shorts: 0, lastToken: t.indexToken }
    }
    statsMap[addr].trades++
    statsMap[addr].volume += parseFloat(t.sizeDelta) / 1e30
    if (t.isLong) statsMap[addr].longs++
    else statsMap[addr].shorts++
    statsMap[addr].lastToken = t.indexToken
  }

  const ranked = Object.values(statsMap).sort((a, b) => b.volume - a.volume)

  const totalVolume = ranked.reduce((s, t) => s + t.volume, 0)
  const totalTrades = filtered.length
  const totalTraders = ranked.length

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Traders', value: totalTraders.toString() },
          { label: 'Total Trades', value: totalTrades.toString() },
          { label: 'Total Volume', value: formatVolume(totalVolume) },
        ].map(s => (
          <div key={s.label} className="rounded-[20px] border border-[#1A1A1A] bg-[#0E0E0E] p-6">
            <p className="text-[10px] font-black text-[#444] uppercase tracking-[0.25em] mb-2">{s.label}</p>
            <p className="text-2xl font-black text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-[28px] border border-[#1A1A1A] bg-[#0E0E0E] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <h3 className="text-[11px] font-black text-[#555] uppercase tracking-[0.3em]">Rankings</h3>
          {/* Period tabs */}
          <div className="flex p-0.5 rounded-xl bg-[#080808] border border-[#111]">
            {(['ALL', '7D', '24H'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all duration-150 uppercase tracking-widest ${
                  period === p
                    ? 'bg-[#1A1A1A] text-white border border-[#222]'
                    : 'text-[#444] hover:text-[#666]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[48px_1fr_80px_100px_80px] gap-4 px-8 pb-3 border-b border-[#111]">
          <span className="text-[10px] font-black text-[#333] uppercase tracking-widest">#</span>
          <span className="text-[10px] font-black text-[#333] uppercase tracking-widest">Trader</span>
          <span className="text-[10px] font-black text-[#333] uppercase tracking-widest text-right">Trades</span>
          <span className="text-[10px] font-black text-[#333] uppercase tracking-widest text-right">Volume</span>
          <span className="text-[10px] font-black text-[#333] uppercase tracking-widest text-right">L/S</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#0d0d0d]">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <span className="text-[11px] font-black text-[#333] uppercase tracking-widest animate-pulse">Loading...</span>
            </div>
          ) : ranked.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#111] border border-[#1A1A1A] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className="text-[11px] font-black text-[#333] uppercase tracking-widest">No trades yet</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {ranked.map((trader, i) => (
                <motion.div
                  key={trader.address}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="grid grid-cols-[48px_1fr_80px_100px_80px] gap-4 px-8 py-4 hover:bg-[#111]/50 transition-colors group"
                >
                  <div className="flex items-center">
                    <Medal rank={i + 1} />
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#111] border border-[#1A1A1A] flex items-center justify-center text-[9px] font-black text-[#444] shrink-0">
                      {trader.address.slice(2, 4).toUpperCase()}
                    </div>
                    <a
                      href={`https://testnet.flowscan.io/account/${trader.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-[#666] hover:text-white transition-colors truncate"
                    >
                      {shortenAddr(trader.address)}
                    </a>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="text-sm font-bold tabular-nums text-[#666]">{trader.trades}</span>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="text-sm font-bold tabular-nums text-white">{formatVolume(trader.volume)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[10px] font-black text-[#3b82f6] tabular-nums">{trader.longs}</span>
                    <span className="text-[10px] text-[#333]">/</span>
                    <span className="text-[10px] font-black text-[#ef4444] tabular-nums">{trader.shorts}</span>
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
