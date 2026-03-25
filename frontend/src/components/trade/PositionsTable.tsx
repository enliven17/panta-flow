'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { usePositions } from '@/hooks/usePositions'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { formatPrice } from '@/lib/utils/format'
import { ADDRESSES } from '@/lib/contracts/addresses'

const POSITION_ROUTER_ABI = [
  {
    name: 'createDecreasePosition',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_path', type: 'address[]' },
      { name: '_indexToken', type: 'address' },
      { name: '_collateralDelta', type: 'uint256' },
      { name: '_sizeDelta', type: 'uint256' },
      { name: '_isLong', type: 'bool' },
      { name: '_receiver', type: 'address' },
      { name: '_acceptablePrice', type: 'uint256' },
      { name: '_minOut', type: 'uint256' },
      { name: '_executionFee', type: 'uint256' },
      { name: '_withdrawETH', type: 'bool' },
      { name: '_callbackTarget', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const

const EXECUTION_FEE = 100000000000000n // 0.0001 ETH
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

interface Position {
  collateralToken: `0x${string}`
  indexToken: `0x${string}`
  isLong: boolean
  size: string
  collateral: string
  averagePrice: string
  entryFundingRate: string
  reserveAmount: string
  realisedPnl: string
  lastIncreasedTime: string
  hasProfit: boolean
  delta: string
}

function getMarketLabel(indexToken: string): string {
  const lower = indexToken.toLowerCase()
  if (lower === ADDRESSES.ETH.toLowerCase()) return 'ETH/USD'
  if (lower === ADDRESSES.BTC.toLowerCase()) return 'BTC/USD'
  return 'Unknown'
}

export function PositionsTable() {
  const { address } = useAccount()
  const { data: positions, isLoading, isError } = usePositions()
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })
  const [closingIndex, setClosingIndex] = useState<number | null>(null)

  const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
  const readerNotDeployed = ADDRESSES.Reader.toLowerCase() === ZERO_ADDR

  if (isLoading) return <TableSkeleton rows={2} />

  // Reader not deployed or fetch error → show error message
  if (isError || readerNotDeployed) {
    return (
      <div className="text-center py-10 text-[var(--text-ghost)] text-sm">
        Unable to load data
      </div>
    )
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--text-ghost)] text-sm">
        No open positions
      </div>
    )
  }

  function closePosition(pos: Position, index: number) {
    if (!address) return
    setClosingIndex(index)

    const sizeDelta = BigInt(pos.size)
    const collateralDelta = BigInt(pos.collateral)

    // acceptablePrice: for long use 0 (accept any lower price), for short use max
    const acceptablePrice = pos.isLong ? 0n : BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')

    writeContract({
      address: ADDRESSES.PositionRouter,
      abi: POSITION_ROUTER_ABI,
      functionName: 'createDecreasePosition',
      args: [
        [ADDRESSES.USDC],
        pos.indexToken,
        collateralDelta,
        sizeDelta,
        pos.isLong,
        address,
        acceptablePrice,
        0n,
        EXECUTION_FEE,
        false,
        ZERO_ADDRESS,
      ],
      value: EXECUTION_FEE,
    })
  }

  const isClosing = isPending || isConfirming

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Market</th>
            <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Side</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Size</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Collateral</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Entry</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">PnL</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Action</th>
          </tr>
        </thead>
        <tbody>
          {(positions as Position[]).map((pos, i) => {
            const avgPrice = Number(pos.averagePrice) / 1e30
            const size = Number(pos.size) / 1e30
            const collateral = Number(pos.collateral) / 1e30
            const delta = Number(pos.delta) / 1e30
            const pnlSign = pos.hasProfit ? 1 : -1
            const pnl = delta * pnlSign
            const isThisClosing = closingIndex === i && isClosing

            return (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors duration-150"
              >
                <td className="py-3.5 px-3 font-semibold text-[13px]">{getMarketLabel(pos.indexToken)}</td>
                <td className="py-3.5 px-3">
                  <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-2 py-0.5 rounded-md ${
                    pos.isLong
                      ? 'text-[var(--green)] bg-[var(--green-dim)]'
                      : 'text-[var(--red)] bg-[var(--red-dim)]'
                  }`}>
                    {pos.isLong ? 'Long' : 'Short'}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${size.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${collateral.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">{formatPrice(avgPrice)}</td>
                <td className={`py-3.5 px-3 text-right font-mono tabular-nums font-medium ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={() => closePosition(pos, i)}
                    disabled={isThisClosing || !address}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg bg-[var(--red-dim)] text-[var(--red)] hover:opacity-80 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {isThisClosing ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        Closing
                      </span>
                    ) : 'Close'}
                  </button>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
