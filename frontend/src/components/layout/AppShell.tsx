'use client'

import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { Sidebar } from './Sidebar'
import { WalletDrawer } from './WalletDrawer'
import { useWalletDrawer } from './WalletDrawerContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, close } = useWalletDrawer()
  const { isConnected } = useFlowNetwork()

  return (
    <>
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
