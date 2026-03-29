'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { Sidebar } from './Sidebar'
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

  return (
    <>
      {pathname === '/' && <SceneCanvas />}
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      <Sidebar animateIn={!showIntro} />
      <motion.div
        className="flex-1 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
        animate={!showIntro ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <main className="h-screen overflow-y-auto overflow-x-hidden">
          {/* Mount children only after intro — fresh mount triggers page animations */}
          {!showIntro && children}
        </main>
      </motion.div>
      {isConnected && (
        <WalletDrawer open={open} onClose={close} />
      )}
    </>
  )
}
