'use client'

import { motion } from 'framer-motion'
import { useFaucetStatus, useClaimFaucet } from '@/hooks/useFaucet'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { setupAccount } from '@/lib/fcl'
import { useState } from 'react'

interface FaucetCardProps {
  symbol?: string
  amount?: string
  isSimple?: boolean
}

function DropIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0 0 14 0C19 9.5 12 2 12 2Z" />
    </svg>
  )
}

function formatCooldown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function FaucetCard({ symbol = 'USDC', amount = '1,000', isSimple }: FaucetCardProps) {
  const { user, isConnected, connect } = useFlowNetwork()
  const { data: status } = useFaucetStatus()
  const { mutate: claim, isPending } = useClaimFaucet()
  const [settingUp, setSettingUp] = useState(false)

  const canClaim = status ? !status.onCooldown : true
  const secondsRemaining = status?.secondsUntilClaim ?? 0

  async function handleClaim() {
    if (!user.addr) return
    if (status?.needsSetup) {
      setSettingUp(true)
      try {
        await setupAccount()
      } finally {
        setSettingUp(false)
      }
    }
    claim()
  }

  const isLoading = isPending || settingUp

  if (isSimple) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--green)] opacity-80">
                <DropIcon />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#555]">Testnet Faucet</span>
            </div>
            <h3 className="text-3xl font-black text-white leading-none tabular-nums tracking-tighter">
              {amount} <span className="text-[#666]">{symbol}</span>
            </h3>
            <p className="text-[11px] text-[#444] mt-1">per claim · 24h cooldown</p>
          </div>
        </div>

        {/* Action */}
        {!isConnected ? (
          <button
            onClick={connect}
            className="w-full h-12 flex items-center justify-center rounded-xl bg-[#111] border border-[#222] text-[10px] font-black uppercase tracking-widest text-[#666] hover:text-white hover:border-[#333] transition-all"
          >
            Connect Wallet
          </button>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#0d1f12] border border-[#1a3320] text-[var(--green)] text-[10px] font-black uppercase tracking-[0.15em] hover:bg-[#112216] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <DropIcon />
            <span>
              {settingUp ? 'Setting up account...' : isPending ? 'Claiming...' : 'Claim Testnet USDC'}
            </span>
          </button>
        ) : (
          <div className="h-12 flex items-center justify-center gap-2 rounded-xl bg-[#0a0a0a] border border-[#151515] text-[#444] text-[11px] font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Next claim in {formatCooldown(secondsRemaining)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group rounded-[28px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden transition-all hover:border-[#222]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--green)] opacity-0 group-hover:opacity-[0.04] blur-[80px] pointer-events-none transition-opacity duration-700" />

      {/* Header */}
      <div className="flex items-start justify-between mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[var(--green)] opacity-70">
              <DropIcon />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444]">Testnet Faucet</span>
          </div>
          <h3 className="text-5xl font-black text-white leading-none tabular-nums tracking-tighter">
            {amount}
          </h3>
          <p className="text-sm font-black uppercase tracking-widest text-[#555] mt-2">
            {symbol} per claim
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-[#0d1f12] border border-[#1a3320] flex items-center justify-center text-[var(--green)] opacity-60 group-hover:opacity-100 transition-opacity">
          <DropIcon />
        </div>
      </div>

      {/* Info pills */}
      <div className="flex items-center gap-2 mb-8 relative z-10">
        <span className="px-3 py-1 rounded-full bg-[#111] border border-[#1e1e1e] text-[10px] text-[#444] font-medium uppercase tracking-wide">
          24h cooldown
        </span>
        <span className="px-3 py-1 rounded-full bg-[#111] border border-[#1e1e1e] text-[10px] text-[#444] font-medium uppercase tracking-wide">
          Flow Testnet
        </span>
      </div>

      {/* Action */}
      <div className="relative z-10">
        {!isConnected ? (
          <button
            onClick={connect}
            className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#2a2a2a] text-[11px] font-black uppercase tracking-widest text-[#666] hover:text-white hover:border-[#444] transition-all"
          >
            Connect Flow Wallet
          </button>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="w-full h-16 flex items-center justify-center gap-3 rounded-2xl bg-[#0d1f12] border border-[#1a3320] text-[var(--green)] font-black text-xs uppercase tracking-[0.15em] hover:bg-[#112216] hover:border-[#22442a] transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <DropIcon />
            <span>
              {settingUp ? 'Setting Up Account...' : isPending ? 'Claiming...' : `Claim ${amount} ${symbol}`}
            </span>
          </button>
        ) : (
          <div className="h-16 flex items-center justify-center gap-2.5 rounded-2xl bg-[#080808] border border-[#151515] text-[#444] font-medium text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Next claim in {formatCooldown(secondsRemaining)}
          </div>
        )}
      </div>
    </div>
  )
}
