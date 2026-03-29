'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getTradeHistory, getTradeHistoryForAccount } from '@/lib/api'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'

interface Trade {
  type: 'increase' | 'decrease'
  account: string
  indexToken: string
  sizeDelta: number
  isLong: boolean
  price: number
  fee: number
  pnl: number
  txHash: string
  timestamp: number
}

function shortenAddr(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getMarketLabel(indexToken: string): string {
  const t = indexToken.toUpperCase()
  if (t === 'BTC') return 'BTC/USD'
  if (t === 'ETH') return 'ETH/USD'
  return indexToken + '/USD'
}

function timeAgo(ts: number): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function TradeHistory() {
  const { user, isConnected } = useFlowNetwork()

  // Fetch all trades (global) + user trades if connected
  const { data: allTrades, isLoading: loadingAll } = useQuery<Trade[]>({
    queryKey: ['trades-history-all'],
    queryFn: async () => {
      const data = await getTradeHistory()
      return data.trades ?? []
    },
    refetchInterval: 15_000,
  })

  const { data: userTrades, isLoading: loadingUser } = useQuery<Trade[]>({
    queryKey: ['trades-history-user', user.addr],
    queryFn: async () => {
      if (!user.addr) return []
      const addr = user.addr.startsWith('0x') ? user.addr.toLowerCase() : `0x${user.addr.toLowerCase()}`
      const data = await getTradeHistoryForAccount(addr)
      return data.trades ?? []
    },
    enabled: !!user.addr,
    refetchInterval: 15_000,
  })

  const isLoading = loadingAll || loadingUser
  const trades = isConnected && userTrades && userTrades.length > 0 ? userTrades : allTrades

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-[#111] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
        </svg>
        <span className="text-[13px] text-[#555] font-medium">No trade history yet</span>
        <span className="text-[11px] text-[#333]">Opened and closed positions will appear here</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Time</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Market</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Side</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Action</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Size</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Price</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">PnL</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Tx</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, i) => (
            <motion.tr
              key={`${trade.txHash}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors duration-150"
            >
              <td className="py-3 px-3 text-[12px] text-[var(--text-muted)]">
                {timeAgo(trade.timestamp)}
              </td>
              <td className="py-3 px-3 font-semibold text-[13px]">{getMarketLabel(trade.indexToken)}</td>
              <td className="py-3 px-3">
                <span className={`inline-flex items-center text-[13px] font-medium px-2 py-0.5 rounded-md ${
                  trade.isLong
                    ? 'text-[var(--green)] bg-[var(--green-dim)]'
                    : 'text-[var(--red)] bg-[var(--red-dim)]'
                }`}>
                  {trade.isLong ? 'Long' : 'Short'}
                </span>
              </td>
              <td className="py-3 px-3">
                <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                  trade.type === 'increase' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${trade.type === 'increase' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
                  {trade.type === 'increase' ? 'Open' : 'Close'}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-[13px]">${trade.sizeDelta.toFixed(2)}</td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-[13px]">
                ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className={`py-3 px-3 text-right font-mono tabular-nums text-[13px] font-medium ${
                trade.pnl > 0 ? 'text-[var(--green)]' : trade.pnl < 0 ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'
              }`}>
                {trade.type === 'decrease' && trade.pnl !== 0
                  ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`
                  : '—'}
              </td>
              <td className="py-3 px-3 text-right font-mono text-[12px] text-[var(--text-muted)]">
                {trade.txHash ? (
                  <a
                    href={`https://testnet.flowscan.io/transaction/${trade.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {shortenAddr(trade.txHash)}
                  </a>
                ) : '—'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
