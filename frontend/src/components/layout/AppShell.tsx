'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { Sidebar, BottomNav } from './Sidebar'
import { WalletDrawer } from './WalletDrawer'
import { useWalletDrawer } from './WalletDrawerContext'
import { IntroScreen } from './IntroScreen'

const SceneCanvas = dynamic(
  () => import('../landing/SceneCanvas').then((m) => ({ default: m.SceneCanvas })),
  { ssr: false }
)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { open, close } = useWalletDrawer()
  const { isConnected } = useFlowNetwork()
  const [showIntro, setShowIntro] = useState(true)

  function handleIntroComplete() {
    setShowIntro(false)
  }

  const isLanding = pathname === '/'

  return (
    <>
      {isLanding && <SceneCanvas />}
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      <Sidebar animateIn={!showIntro} />
      <motion.div
        className={`flex-1 min-h-screen md:ml-[var(--sidebar-width)]`}
        animate={!showIntro ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* pb-16 on mobile reserves space for bottom nav */}
        <main className="h-[100dvh] md:h-screen overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          {!showIntro && children}
        </main>
      </motion.div>
      <BottomNav animateIn={!showIntro} />
      {isConnected && (
        <WalletDrawer open={open} onClose={close} />
      )}
    </>
  )
}
