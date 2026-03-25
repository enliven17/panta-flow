'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ADDRESSES } from '@/lib/contracts/addresses'

const FAUCET_TOKEN_ABI = [
  {
    name: '_claimedAt',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'DROPLET_INTERVAL',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claimDroplet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: '_isFaucetEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export function useFaucet(tokenAddress: `0x${string}`) {
  const { address } = useAccount()

  const { data: lastClaimedAt } = useReadContract({
    address: tokenAddress,
    abi: FAUCET_TOKEN_ABI,
    functionName: '_claimedAt',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  })

  const { data: isFaucetEnabled } = useReadContract({
    address: tokenAddress,
    abi: FAUCET_TOKEN_ABI,
    functionName: '_isFaucetEnabled',
  })

  const DROPLET_INTERVAL = 8 * 60 * 60 // 8 hours in seconds

  const now = Math.floor(Date.now() / 1000)
  const nextClaimAt = lastClaimedAt ? Number(lastClaimedAt) + DROPLET_INTERVAL : 0
  const canClaim = now >= nextClaimAt
  const secondsUntilClaim = Math.max(0, nextClaimAt - now)

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  function claim() {
    writeContract({
      address: tokenAddress,
      abi: FAUCET_TOKEN_ABI,
      functionName: 'claimDroplet',
    })
  }

  return {
    canClaim: canClaim && !!isFaucetEnabled,
    secondsUntilClaim,
    claim,
    isPending,
    isConfirming,
    isSuccess,
    isFaucetEnabled,
  }
}
