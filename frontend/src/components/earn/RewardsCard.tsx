'use client'

import { motion } from 'framer-motion'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { ADDRESSES } from '@/lib/contracts/addresses'

const REWARD_ROUTER_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonReentrant', inputs: [], outputs: [] },
] as const

const REWARD_TRACKER_ABI = [
  { name: 'claimable', type: 'function', stateMutability: 'view', inputs: [{ name: '_account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

export function RewardsCard({ isSimple }: { isSimple?: boolean }) {
  const { address } = useAccount()
  const isStakingActive = ADDRESSES.RewardRouter !== '0x0000000000000000000000000000000000000000'

  const { data: rewardsData } = useReadContracts({
    contracts: [
      { address: ADDRESSES.feePantaTracker, abi: REWARD_TRACKER_ABI, functionName: 'claimable', args: [address ?? '0x0'] },
      { address: ADDRESSES.stakedPantaTracker, abi: REWARD_TRACKER_ABI, functionName: 'claimable', args: [address ?? '0x0'] },
      { address: ADDRESSES.feePlpTracker, abi: REWARD_TRACKER_ABI, functionName: 'claimable', args: [address ?? '0x0'] },
      { address: ADDRESSES.stakedPlpTracker, abi: REWARD_TRACKER_ABI, functionName: 'claimable', args: [address ?? '0x0'] },
    ],
    query: {
      enabled: !!address && isStakingActive,
      refetchInterval: 10_000,
    }
  })

  // feePantaTracker & feePlpTracker reward in WETH
  const wethRewards = (rewardsData?.[0]?.result ?? 0n) + (rewardsData?.[2]?.result ?? 0n)
  // stakedPantaTracker & stakedPlpTracker reward in esPANTA
  const espantaRewards = (rewardsData?.[1]?.result ?? 0n) + (rewardsData?.[3]?.result ?? 0n)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  function handleClaim() {
    if (!address || !isStakingActive) return
    writeContract({
      address: ADDRESSES.RewardRouter,
      abi: REWARD_ROUTER_ABI,
      functionName: 'claim',
    })
  }

  const isLoading = isPending || isConfirming

  if (!isStakingActive) return null

  if (isSimple) {
    return (
      <div className="flex flex-col gap-4">
        <div className="group/item flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#444] mb-1.5">WETH Rewards</p>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
              {parseFloat(formatUnits(wethRewards, 18)).toFixed(6)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#555] shadow-lg italic font-serif">Ξ</div>
        </div>

        <div className="group/item flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#444] mb-1.5">esPANTA Rewards</p>
            <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
              {parseFloat(formatUnits(espantaRewards, 18)).toFixed(4)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[10px] font-black text-[#666] shadow-lg">P</div>
        </div>

        <button
          onClick={handleClaim}
          disabled={isLoading || (!wethRewards && !espantaRewards)}
          className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#080808] border border-[#222] hover:border-[#444] text-[14px] font-black text-[#AAA] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? 'CLAIMING...' : 'Claim All Rewards'}
        </button>

        {isSuccess && (
          <p className="text-[10px] text-[var(--green)] font-bold text-center uppercase tracking-widest">
            Rewards Distributed
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[32px] border border-[#1A1A1A] bg-[#0E0E0E] p-10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 opacity-0 group-hover:opacity-40 blur-[100px] pointer-events-none transition-opacity duration-700" />
      
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] uppercase">Yield Dashboard</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-[10px] font-black text-[#444] uppercase tracking-widest">Protocol Stats</span>
        </div>
      </div>
      
      <div className="space-y-4 mb-10">
        <div className="group/item flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222] relative overflow-hidden transition-all hover:bg-[#1C1C1C]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1.5">WETH Yield</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tight">
              {parseFloat(formatUnits(wethRewards, 18)).toFixed(6)}
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end">
            <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#555] mb-2 shadow-lg italic font-serif">Ξ</div>
          </div>
        </div>

        <div className="group/item flex justify-between items-center bg-[#1A1A1A] p-6 rounded-2xl border border-[#222] relative overflow-hidden transition-all hover:bg-[#1C1C1C]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-1.5">esPANTA Yield</p>
            <p className="text-3xl font-black text-white tabular-nums tracking-tight">
              {parseFloat(formatUnits(espantaRewards, 18)).toFixed(4)}
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end">
            <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center text-[10px] font-black text-[#666] mb-2 shadow-lg">P</div>
          </div>
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={isLoading || (!wethRewards && !espantaRewards)}
        className="w-full h-16 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/claim"
      >
        {isLoading ? 'Processing...' : (
           <div className="flex items-center gap-3">
              <span>CLAIM REWARDS</span>
              <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
        )}
      </button>
    </div>
  )
}
