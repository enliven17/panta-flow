'use client'

import { createContext, useContext, useState } from 'react'

interface WalletDrawerContextValue {
  open: boolean
  toggle: () => void
  close: () => void
}

const WalletDrawerContext = createContext<WalletDrawerContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
})

export function WalletDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <WalletDrawerContext.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      {children}
    </WalletDrawerContext.Provider>
  )
}

export function useWalletDrawer() {
  return useContext(WalletDrawerContext)
}
