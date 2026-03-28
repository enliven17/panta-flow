'use client'

import { useEffect, useState } from 'react'
import { fcl, FLOW_NETWORK } from '@/lib/config/flow'

interface FlowUser {
  addr: string | null
  loggedIn: boolean | null
}

interface UseFlowNetworkReturn {
  user: FlowUser
  isConnected: boolean
  network: string
  isCorrectNetwork: boolean
  connect: () => void
  disconnect: () => void
}

export function useFlowNetwork(): UseFlowNetworkReturn {
  const [user, setUser] = useState<FlowUser>({ addr: null, loggedIn: null })

  useEffect(() => {
    const unsub = fcl.currentUser.subscribe(setUser)
    return () => unsub()
  }, [])

  const network = FLOW_NETWORK
  const isConnected = user.loggedIn === true
  const isCorrectNetwork = network === "testnet"

  return {
    user,
    isConnected,
    network,
    isCorrectNetwork,
    connect: () => fcl.authenticate(),
    disconnect: () => fcl.unauthenticate(),
  }
}

export function WrongNetworkWarning() {
  const { isConnected, isCorrectNetwork } = useFlowNetwork()

  if (!isConnected || isCorrectNetwork) return null

  return (
    <div
      role="alert"
      style={{
        background: 'rgba(248, 113, 113, 0.12)',
        border: '1px solid rgba(248, 113, 113, 0.30)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#F87171',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      ⚠️ Yanlış ağa bağlısınız. Lütfen Flow Testnet&apos;e geçin.
    </div>
  )
}
