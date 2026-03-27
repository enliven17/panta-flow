'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { useWalletDrawer } from './WalletDrawerContext'

const NAV_LINKS = [
  { href: '/buy', label: 'Buy crypto', active: true },
  { href: '/discover', label: 'Discover' },
  { href: '/trade', label: 'Trade' },
  { href: '/grow', label: 'Grow' },
  { href: '/build', label: 'Build' },
  { href: '/institutional', label: 'Institutional' },
  { href: '/learn', label: 'Learn' },
]

function CexDexToggle() {
  return (
    <div className="inline-flex p-1 rounded-xl bg-[#111] border border-[#222]">
      <button className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-[#222] shadow-lg border border-[#333]">
        CEX
      </button>
      <button className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-[var(--text-muted)] hover:text-white transition-colors">
        DEX
      </button>
    </div>
  )
}

export function Header() {
  const pathname = usePathname()
  const { toggle } = useWalletDrawer()

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-deep)] border-b border-[#151515]">
      <div className="mx-auto px-6 h-[68px] flex items-center justify-between">
        <div className="flex items-center gap-8">
          <CexDexToggle />

          <nav className="hidden xl:flex items-center gap-1">
            <div className="w-[1px] h-4 bg-[#222] mx-2" />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`relative px-4 py-2 text-[14px] font-medium transition-all duration-150 ${
                  link.active
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {link.label}
                {link.active && (
                  <motion.span
                    layoutId="header-active-line"
                    className="absolute -bottom-[21px] left-4 right-4 h-[2px] bg-white rounded-t-full"
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-[#222] text-[12px] text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]" />
            <span className="font-medium">Flow Testnet</span>
          </div>
          <ConnectButton onConnectedClick={toggle} />
        </div>
      </div>
    </header>
  )
}
