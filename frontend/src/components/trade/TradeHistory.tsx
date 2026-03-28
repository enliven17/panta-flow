'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getTradeHistory } from '@/lib/api'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'

interface Trade {
  type: 'increase' | 'decrease'
  account: string
  indexToken: string
  sizeDelta: number
  isLong: boolean
  price: number
  fee: number
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

export function TradeHistory() {
  const { user } = useFlowNetwork()

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['trades-history', user.addr],
    queryFn: async () => {
      const data = await getTradeHistory(user.addr ?? '')
      return data.trades ?? []
    },
    enabled: !!user.addr,
    refetchInterval: 15_000,
  })

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
      <div className="text-center py-10 text-[var(--text-ghost)] text-sm">
        No trade history yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Account</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Market</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Side</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Action</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Size</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Price</th>
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
              <td className="py-3 px-3 font-mono text-[12px] text-[var(--text-muted)]">
                <a
                  href={`https://testnet.flowscan.io/account/${trade.account}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text-secondary)] transition-colors"
                >
                  {shortenAddr(trade.account)}
                </a>
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
                <span className={`text-[12px] font-medium ${trade.type === 'increase' ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`}>
                  {trade.type === 'increase' ? 'Open' : 'Close'}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-[13px]">${trade.sizeDelta.toFixed(2)}</td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-[13px]">
                ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="py-3 px-3 text-right font-mono text-[12px] text-[var(--text-muted)]">
                <a
                  href={`https://testnet.flowscan.io/transaction/${trade.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text-secondary)] transition-colors"
                >
                  {trade.txHash ? shortenAddr(trade.txHash) : '—'}
                </a>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
