'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useWalletDrawer } from './WalletDrawerContext'

interface SidebarItem {
  href?: string
  icon: React.ReactNode
  label: string
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  )
}

const NAV_ITEMS: SidebarItem[] = [
  { href: '/trade', icon: <ChartIcon />, label: 'Trade' },
  { href: '/earn', icon: <UsersIcon />, label: 'Earn' },
  { href: '/leaderboard', icon: <TrophyIcon />, label: 'Leaderboard' },
]

function SidebarButton({ item, isActive }: { item: SidebarItem; isActive: boolean }) {
  const cls = `group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
    isActive
      ? 'text-white bg-[#222] border border-[#333]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[#111]'
  }`

  const tooltip = (
    <span className="pointer-events-none absolute left-full ml-3 px-2 py-1.5 rounded-md bg-[var(--surface-3)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xl border border-[var(--border-subtle)]">
      {item.label}
    </span>
  )

  if (item.href) {
    return (
      <Link href={item.href} className="flex items-center justify-center w-full px-2">
        <div className={cls}>
          {item.icon}
          {tooltip}
        </div>
      </Link>
    )
  }

  return (
    <button className="flex items-center justify-center w-full px-2">
      <div className={cls}>
        {item.icon}
        {tooltip}
      </div>
    </button>
  )
}

function WalletButton({ onConnectedClick }: { onConnectedClick: () => void }) {
  const { user, isConnected, connect } = useFlowNetwork()

  if (isConnected && user.addr) {
    return (
      <div className="group relative flex px-2 w-full justify-center">
        <button
          onClick={onConnectedClick}
          className="relative flex flex-col items-center gap-1.5 w-11 group/btn"
        >
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-black text-[var(--accent)] bg-[#111] border border-[#2a2a2a] group-hover/btn:border-[var(--accent)] group-hover/btn:scale-105 transition-all duration-200">
            {user.addr.slice(2, 4).toUpperCase()}
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--green)] border-2 border-[#080808] shadow-[0_0_6px_var(--green)]" />
        </button>
        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xl border border-[var(--border-subtle)]">
          {`${user.addr.slice(0, 4)}..${user.addr.slice(-3)}`}
        </span>
      </div>
    )
  }

  return (
    <div className="group relative flex px-2 w-full justify-center">
      <button
        onClick={connect}
        className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#111] border border-[#2a2a2a] text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[#151515] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <WalletIcon />
      </button>
      <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[var(--surface-3)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xl border border-[var(--border-subtle)]">
        Connect Wallet
      </span>
    </div>
  )
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

export function Sidebar({ animateIn = false }: { animateIn?: boolean }) {
  const pathname = usePathname()
  const { toggle } = useWalletDrawer()

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={animateIn ? { x: 0, opacity: 1 } : { x: -80, opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col items-center py-6 gap-6 bg-[#080808] border-r border-[#151515]"
      style={{ width: 'var(--sidebar-width, 68px)' }}
    >
      <div className="mb-4">
        <Link href="/">
          <motion.img
            src="/logo.svg"
            alt="Panta"
            width={36}
            height={36}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
          />
        </Link>
      </div>

      <div className="flex flex-col w-full gap-3">
        {NAV_ITEMS.map((item, i) => (
          <SidebarButton key={i} item={item} isActive={pathname === item.href} />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center w-full gap-6 pb-2">
        <div className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#111] border border-[#222] transition-all hover:border-[var(--green-muted)] cursor-help">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] shadow-[0_0_12px_var(--green)]" />
          <span className="pointer-events-none absolute left-full ml-3 px-2 py-1.5 rounded-md bg-[var(--surface-3)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-xl border border-[var(--border-subtle)]">
            Flow Testnet
          </span>
        </div>
        <WalletButton onConnectedClick={toggle} />
      </div>
    </motion.aside>
  )
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

export function BottomNav({ animateIn = false }: { animateIn?: boolean }) {
  const pathname = usePathname()
  const { user, isConnected, connect } = useFlowNetwork()
  const { toggle } = useWalletDrawer()

  if (pathname === '/') return null

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={animateIn ? { y: 0, opacity: 1 } : { y: 80, opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around px-2 bg-[#080808] border-t border-[#151515]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href!}
            className={`flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition-all duration-200 ${
              isActive ? 'text-white' : 'text-[#444]'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}

      {isConnected && user.addr ? (
        <button
          onClick={toggle}
          className="flex flex-col items-center gap-1 px-5 py-1 rounded-xl text-[var(--accent)] relative"
        >
          <div className="relative">
            <div className="w-5 h-5 flex items-center justify-center text-[11px] font-black">
              {user.addr.slice(2, 4).toUpperCase()}
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green)]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Wallet</span>
        </button>
      ) : (
        <button
          onClick={connect}
          className="flex flex-col items-center gap-1 px-5 py-1 rounded-xl text-[#444]"
        >
          <WalletIcon />
          <span className="text-[10px] font-bold uppercase tracking-wider">Connect</span>
        </button>
      )}
    </motion.nav>
  )
}
