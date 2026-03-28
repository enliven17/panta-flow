'use client'

import { motion } from 'framer-motion'
import { usePositions, useClosePosition, Position } from '@/hooks/usePositions'
import { usePrices } from '@/hooks/usePrices'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'

function getMarketLabel(indexToken: string): string {
  const t = indexToken.toUpperCase()
  if (t === 'BTC') return 'BTC/USD'
  if (t === 'ETH') return 'ETH/USD'
  return indexToken + '/USD'
}

function calcPnl(pos: Position, currentPrice: number): number {
  if (!pos.averagePrice || pos.averagePrice === 0) return 0
  const priceDiff = currentPrice - pos.averagePrice
  const pnl = (pos.size / pos.averagePrice) * priceDiff
  return pos.isLong ? pnl : -pnl
}

export function PositionsTable() {
  const { data: positions, isLoading, isError } = usePositions()
  const { data: prices } = usePrices()
  const { mutate: closePos, isPending: isClosing, variables: closingVars } = useClosePosition()

  if (isLoading) return <TableSkeleton rows={2} />

  if (isError) {
    return <div className="text-center py-10 text-[var(--text-ghost)] text-sm">Unable to load positions</div>
  }

  if (!positions || positions.length === 0) {
    return <div className="text-center py-10 text-[var(--text-ghost)] text-sm">No open positions</div>
  }

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
          {positions.map((pos: Position, i: number) => {
            const currentPrice = pos.indexToken === 'BTC'
              ? parseFloat(prices?.BTC ?? '0')
              : parseFloat(prices?.ETH ?? '0')
            const pnl = calcPnl(pos, currentPrice)
            const isThisClosing = isClosing &&
              closingVars?.indexToken === pos.indexToken &&
              closingVars?.isLong === pos.isLong

            return (
              <motion.tr
                key={`${pos.indexToken}-${pos.isLong}-${i}`}
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
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${pos.size.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${pos.collateral.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  ${pos.averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`py-3.5 px-3 text-right font-mono tabular-nums font-medium ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={() => closePos({
                      indexToken: pos.indexToken,
                      collateralDelta: pos.collateral,
                      sizeDelta: pos.size,
                      isLong: pos.isLong,
                    })}
                    disabled={isThisClosing}
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
