'use client'

import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useAccount } from 'wagmi'
import { shortenAddress } from '@/lib/utils/format'

interface ConnectButtonProps {
  onConnectedClick?: () => void
  mode?: 'default' | 'compact'
  className?: string
}

export function ConnectButton({ onConnectedClick, mode = 'default', className = '' }: ConnectButtonProps) {
  const { openConnect, openWallet, username } = useInterwovenKit()
  const { address, isConnected } = useAccount()

  if (isConnected && address) {
    const label = username ?? shortenAddress(address)

    return (
      <button
        onClick={onConnectedClick ?? openWallet}
        className={`${className} flex items-center justify-center transition-all duration-200 active:scale-[0.98] ${
          mode === 'compact'
            ? 'w-11 h-11 rounded-xl bg-[#111] border border-[#222] text-[var(--accent)] hover:border-[var(--accent-muted)]'
            : 'px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] text-xs font-mono tabular-nums text-[var(--text-secondary)] hover:border-[var(--accent-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)]'
        }`}
      >
        {mode === 'compact' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        ) : label}
      </button>
    )
  }

  return (
    <button
      onClick={openConnect}
      className={`${className} flex items-center justify-center transition-all duration-200 active:scale-[0.98] ${
        mode === 'compact'
          ? 'w-11 h-11 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-[var(--violet)] text-[var(--bg-deep)] shadow-lg'
          : 'px-4 py-1.5 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--violet)] text-xs font-semibold tracking-wide text-[var(--bg-deep)] hover:shadow-[0_0_16px_var(--accent-glow)]'
      }`}
    >
      {mode === 'compact' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
      ) : 'Connect'}
    </button>
  )
}
