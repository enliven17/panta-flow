'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { ADDRESSES } from '@/lib/contracts/addresses'
import { TokenInput } from '@/components/shared/TokenInput'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const

const REWARD_ROUTER_ABI = [
  { name: 'stakeGmx', type: 'function', stateMutability: 'nonReentrant', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'unstakeGmx', type: 'function', stateMutability: 'nonReentrant', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'stakeEsGmx', type: 'function', stateMutability: 'nonReentrant', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'unstakeEsGmx', type: 'function', stateMutability: 'nonReentrant', inputs: [{ name: '_amount', type: 'uint256' }], outputs: [] },
  { name: 'claim', type: 'function', stateMutability: 'nonReentrant', inputs: [], outputs: [] },
] as const

const REWARD_TRACKER_ABI = [
  { name: 'stakedAmounts', type: 'function', stateMutability: 'view', inputs: [{ name: '_account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'claimable', type: 'function', stateMutability: 'view', inputs: [{ name: '_account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

type Mode = 'stake' | 'unstake'
type Token = 'PANTA' | 'esPANTA'

export function PantaCard({ isSimple }: { isSimple?: boolean }) {
  const { address } = useAccount()
  const [mode, setMode] = useState<Mode>('stake')
  const [token, setToken] = useState<Token>('PANTA')
  const [amount, setAmount] = useState('')

  const isStakingActive = ADDRESSES.RewardRouter !== '0x0000000000000000000000000000000000000000'

  const tokenAddress = token === 'PANTA' ? ADDRESSES.PANTA : ADDRESSES.esPANTA
  
  // Read Data
  const { data: balance = 0n } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0'],
    query: { enabled: !!address && isStakingActive },
  })

  const { data: stakedAmount = 0n } = useReadContract({
    address: ADDRESSES.stakedPantaTracker,
    abi: REWARD_TRACKER_ABI,
    functionName: 'stakedAmounts',
    args: [address ?? '0x0'],
    query: { enabled: !!address && isStakingActive },
  })

  const { data: allowance = 0n } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0', ADDRESSES.RewardRouter],
    query: { enabled: !!address && isStakingActive },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  function handleSubmit() {
    if (!amount || !address || !isStakingActive) return
    const amountIn = parseUnits(amount, 18)

    if (mode === 'stake') {
      if (allowance < amountIn && token === 'PANTA') {
        writeContract({
          address: ADDRESSES.PANTA,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [ADDRESSES.RewardRouter, amountIn],
        })
        return
      }
      
      writeContract({
        address: ADDRESSES.RewardRouter,
        abi: REWARD_ROUTER_ABI,
        functionName: token === 'PANTA' ? 'stakeGmx' : 'stakeEsGmx',
        args: [amountIn],
      })
    } else {
      writeContract({
        address: ADDRESSES.RewardRouter,
        abi: REWARD_ROUTER_ABI,
        functionName: token === 'PANTA' ? 'unstakeGmx' : 'unstakeEsGmx',
        args: [amountIn],
      })
    }
  }

  const isLoading = isPending || isConfirming
  const needsApprove = mode === 'stake' && token === 'PANTA' && allowance < (amount ? parseUnits(amount, 18) : 0n)
  if (!isStakingActive) return null

  if (isSimple) {
    return (
       <div className="flex flex-col gap-4">
        {/* Stake/Unstake toggle */}
        <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
          {(['stake', 'unstake'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-200 uppercase ${
                mode === m
                  ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm'
                  : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex p-1 rounded-xl bg-[#080808] border border-[#111]">
          {(['PANTA', 'esPANTA'] as Token[]).map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all ${
                token === t ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#222]">
          <TokenInput
            label={mode === 'stake' ? `Stake ${token}` : `Unstake ${token}`}
            value={amount}
            onChange={setAmount}
            symbol={token}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount || !address || isLoading}
          className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#222] hover:border-[#444] text-[13px] font-black text-[#AAA] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? 'PROCESSING...' : mode === 'stake' ? 'Stake' : 'Unstake'}
        </button>

        {isSuccess && (
          <p className="text-[10px] text-[var(--green)] font-bold text-center uppercase tracking-widest">
            {mode === 'stake' ? 'Staked' : 'Unstaked'} Successfully
          </p>
        )}
      </div>
    )
  }

  // Large card style for main area
  return (
    <div className="rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500 opacity-[0.02] blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333] mb-4 block">Governance Token</span>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3 uppercase">Panta Token</h2>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#111] border-2 border-[#222] flex items-center justify-center text-[8px] font-black text-[#666] shadow-sm">P</div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Governance & Staking</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] mb-2">Total Staked</span>
          <p className="text-5xl font-black text-white tabular-nums tracking-tighter">
            {formatUnits(stakedAmount, 18).split('.')[0]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Wallet</span>
          <p className="text-4xl font-black text-white tabular-nums">{parseFloat(formatUnits(balance, 18)).toFixed(2)}</p>
        </div>
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Staked</span>
          <p className="text-4xl font-black text-[var(--accent)] tabular-nums">
            {parseFloat(formatUnits(stakedAmount, 18)).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex p-2 rounded-[24px] bg-[#080808] border border-[#151515] h-16">
          {(['stake', 'unstake'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center text-[12px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
                mode === m
                  ? 'bg-[#1A1A1A] text-white shadow-lg scale-[1.02]'
                  : 'text-[#444] hover:text-[#777]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex p-1.5 rounded-2xl bg-[#080808] border border-[#151515]">
          {(['PANTA', 'esPANTA'] as Token[]).map((t) => (
            <button
              key={t}
              onClick={() => setToken(t)}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                token === t
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative p-8 rounded-[24px] bg-[#080808] border border-[#151515]">
          <TokenInput
            label={mode === 'stake' ? `Stake ${token}` : `Unstake ${token}`}
            value={amount}
            onChange={setAmount}
            symbol={token}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount || !address || isLoading}
          className="w-full h-20 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-widest hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/btn"
        >
          {isLoading ? 'Processing...' : (
             <div className="flex items-center gap-3">
              <span>{needsApprove ? `APPROVE ${token}` : `${mode === 'stake' ? 'STAKE' : 'UNSTAKE'} ${token}`}</span>
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
