'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useDisconnect, useBalance, useReadContract } from 'wagmi'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { ADDRESSES } from '@/lib/contracts/addresses'

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const

interface WalletDrawerProps {
  open: boolean
  onClose: () => void
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatBalance(raw: bigint | undefined, decimals: number, displayDecimals = 4): string {
  if (raw === undefined) return '—'
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals)
  return `${whole}.${fracStr}`
}

export function WalletDrawer({ open, onClose }: WalletDrawerProps) {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { username } = useInterwovenKit()

  // Native INIT balance
  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: !!address },
  })

  // USDC balance
  const { data: usdcRaw } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && ADDRESSES.USDC !== '0x0000000000000000000000000000000000000000' },
  })

  function copyAddress() {
    if (address) navigator.clipboard.writeText(address)
  }

  const usdcDisplay = formatBalance(usdcRaw as bigint | undefined, 6, 2)
  const initDisplay = nativeBalance
    ? parseFloat(nativeBalance.formatted).toFixed(4)
    : '—'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-[var(--overlay-bg)] backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            key="drawer"
            initial={{ x: 'calc(100% + 16px)', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 'calc(100% + 16px)', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed z-50 flex flex-col"
            style={{
              right: 16,
              top: 16,
              bottom: 16,
              width: 260,
              background: '#0d0d0d',
              border: '1px solid #1e1e1e',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* Address row */}
            <div className="flex items-center gap-2.5 px-4 py-4">
              <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="text-xs font-mono text-[#888] flex-1 truncate">
                {username ?? (address ? shortenAddr(address) : '—')}
              </span>
              <button
                onClick={copyAddress}
                title="Copy address"
                className="p-1 rounded text-[#444] hover:text-[#888] transition-colors"
              >
                <CopyIcon />
              </button>
              {address && (
                <a
                  href={`https://explorer.evm.testnet.initia.xyz/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-[#444] hover:text-[#888] transition-colors"
                >
                  <ExternalLinkIcon />
                </a>
              )}
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-[#1a1a1a]" />

            {/* Balances */}
            <div className="px-4 py-5 space-y-5">
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-[0.2em] mb-1.5">USDC</p>
                <p className="text-2xl font-bold tabular-nums text-white">
                  {usdcDisplay !== '—' ? `$${usdcDisplay}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-[0.2em] mb-1.5">INIT</p>
                <p className="text-lg font-semibold tabular-nums text-[#666]">
                  {initDisplay}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-[#1a1a1a]" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 px-4 py-4">
              <div className="p-3 rounded-xl bg-[#111] border border-[#1a1a1a]">
                <p className="text-[10px] text-[#444] mb-1.5 uppercase tracking-wide">Trades</p>
                <p className="text-sm font-semibold tabular-nums text-white">0</p>
              </div>
              <div className="p-3 rounded-xl bg-[#111] border border-[#1a1a1a]">
                <p className="text-[10px] text-[#444] mb-1.5 uppercase tracking-wide">Volume</p>
                <p className="text-sm font-semibold tabular-nums text-white">$0.00</p>
              </div>
            </div>

            {/* Network */}
            <div className="px-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111] border border-[#1a1a1a]">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)]" />
                <span className="text-[10px] text-[#555] font-medium">Initia EVM Testnet</span>
              </div>
            </div>

            {/* Disconnect */}
            <div className="mt-auto px-4 py-4">
              <button
                onClick={() => { disconnect(); onClose() }}
                className="w-full py-2 text-xs text-[#444] hover:text-[#cc3333] transition-colors duration-150"
              >
                Disconnect
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
