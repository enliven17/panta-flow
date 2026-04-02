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
  sessionFresh: boolean
  network: string
  isCorrectNetwork: boolean
  connect: () => void
  disconnect: () => void
}

// Module-level: shared across all hook instances, persisted in sessionStorage
// (sessionStorage clears on tab close, so next visit starts fresh = false)
const SESSION_KEY = 'panta_session_fresh'
let _fresh = typeof window !== 'undefined' && !!sessionStorage.getItem(SESSION_KEY)
const _subs = new Set<(v: boolean) => void>()

function setFresh(val: boolean) {
  _fresh = val
  if (val) sessionStorage.setItem(SESSION_KEY, '1')
  else sessionStorage.removeItem(SESSION_KEY)
  _subs.forEach(fn => fn(val))
}

export function useFlowNetwork(): UseFlowNetworkReturn {
  const [user, setUser] = useState<FlowUser>({ addr: null, loggedIn: null })
  const [sessionFresh, setSessionFresh] = useState(_fresh)

  useEffect(() => {
    const unsub = fcl.currentUser.subscribe(setUser)
    const unsubFresh = (v: boolean) => setSessionFresh(v)
    _subs.add(unsubFresh)
    // Sync in case another instance updated it before this one mounted
    setSessionFresh(_fresh)
    return () => {
      unsub()
      _subs.delete(unsubFresh)
    }
  }, [])

  const network = FLOW_NETWORK
  const isConnected = user.loggedIn === true
  const isCorrectNetwork = network === "testnet"

  const connect = () => {
    setFresh(true)
    fcl.authenticate()
  }

  const disconnect = () => {
    setFresh(false)
    fcl.unauthenticate()
  }

  return {
    user,
    isConnected,
    sessionFresh,
    network,
    isCorrectNetwork,
    connect,
    disconnect,
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
