'use client'

import { useAccount } from 'wagmi'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { WalletDrawer } from './WalletDrawer'
import { useWalletDrawer } from './WalletDrawerContext'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, close, toggle } = useWalletDrawer()
  const { isConnected } = useAccount()

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
