'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'

interface LimitOrder {
  id: number
  account: string
  indexToken: string
  sizeDelta: number
  isLong: boolean
  limitPrice: number
  collateralAmount: number
  createdAt: number
}

export function OrderBook({ token }: { token: string }) {
  const { user } = useFlowNetwork()

  // Fetch real on-chain limit orders
  const { data: ordersData, isLoading } = useQuery<{ orders: LimitOrder[] }>({
    queryKey: ['limit-orders', token],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3001/api/orders`)
      return res.json()
    },
    refetchInterval: 10_000,
  })

  const orders = ordersData?.orders?.filter(o => o.indexToken.toUpperCase() === token.toUpperCase()) || []
  const asks = orders.filter(o => !o.isLong).sort((a, b) => b.limitPrice - a.limitPrice)
  const bids = orders.filter(o => o.isLong).sort((a, b) => b.limitPrice - a.limitPrice)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[#333] font-mono text-[11px] tracking-widest uppercase">Syncing Book...</div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-10 text-center">
        <div className="w-12 h-12 rounded-full bg-[#111] flex items-center justify-center mb-1">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
           </svg>
        </div>
        <span className="text-[14px] font-bold text-[#666]">No pending limit orders</span>
        <span className="text-[11px] text-[#333] leading-relaxed">Place a limit order to see it here. Your on-chain orders will appear in real-time.</span>
      </div>
    )
  }

  return (
    <div className="flex bg-[#080808] h-full gap-0 select-none overflow-hidden">
      {/* Sales Column (Asks) */}
      <div className="flex-1 flex flex-col h-full border-r border-[#111]">
        <div className="h-10 border-b border-[#111] flex items-center px-8">
          <span className="text-[11px] font-bold text-[#666] uppercase tracking-[0.2em]">Sales (Asks)</span>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
          {asks.length > 0 ? asks.map((o) => (
            <div key={o.id} className="flex items-center text-[13px] font-mono leading-none h-6 group">
              <span className="flex-1 text-[#FF4466]/70 group-hover:text-[#FF4466] transition-colors">${o.limitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-[#333] group-hover:text-[#666]">{o.sizeDelta.toFixed(2)}</span>
            </div>
          )) : (
            <div className="h-full flex items-center justify-center text-[11px] text-[#222] italic">No active asks</div>
          )}
        </div>
      </div>

      {/* Buys Column (Bids) */}
      <div className="flex-1 flex flex-col h-full">
        <div className="h-10 border-b border-[#111] flex items-center px-8">
          <span className="text-[11px] font-bold text-[#666] uppercase tracking-[0.2em]">Buys (Bids)</span>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
          {bids.length > 0 ? bids.map((o) => (
            <div key={o.id} className="flex items-center text-[13px] font-mono leading-none h-6 group">
              <span className="flex-1 text-[#00E68A]/70 group-hover:text-[#00E68A] transition-colors">${o.limitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-[#333] group-hover:text-[#666]">{o.sizeDelta.toFixed(2)}</span>
            </div>
          )) : (
            <div className="h-full flex items-center justify-center text-[11px] text-[#222] italic">No active bids</div>
          )}
        </div>
      </div>
    </div>
  )
}
