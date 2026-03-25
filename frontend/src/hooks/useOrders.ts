'use client'

import { useReadContract, useAccount } from 'wagmi'
import { ADDRESSES } from '@/lib/contracts/addresses'

const ORDER_BOOK_READER_ABI = [
  {
    name: 'getIncreaseOrders',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_orderBookAddress', type: 'address' },
      { name: '_account', type: 'address' },
      { name: '_indices', type: 'uint256[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }, { name: '', type: 'address[]' }],
  },
] as const

export function useOrders() {
  const { address } = useAccount()

  return useReadContract({
    address: ADDRESSES.OrderBookReader,
    abi: ORDER_BOOK_READER_ABI,
    functionName: 'getIncreaseOrders',
    args: [
      ADDRESSES.OrderBook,
      address ?? '0x0000000000000000000000000000000000000000',
      [], // empty — fetch all
    ],
    query: { enabled: !!address },
  })
}
