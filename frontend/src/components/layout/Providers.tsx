'use client'

import { useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  InterwovenKitProvider,
  injectStyles,
  TESTNET,
} from '@initia/interwovenkit-react'
import interwovenKitStyles from '@initia/interwovenkit-react/styles.js'
import { wagmiConfig } from '@/lib/config/wagmi'
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

  useEffect(() => {
    injectStyles(interwovenKitStyles)
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InterwovenKitProvider
          {...TESTNET}
          defaultChainId="initiation-2"
        >
          <WalletDrawerProvider>
            {children}
          </WalletDrawerProvider>
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
