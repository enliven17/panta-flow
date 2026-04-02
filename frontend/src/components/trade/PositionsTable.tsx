'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePositions, Position } from '@/hooks/usePositions'
import { useClosePosition } from '@/hooks/useClosePosition'
import { useAddCollateral } from '@/hooks/useAddCollateral'
import { useSetSLTP } from '@/hooks/useSetSLTP'
import { usePrices } from '@/hooks/usePrices'
import { useFlowNetwork } from '@/hooks/useFlowNetwork'
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

type ManagePanel = 'addCollateral' | 'sltp' | null

interface RowManageState {
  panel: ManagePanel
  collateralInput: string
  slInput: string
  tpInput: string
}

const defaultManage = (): RowManageState => ({
  panel: null,
  collateralInput: '',
  slInput: '',
  tpInput: '',
})

/* ─── Centered Modal Shell ───────────────────────────────────────── */
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-[340px] rounded-2xl bg-[#111116] border border-[#1E1E28] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body
  )
}

/* ─── SL/TP Modal ────────────────────────────────────────────────── */
function SLTPModal({
  pos, currentPrice, slVal, tpVal, row, rowKey,
  setRow, setSLTP, isSettingSLTP, user, onClose,
}: any) {
  return (
    <ModalShell onClose={onClose}>
      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-semibold text-white">SL / TP</span>
          <button onClick={onClose} className="text-[#444] hover:text-white transition-colors text-xs">✕</button>
        </div>

        {/* Price context */}
        <div className="flex gap-4 mb-4 px-1">
          <div>
            <span className="block text-[9px] text-[#555] uppercase tracking-wider">Mark</span>
            <span className="text-[12px] font-mono text-white">${currentPrice > 0 ? currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span>
          </div>
          <div>
            <span className="block text-[9px] text-[#555] uppercase tracking-wider">Entry</span>
            <span className="text-[12px] font-mono text-white">${pos.averagePrice > 0 ? pos.averagePrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</span>
          </div>
          <div className="ml-auto text-right">
            <span className="block text-[9px] text-[#555] uppercase tracking-wider">Side</span>
            <span className={`text-[12px] font-semibold ${pos.isLong ? 'text-[#00E68A]' : 'text-[#FF4466]'}`}>{pos.isLong ? 'Long' : 'Short'}</span>
          </div>
        </div>

        {/* Inputs side by side */}
        <div className="flex gap-3 mb-4">
          {/* Stop Loss */}
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-[#666] uppercase tracking-wider mb-1.5">Stop Loss</label>
            <input
              type="number" min="0" step="1"
              placeholder={slVal?.toFixed(0) ?? '—'}
              value={row.slInput}
              onChange={e => setRow(rowKey, { slInput: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1A1A24] text-[13px] font-mono text-white focus:outline-none focus:border-[#333] transition-colors placeholder:text-[#2A2A2A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {currentPrice > 0 && (
              <div className="flex gap-1 mt-1.5">
                {(pos.isLong ? [-2, -5, -10] : [2, 5, 10]).map((pct: number) => (
                  <button key={pct} onClick={() => setRow(rowKey, { slInput: Math.round(currentPrice * (1 + pct / 100)).toString() })}
                    className="flex-1 py-0.5 rounded text-[9px] font-medium text-[#555] hover:text-white hover:bg-[#1A1A24] transition-colors">
                    {pct > 0 ? '+' : ''}{pct}%
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Take Profit */}
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-[#666] uppercase tracking-wider mb-1.5">Take Profit</label>
            <input
              type="number" min="0" step="1"
              placeholder={tpVal?.toFixed(0) ?? '—'}
              value={row.tpInput}
              onChange={e => setRow(rowKey, { tpInput: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1A1A24] text-[13px] font-mono text-white focus:outline-none focus:border-[#333] transition-colors placeholder:text-[#2A2A2A] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {currentPrice > 0 && (
              <div className="flex gap-1 mt-1.5">
                {(pos.isLong ? [2, 5, 10] : [-2, -5, -10]).map((pct: number) => (
                  <button key={pct} onClick={() => setRow(rowKey, { tpInput: Math.round(currentPrice * (1 + pct / 100)).toString() })}
                    className="flex-1 py-0.5 rounded text-[9px] font-medium text-[#555] hover:text-white hover:bg-[#1A1A24] transition-colors">
                    {pct > 0 ? '+' : ''}{pct}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirm */}
        <button
          disabled={(!row.slInput && !row.tpInput) || isSettingSLTP}
          onClick={() => {
            if (!user.addr) return
            setSLTP({
              account: user.addr, indexToken: pos.indexToken, isLong: pos.isLong,
              stopLoss: row.slInput ? parseFloat(row.slInput) : null,
              takeProfit: row.tpInput ? parseFloat(row.tpInput) : null,
            }, { onSuccess: () => setRow(rowKey, { panel: null, slInput: '', tpInput: '' }) })
          }}
          className="w-full py-2.5 text-[12px] font-semibold rounded-lg bg-white text-black hover:bg-[#E8E8E8] active:scale-[0.98] transition-all disabled:opacity-15 disabled:pointer-events-none"
        >
          {isSettingSLTP ? 'Saving…' : 'Confirm'}
        </button>
        {(slVal || tpVal) && (
          <button
            onClick={() => {
              if (!user.addr) return
              setSLTP({ account: user.addr, indexToken: pos.indexToken, isLong: pos.isLong, stopLoss: null, takeProfit: null },
                { onSuccess: () => setRow(rowKey, { panel: null }) })
            }}
            className="w-full mt-1.5 py-1.5 text-[11px] text-[#444] hover:text-[#FF4466] transition-colors"
          >
            Remove all
          </button>
        )}
      </div>
    </ModalShell>
  )
}

/* ─── Add Collateral Modal ───────────────────────────────────────── */
function CollateralModal({
  pos, row, rowKey, setRow, addCollateral, isAdding, onClose,
}: any) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-bold text-white">Add Collateral</h3>
            <p className="text-[11px] text-[#555] mt-0.5">{getMarketLabel(pos.indexToken)} · {pos.isLong ? 'Long' : 'Short'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#222] transition-all text-xs">✕</button>
        </div>

        {/* Input */}
        <div className="relative mb-5">
          <input
            type="number" min="0" step="1" placeholder="0.00"
            value={row.collateralInput}
            onChange={e => setRow(rowKey, { collateralInput: e.target.value })}
            className="w-full pl-4 pr-16 py-3 rounded-xl bg-[#0A0A0F] border border-[#1E1E28] text-[15px] font-mono text-white focus:outline-none focus:border-[#627EEA]/40 transition-all placeholder:text-[#333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#555] pointer-events-none">USDC</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            disabled={!row.collateralInput || isAdding}
            onClick={async () => {
              await addCollateral({ indexToken: pos.indexToken, collateralAmount: parseFloat(row.collateralInput), isLong: pos.isLong })
              setRow(rowKey, { panel: null, collateralInput: '' })
            }}
            className="flex-1 py-2.5 text-[12px] font-bold rounded-xl bg-white text-black hover:bg-[#E0E0E0] active:scale-[0.97] transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            {isAdding ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Adding…
              </span>
            ) : 'Confirm'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-[11px] font-medium rounded-xl text-[#555] hover:text-white hover:bg-[#1A1A25] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ─── Main Component ─────────────────────────────────────────────── */
export function PositionsTable() {
  const { data: positions, isLoading, isError } = usePositions()
  const { data: prices } = usePrices()
  const { closePosition: closePos, isClosing, variables: closingVars } = useClosePosition()
  const { addCollateral, isAdding } = useAddCollateral()
  const { mutate: setSLTP, isPending: isSettingSLTP } = useSetSLTP()
  const { user } = useFlowNetwork()

  const [manageState, setManageState] = useState<Record<string, RowManageState>>({})

  function getRow(key: string): RowManageState {
    return manageState[key] ?? defaultManage()
  }

  function setRow(key: string, patch: Partial<RowManageState>) {
    setManageState(prev => ({ ...prev, [key]: { ...getRow(key), ...patch } }))
  }

  function togglePanel(key: string, panel: ManagePanel) {
    const cur = getRow(key).panel
    setRow(key, { panel: cur === panel ? null : panel })
  }

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
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">SL / TP</th>
            <th className="text-right py-2.5 px-3 font-medium text-[11px] tracking-wide uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos: Position, i: number) => {
            const rowKey = `${pos.indexToken}-${pos.isLong}`
            const row = getRow(rowKey)

            const currentPrice = parseFloat(prices?.[pos.indexToken] ?? '0')
            const pnl = calcPnl(pos, currentPrice)

            const isThisClosing = isClosing &&
              closingVars?.indexToken === pos.indexToken &&
              closingVars?.isLong === pos.isLong

            const slVal = (pos as any).stopLoss as number | undefined
            const tpVal = (pos as any).takeProfit as number | undefined
            const leverage = pos.collateral > 0 ? pos.size / pos.collateral : 0

            return (
              <motion.tr
                key={rowKey}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors duration-150"
              >
                <td className="py-3.5 px-3 font-semibold text-[13px]">{getMarketLabel(pos.indexToken)}</td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center text-[13px] font-medium px-2 py-0.5 rounded-md ${
                      pos.isLong
                        ? 'text-[var(--green)] bg-[var(--green-dim)]'
                        : 'text-[var(--red)] bg-[var(--red-dim)]'
                    }`}>
                      {pos.isLong ? 'Long' : 'Short'}
                    </span>
                    {leverage > 0 && (
                      <span className="text-[11px] font-mono font-medium text-[var(--text-muted)]">
                        {leverage.toFixed(1)}x
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${pos.size.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">${pos.collateral.toFixed(2)}</td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  ${pos.averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`py-3.5 px-3 text-right font-mono tabular-nums font-medium ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </td>

                {/* SL / TP */}
                <td className="py-3.5 px-3 text-right text-[12px] text-[var(--text-muted)] font-mono">
                  <button
                    onClick={() => togglePanel(rowKey, 'sltp')}
                    className="hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {slVal || tpVal
                      ? <span>
                          {slVal ? <span className="text-[var(--red)]">SL ${slVal.toFixed(0)}</span> : '—'}
                          {' / '}
                          {tpVal ? <span className="text-[var(--green)]">TP ${tpVal.toFixed(0)}</span> : '—'}
                        </span>
                      : <span className="opacity-40">Set SL/TP</span>}
                  </button>
                  {/* SL/TP Modal */}
                  <AnimatePresence>
                    {row.panel === 'sltp' && (
                      <SLTPModal
                        pos={pos} currentPrice={currentPrice} slVal={slVal} tpVal={tpVal}
                        row={row} rowKey={rowKey} setRow={setRow} setSLTP={setSLTP}
                        isSettingSLTP={isSettingSLTP} user={user}
                        onClose={() => setRow(rowKey, { panel: null })}
                      />
                    )}
                  </AnimatePresence>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => togglePanel(rowKey, 'addCollateral')}
                      className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:opacity-80 active:scale-95 transition-all"
                    >
                      + Coll
                    </button>
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
                  </div>
                  {/* Add Collateral Modal */}
                  <AnimatePresence>
                    {row.panel === 'addCollateral' && (
                      <CollateralModal
                        pos={pos} row={row} rowKey={rowKey} setRow={setRow}
                        addCollateral={addCollateral} isAdding={isAdding}
                        onClose={() => setRow(rowKey, { panel: null })}
                      />
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
