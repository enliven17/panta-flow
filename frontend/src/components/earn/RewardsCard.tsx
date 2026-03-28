'use client'

import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useStakingInfo, useClaimRewards } from '@/hooks/useStakingInfo'

export function RewardsCard({ isSimple }: { isSimple?: boolean }) {
  const { user, isConnected, connect } = useFlowNetwork()
  const { data: stakingInfo } = useStakingInfo()
  const { mutate: claim, isPending } = useClaimRewards()

  const pantaRewards = stakingInfo?.panta?.pendingRewards ?? 0
  const plpRewards = stakingInfo?.plp?.pendingRewards ?? 0
  const totalRewards = pantaRewards + plpRewards

  function handleClaim() {
    if (!user.addr) return
    if (pantaRewards > 0) claim('PANTA')
    if (plpRewards > 0) claim('PLP')
  }

  if (isSimple) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#444] mb-1.5">PANTA Rewards</p>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{pantaRewards.toFixed(4)}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[10px] font-black text-[#666]">P</div>
        </div>

        <div className="flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#444] mb-1.5">PLP Rewards</p>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{plpRewards.toFixed(4)}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#555]">L</div>
        </div>

        {!isConnected ? (
          <button onClick={connect} className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#080808] border border-[#222] hover:border-[#444] text-[14px] font-black text-[#AAA] uppercase tracking-widest transition-all">
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isPending || totalRewards === 0}
            className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#080808] border border-[#222] hover:border-[#444] text-[14px] font-black text-[#AAA] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            {isPending ? 'CLAIMING...' : 'Claim All Rewards'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[32px] border border-[#1A1A1A] bg-[#0E0E0E] p-10 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Yield Dashboard</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-[10px] font-black text-[#444] uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        <div className="flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1.5">PANTA Staking Rewards</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tight">{pantaRewards.toFixed(4)}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#666]">P</div>
        </div>

        <div className="flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1.5">PLP Staking Rewards</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tight">{plpRewards.toFixed(4)}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#555]">L</div>
        </div>
      </div>

      {!isConnected ? (
        <button
          onClick={connect}
          className="w-full h-16 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#222] hover:text-white transition-all"
        >
          Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleClaim}
          disabled={isPending || totalRewards === 0}
          className="w-full h-16 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/claim"
        >
          {isPending ? 'Processing...' : (
            <div className="flex items-center gap-3">
              <span>CLAIM REWARDS</span>
              <svg className="group-hover/claim:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          )}
        </button>
      )}
    </div>
  )
}
