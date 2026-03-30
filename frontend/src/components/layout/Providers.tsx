'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/lib/fcl'
import { WalletDrawerProvider } from './WalletDrawerContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchInterval: 10_000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WalletDrawerProvider>
        {children}
      </WalletDrawerProvider>
    </QueryClientProvider>
  )
}
