'use client'

import { useStats } from '@/hooks/useGlpManager'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useStakingInfo } from '@/hooks/useStakingInfo'

export function EarnStats({ isCard }: { isCard?: boolean }) {
  const { data: stats } = useStats()
  const { user } = useFlowNetwork()
  const { data: stakingInfo } = useStakingInfo()

  const totalRewards = (stakingInfo?.panta?.pendingRewards ?? 0) + (stakingInfo?.plp?.pendingRewards ?? 0)

  if (isCard) {
    return (
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#1A1A1A]">
        <div className="flex-1 p-8">
          <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-3 block">Total Value Locked</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tabular-nums tracking-tight">
              ${stats ? parseFloat(stats.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </span>
            <span className="text-[10px] font-bold text-[#333] uppercase tracking-widest">Global</span>
          </div>
        </div>

        <div className="flex-1 p-8">
          <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-3 block">Current PLP APR</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#64748b] tabular-nums tracking-tight">
              {stats?.plpApr || '0.00'}%
            </span>
            <span className="text-[10px] font-bold text-[#333] uppercase tracking-widest">7d Avg</span>
          </div>
        </div>

        <div className="flex-1 p-8">
          <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-3 block">Index Price</span>
          <span className="text-3xl font-black text-white tabular-nums tracking-tight block">
            ${stats ? parseFloat(stats.plpPrice).toFixed(4) : '0.0000'}
          </span>
        </div>

        {user.addr && (
          <div className="flex-1 p-8 bg-[#1A1A1A]/30">
            <span className="text-[10px] font-black text-[#555] uppercase tracking-widest mb-3 block">Pending Rewards</span>
            <span className="text-3xl font-black text-[#3b82f6] tabular-nums tracking-tight block">
              {totalRewards.toFixed(4)} PANTA
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-8 px-8 py-3 bg-[#0A0A0A] border-b border-[#151515]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.2)]" />
        <span className="text-sm font-black text-white uppercase tracking-[0.2em]">Protocol Yield</span>
      </div>

      <div className="h-6 w-[1px] bg-[#1A1A1A]" />

      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#444] uppercase tracking-wider mb-0.5">Total TVL</span>
          <span className="text-[14px] font-bold tabular-nums text-white">
            ${stats ? parseFloat(stats.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </span>
        </div>

        <div className="w-[1px] h-6 bg-[#1A1A1A]" />

        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#444] uppercase tracking-wider mb-0.5">PLP APR</span>
          <span className="text-[14px] font-bold tabular-nums text-[#64748b]">
            {stats?.plpApr || '0.00'}%
          </span>
        </div>

        <div className="w-[1px] h-6 bg-[#1A1A1A]" />

        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#444] uppercase tracking-wider mb-0.5">Index Price</span>
          <span className="text-[14px] font-bold tabular-nums text-white">
            ${stats ? parseFloat(stats.plpPrice).toFixed(4) : '0.0000'}
          </span>
        </div>

        {user.addr && (
          <>
            <div className="w-[1px] h-6 bg-[#1A1A1A]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#444] uppercase tracking-wider mb-0.5">Your Rewards</span>
              <span className="text-[14px] font-bold tabular-nums text-[#3b82f6]">
                {totalRewards.toFixed(4)} PANTA
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
