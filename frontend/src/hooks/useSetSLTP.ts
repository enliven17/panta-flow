'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function postSLTP(params: {
  account: string
  indexToken: string
  isLong: boolean
  stopLoss: number | null
  takeProfit: number | null
}) {
  const res = await fetch(`${BASE}/sltp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function useSetSLTP() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: postSLTP,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] })
    },
  })
}
