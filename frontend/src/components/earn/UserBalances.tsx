'use client'

import { useAccount, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { ADDRESSES } from '@/lib/contracts/addresses'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

export function UserBalances() {
  const { address } = useAccount()
  const isStakingActive = ADDRESSES.RewardRouter !== '0x0000000000000000000000000000000000000000'

  const { data: balanceData } = useReadContracts({
    contracts: [
      { address: ADDRESSES.PANTA, abi: ERC20_ABI, functionName: 'balanceOf', args: [address ?? '0x0'] },
      { address: ADDRESSES.esPANTA, abi: ERC20_ABI, functionName: 'balanceOf', args: [address ?? '0x0'] },
      { address: ADDRESSES.PLP, abi: ERC20_ABI, functionName: 'balanceOf', args: [address ?? '0x0'] },
      { address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: [address ?? '0x0'] },
    ],
    query: {
      enabled: !!address && isStakingActive,
      refetchInterval: 10_000,
    }
  })

  const tokens = [
    { name: 'PANTA', balance: balanceData?.[0]?.result ?? 0n, decimals: 18 },
    { name: 'esPANTA', balance: balanceData?.[1]?.result ?? 0n, decimals: 18 },
    { name: 'PLP', balance: balanceData?.[2]?.result ?? 0n, decimals: 18 },
    { name: 'USDC', balance: balanceData?.[3]?.result ?? 0n, decimals: 6 },
  ]

  if (!isStakingActive) return null

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
              {parseFloat(formatUnits(token.balance, token.decimals)) === 0 
                ? '0.00' 
                : parseFloat(formatUnits(token.balance, token.decimals)).toFixed(token.name === 'USDC' ? 2 : 4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
