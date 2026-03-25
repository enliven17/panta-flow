'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { ADDRESSES } from '@/lib/contracts/addresses'
import { TokenInput } from '@/components/shared/TokenInput'
import { useStats } from '@/hooks/useGlpManager'

type Mode = 'buy' | 'sell'

const REWARD_ROUTER_ABI = [
  {
    name: 'mintAndStakeGlp',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_minUsdg', type: 'uint256' },
      { name: '_minGlp', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'unstakeAndRedeemGlp',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_tokenOut', type: 'address' },
      { name: '_glpAmount', type: 'uint256' },
      { name: '_minOut', type: 'uint256' },
      { name: '_receiver', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

export function PLPCard({ isSimple }: { isSimple?: boolean }) {
  const { address } = useAccount()
  const { data: stats } = useStats()
  const [mode, setMode] = useState<Mode>('buy')
  const [amount, setAmount] = useState('')

  const isStakingActive = ADDRESSES.RewardRouter !== '0x0000000000000000000000000000000000000000'

  const { data: allowance = 0n } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0', ADDRESSES.GlpManager],
    query: { enabled: !!address && isStakingActive },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  function handleSubmit() {
    if (!amount || !address || !isStakingActive) return
    const amountIn = parseUnits(amount, mode === 'buy' ? 6 : 18)

    if (mode === 'buy') {
      if (allowance < amountIn) {
        writeContract({
          address: ADDRESSES.USDC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ADDRESSES.GlpManager, amountIn],
        })
        return
      }

      writeContract({
        address: ADDRESSES.RewardRouter,
        abi: REWARD_ROUTER_ABI,
        functionName: 'mintAndStakeGlp',
        args: [ADDRESSES.USDC, amountIn, 0n, 0n],
      })
    } else {
      writeContract({
        address: ADDRESSES.RewardRouter,
        abi: REWARD_ROUTER_ABI,
        functionName: 'unstakeAndRedeemGlp',
        args: [ADDRESSES.USDC, amountIn, 0n, address],
      })
    }
  }

  const isLoading = isPending || isConfirming
  if (!isStakingActive) return null

  if (isSimple) {
    return (
      <div className="flex flex-col gap-4">
        {/* Buy/Sell toggle */}
        <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
          {(['buy', 'sell'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-200 ${
                mode === m
                  ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm'
                  : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {m === 'buy' ? 'Buy PLP' : 'Sell PLP'}
            </button>
          ))}
        </div>

        {/* Info blocks from Trade page style */}
        <div className="flex gap-2">
          <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[11px] text-[#555] font-black uppercase tracking-widest mb-1.5">APR</span>
            <span className="block text-[15px] text-[#64748b] font-bold tabular-nums">
              {stats?.plpApr || '0.00'}%
            </span>
          </div>
          <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[11px] text-[#555] font-black uppercase tracking-widest mb-1.5">Price</span>
            <span className="block text-[15px] text-white font-bold tabular-nums">
              ${stats ? parseFloat(stats.plpPrice).toFixed(4) : '0.0000'}
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#222]">
          <TokenInput
            label={mode === 'buy' ? 'Pay USDC' : 'Burn PLP'}
            value={amount}
            onChange={setAmount}
            symbol={mode === 'buy' ? 'USDC' : 'PLP'}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount || !address || isLoading}
          className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#222] hover:border-[#444] text-[13px] font-black text-[#AAA] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>{mode === 'buy' ? 'MINTING...' : 'REDEEMING...'}</span>
            </div>
          ) : mode === 'buy' ? 'Buy PLP' : 'Sell PLP'}
        </button>

        {isSuccess && (
          <p className="text-[10px] text-[var(--green)] font-bold text-center uppercase tracking-widest">
            Transaction Successful
          </p>
        )}
      </div>
    )
  }

  // Large card style for main area
  return (
    <div className="rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
      {/* Background radial glow eliminated to match "Industrial" style if user hates it */}
      {/* Keeping a very subtle one JUST for the 5-tier depth system in globals.css */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 opacity-[0.02] blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333] mb-4 block">Liquidity Provider</span>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3 uppercase">Panta LP</h2>
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <div className="w-5 h-5 rounded-full bg-[#222] border-2 border-[#0E0E0E] flex items-center justify-center text-[8px] font-black text-white shadow-sm italic font-serif">U</div>
              <div className="w-5 h-5 rounded-full bg-[#111] border-2 border-[#0E0E0E] flex items-center justify-center text-[8px] font-black text-white shadow-sm italic font-serif">E</div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Multi-asset liquidity pool</span>
          </div>
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
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36 border-gradient">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Annual Yield</span>
          <p className="text-4xl font-black text-[#64748b] tabular-nums">
            {stats?.plpApr || '0'}%
          </p>
        </div>
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Pool TVL</span>
          <p className="text-4xl font-black text-white tabular-nums">
            <span className="text-lg align-top mr-1 opacity-20">$</span>
            {stats ? parseFloat(stats.tvl).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex p-2 rounded-[24px] bg-[#080808] border border-[#151515] h-16">
          {(['buy', 'sell'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center text-[12px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
                mode === m
                  ? 'bg-[#1A1A1A] text-white shadow-lg scale-[1.02]'
                  : 'text-[#444] hover:text-[#777]'
              }`}
            >
              {m === 'buy' ? 'Add Liquidity' : 'Remove Liquidity'}
            </button>
          ))}
        </div>

        <div className="relative p-8 rounded-[24px] bg-[#080808] border border-[#151515]">
          <TokenInput
            label={mode === 'buy' ? 'Invest USDC' : 'Redeem PLP'}
            value={amount}
            onChange={setAmount}
            symbol={mode === 'buy' ? 'USDC' : 'PLP'}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount || !address || isLoading}
          className="w-full h-20 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-widest hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/btn"
        >
          {isLoading ? 'Processing...' : (
             <div className="flex items-center gap-3">
              <span>{mode === 'buy' ? 'MINT PLP' : 'BURN PLP'}</span>
              <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
