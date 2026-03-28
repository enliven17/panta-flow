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

export function FaucetCard({ symbol = 'USDC', amount = '1,000', isSimple }: FaucetCardProps) {
  const { user, isConnected, connect } = useFlowNetwork()
  const { data: status } = useFaucetStatus()
  const { mutate: claim, isPending } = useClaimFaucet()
  const [settingUp, setSettingUp] = useState(false)

  const canClaim = status ? !status.onCooldown : true
  const secondsRemaining = status?.secondsUntilClaim ?? 0

  async function handleClaim() {
    if (!user.addr) return
    // If account not set up, run setup first
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
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#666] mb-2 block">Network Resource</span>
            <h3 className="text-3xl font-black text-white leading-none tabular-nums tracking-tighter">{amount} {symbol}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-[#555] font-black text-sm">
            {symbol[0]}
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          {!isConnected ? (
            <button
              onClick={connect}
              className="w-full h-14 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#333] text-[10px] font-black uppercase tracking-widest text-[#AAA] hover:text-white transition-all"
            >
              Connect Flow Wallet
            </button>
          ) : canClaim ? (
            <button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full h-14 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 group/f"
            >
              {isLoading ? '...' : (
                <div className="flex items-center gap-2">
                  <span>DISPENSE ASSETS</span>
                  <svg className="group-hover/f:translate-x-1 transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
              )}
            </button>
          ) : (
            <div className="h-14 flex items-center justify-center rounded-2xl bg-[#080808] border border-[#151515] text-[11px] text-[#444] font-black">
              Cooldown: {Math.floor(secondsRemaining / 3600)}h {Math.floor((secondsRemaining % 3600) / 60)}m
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-[32px] bg-[#0E0E0E] border border-[#1A1A1A] p-10 md:p-12 shadow-2xl relative overflow-hidden transition-all hover:border-[#222]">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 opacity-0 group-hover:opacity-10 blur-[100px] pointer-events-none transition-opacity duration-700" />

      <div className="flex items-center justify-between mb-10 relative z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444] mb-3 block">Network Resource</span>
          <h3 className="text-5xl font-black text-white leading-none mb-3 tabular-nums tracking-tighter">{amount}</h3>
          <p className="text-[14px] font-black uppercase tracking-widest text-[#666]">{symbol} Tokens per claim</p>
        </div>
        <div className="w-16 h-16 rounded-[24px] bg-[#111] border border-[#222] flex items-center justify-center text-[#444] font-black text-2xl shadow-xl transition-colors group-hover:text-white group-hover:border-[#444]">
          {symbol[0]}
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        {!isConnected ? (
          <button
            onClick={connect}
            className="w-full h-16 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#333] text-[11px] font-black uppercase tracking-widest text-[#AAA] hover:text-white transition-all"
          >
            Connect Flow Wallet
          </button>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isLoading}
            className="w-full h-20 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#333] text-[#AAA] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#222] hover:text-white transition-all disabled:opacity-10 disabled:pointer-events-none group/claim"
          >
            {isLoading ? 'Processing...' : (
              <div className="flex items-center gap-3">
                <span>{settingUp ? 'SETTING UP ACCOUNT...' : `DISPENSE ${symbol}`}</span>
                <svg className="group-hover/claim:translate-x-1 transition-transform" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            )}
          </button>
        ) : (
          <div className="h-20 flex items-center justify-center rounded-2xl bg-[#080808] border border-[#151515] text-[#444] font-black text-sm">
            Cooldown: {Math.floor(secondsRemaining / 3600)}h {Math.floor((secondsRemaining % 3600) / 60)}m
          </div>
        )}
      </div>
    </div>
  )
}
