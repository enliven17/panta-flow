'use client'

import { useState } from 'react'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { Sidebar } from './Sidebar'
import { WalletDrawer } from './WalletDrawer'
import { useWalletDrawer } from './WalletDrawerContext'
import { IntroScreen } from './IntroScreen'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, close } = useWalletDrawer()
  const { isConnected } = useFlowNetwork()
  const [showIntro, setShowIntro] = useState(true)

  function handleIntroComplete() {
    setShowIntro(false)
  }

  return (
    <>
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      <Sidebar />
      <div className="flex-1 min-h-screen" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <main className="h-screen overflow-y-auto overflow-x-hidden">
          {/* Mount children only after intro — fresh mount triggers page animations */}
          {!showIntro && children}
        </main>
      </div>
      {isConnected && (
        <WalletDrawer open={open} onClose={close} />
      )}
    </>
  )
}
