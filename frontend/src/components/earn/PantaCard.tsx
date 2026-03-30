'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useStakingInfo, useStake, useUnstake, useBuyPANTA } from '@/hooks/useStakingInfo'
import { getPANTABalance } from '@/lib/fcl'
import { TokenInput } from '@/components/shared/TokenInput'

type Mode = 'buy' | 'stake' | 'unstake'

export function PantaCard({ isSimple }: { isSimple?: boolean }) {
  const { user, isConnected, connect } = useFlowNetwork()
  const [mode, setMode] = useState<Mode>('buy')
  const [amount, setAmount] = useState('')

  const { data: stakingInfo } = useStakingInfo()
  const { mutate: stake, isPending: isStaking } = useStake()
  const { mutate: unstake, isPending: isUnstaking } = useUnstake()
  const { mutate: buyPANTA, isPending: isBuying, isSuccess: isBought, error: buyError } = useBuyPANTA()

  const { data: walletPanta = 0 } = useQuery({
    queryKey: ['balance', 'panta', user.addr],
    queryFn: () => getPANTABalance(user.addr!),
    enabled: isConnected && !!user.addr,
    refetchInterval: 10_000,
  })

  const pantaInfo = stakingInfo?.panta ?? { stakedAmount: 0, pendingRewards: 0 }
  const isLoading = isStaking || isUnstaking || isBuying

  // Buy: 100 USDC = 1 PANTA
  const PANTA_RATE = 100
  const pantaOut = mode === 'buy' ? (parseFloat(amount) || 0) / PANTA_RATE : 0

  function handleSubmit() {
    if (!amount || !user.addr) return
    const amt = parseFloat(amount)
    if (mode === 'buy') {
      buyPANTA(amt, { onSuccess: () => setAmount('') })
    } else if (mode === 'stake') {
      stake({ tokenType: 'PANTA', amount: amt }, { onSuccess: () => setAmount('') })
    } else {
      unstake('PANTA', { onSuccess: () => setAmount('') })
    }
  }

  if (isSimple) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
          {(['buy', 'stake', 'unstake'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setAmount('') }}
              className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all duration-200 uppercase ${
                mode === m ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm' : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[10px] text-[#555] font-black uppercase tracking-widest mb-1">Staked</span>
            <span className="block text-[16px] text-white font-bold tabular-nums">{pantaInfo.stakedAmount.toFixed(4)}</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
            <span className="block text-[10px] text-[#555] font-black uppercase tracking-widest mb-1">Rewards</span>
            <span className="block text-[16px] text-[var(--green)] font-bold tabular-nums">{pantaInfo.pendingRewards.toFixed(4)}</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#222]">
          {mode === 'stake' && isConnected && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-[#444] uppercase tracking-widest">Wallet</span>
              <button
                onClick={() => setAmount(walletPanta.toFixed(8))}
                className="text-[11px] text-[#666] hover:text-white transition-colors font-mono"
              >
                {walletPanta.toFixed(4)} PANTA
              </button>
            </div>
          )}
          <TokenInput
            label={mode === 'buy' ? 'Pay USDC' : mode === 'stake' ? 'Stake PANTA' : 'Unstake PANTA'}
            value={amount}
            onChange={setAmount}
            symbol={mode === 'buy' ? 'USDC' : 'PANTA'}
          />
          {mode === 'buy' && parseFloat(amount) > 0 && (
            <p className="mt-2 text-[11px] text-[#555]">
              You receive: <span className="text-white font-bold">{pantaOut.toFixed(4)} PANTA</span>
              <span className="ml-2 text-[#333]">(rate: 100 USDC = 1 PANTA)</span>
            </p>
          )}
        </div>

        {!isConnected ? (
          <button onClick={connect} className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#222] hover:border-[#444] text-[13px] font-black text-[#AAA] uppercase tracking-widest transition-all">
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!amount || isLoading}
            className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#222] hover:border-[#444] text-[13px] font-black text-[#AAA] uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            {isLoading ? 'PROCESSING...' : mode === 'buy' ? 'Buy PANTA' : mode === 'stake' ? 'Stake' : 'Unstake'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500 opacity-[0.02] blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#333] mb-4 block">Governance Token</span>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3 uppercase">Panta Token</h2>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-[#444] uppercase tracking-[0.2em] mb-2">Total Staked</span>
          <p className="text-5xl font-black text-white tabular-nums tracking-tighter">
            {Math.floor(pantaInfo.stakedAmount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Staked</span>
          <p className="text-4xl font-black text-[var(--accent)] tabular-nums">{pantaInfo.stakedAmount.toFixed(2)}</p>
        </div>
        <div className="p-8 rounded-[24px] bg-[#080808] border border-[#151515] flex flex-col justify-between h-36">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#444]">Pending Rewards</span>
          <p className="text-4xl font-black text-[var(--green)] tabular-nums">{pantaInfo.pendingRewards.toFixed(4)}</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex p-2 rounded-[24px] bg-[#080808] border border-[#151515] h-16">
          {(['buy', 'stake', 'unstake'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setAmount('') }}
              className={`flex-1 flex items-center justify-center text-[12px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
                mode === m ? 'bg-[#1A1A1A] text-white shadow-lg scale-[1.02]' : 'text-[#444] hover:text-[#777]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative p-8 rounded-[24px] bg-[#080808] border border-[#151515]">
          <TokenInput
            label={mode === 'buy' ? 'Pay USDC' : mode === 'stake' ? 'Stake PANTA' : 'Unstake PANTA'}
            value={amount}
            onChange={setAmount}
            symbol={mode === 'buy' ? 'USDC' : 'PANTA'}
          />
          {mode === 'buy' && parseFloat(amount) > 0 && (
            <div className="mt-4 flex items-center justify-between text-[12px]">
              <span className="text-[#444]">You receive</span>
              <span className="text-white font-bold">{pantaOut.toFixed(4)} PANTA</span>
            </div>
          )}
          {mode === 'buy' && (
            <p className="mt-2 text-[11px] text-[#333]">Rate: 100 USDC = 1 PANTA</p>
          )}
        </div>

        {isBought && mode === 'buy' && (
          <p className="text-[12px] text-[var(--green)] font-bold text-center">PANTA sent to your wallet!</p>
        )}
        {buyError && mode === 'buy' && (
          <p className="text-[12px] text-[var(--red)] font-bold text-center">
            {(buyError as Error).message?.slice(0, 80)}
          </p>
        )}

        {!isConnected ? (
          <button
            onClick={connect}
            className="w-full h-20 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-widest hover:bg-[#222] hover:text-white transition-all"
          >
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!amount || isLoading}
            className="w-full h-20 flex items-center justify-center rounded-[24px] bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-widest hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/btn"
          >
            {isBuying ? 'Setting up & minting...' : isLoading ? 'Processing...' : (
              <div className="flex items-center gap-3">
                <span>{mode === 'buy' ? 'BUY PANTA' : mode === 'stake' ? 'STAKE PANTA' : 'UNSTAKE PANTA'}</span>
                <svg className="group-hover/btn:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
