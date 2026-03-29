'use client'

import { useEffect, useState } from 'react'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { Sidebar } from './Sidebar'
import { WalletDrawer } from './WalletDrawer'
import { useWalletDrawer } from './WalletDrawerContext'
import { IntroScreen } from './IntroScreen'

const STORAGE_KEY = 'panta_intro_seen'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, close } = useWalletDrawer()
  const { isConnected } = useFlowNetwork()
  // Start true (black overlay) — useEffect immediately hides if already seen
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) {
      setShowIntro(false)
    }
  }, [])

  function handleIntroComplete() {
    sessionStorage.setItem(STORAGE_KEY, '1')
    setShowIntro(false)
  }

  return (
    <>
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      <Sidebar />
      <div className="flex-1 min-h-screen" style={{ marginLeft: 'var(--sidebar-width)' }}>
        <main className="h-screen overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      {isConnected && (
        <WalletDrawer open={open} onClose={close} />
      )}
    </>
  )
}
