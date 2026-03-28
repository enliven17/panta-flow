'use client'

import { useFlowNetwork } from '@/hooks/useFlowNetwork'
import { useQuery } from '@tanstack/react-query'
import { getUSDCBalance, getPANTABalance } from '@/lib/fcl'

export function UserBalances() {
  const { user, isConnected } = useFlowNetwork()

  const { data: usdcBalance = 0 } = useQuery({
    queryKey: ['balance', 'usdc', user.addr],
    queryFn: () => getUSDCBalance(user.addr!),
    enabled: isConnected && !!user.addr,
    refetchInterval: 10_000,
  })

  const { data: pantaBalance = 0 } = useQuery({
    queryKey: ['balance', 'panta', user.addr],
    queryFn: () => getPANTABalance(user.addr!),
    enabled: isConnected && !!user.addr,
    refetchInterval: 10_000,
  })

  if (!isConnected) return null

  const tokens = [
    { name: 'USDC', balance: usdcBalance, decimals: 2 },
    { name: 'PANTA', balance: pantaBalance, decimals: 4 },
  ]

  return (
    <div className="rounded-[32px] border border-[#1A1A1A] bg-[#0E0E0E] p-10 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 blur-[100px] pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-700" />

      <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10">Wallet Portfolio</h3>
      <div className="space-y-4">
        {tokens.map((token) => (
          <div key={token.name} className="flex justify-between items-center bg-[#080808]/50 p-5 rounded-2xl border border-[#151515] hover:border-[#222] transition-colors relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white opacity-20" />
              <span className="text-[11px] font-black text-[#555] uppercase tracking-widest">{token.name}</span>
            </div>
            <span className="text-[15px] font-bold text-white tabular-nums">
              {token.balance === 0 ? '0.00' : token.balance.toFixed(token.decimals)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
