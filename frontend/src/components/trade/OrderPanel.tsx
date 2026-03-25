'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { useTradeForm, Direction } from '@/hooks/useTradeForm'
import { ADDRESSES } from '@/lib/contracts/addresses'
import { usePrices } from '@/hooks/usePrices'

type Market = 'ETH' | 'BTC'

interface OrderPanelProps {
  market: Market
}

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const ROUTER_ABI = [
  {
    name: 'approvedPlugins',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approvePlugin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_plugin', type: 'address' }],
    outputs: [],
  },
] as const

const POSITION_ROUTER_ABI = [
  {
    name: 'createIncreasePosition',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_path', type: 'address[]' },
      { name: '_indexToken', type: 'address' },
      { name: '_amountIn', type: 'uint256' },
      { name: '_minOut', type: 'uint256' },
      { name: '_sizeDelta', type: 'uint256' },
      { name: '_isLong', type: 'bool' },
      { name: '_acceptablePrice', type: 'uint256' },
      { name: '_executionFee', type: 'uint256' },
      { name: '_referralCode', type: 'bytes32' },
      { name: '_callbackTarget', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const

const EXECUTION_FEE = 100000000000000n // 0.0001 ETH
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

const MARGIN_FEE = 0.001 // 0.1% — Vault.marginFeeBasisPoints = 10

function calcLiqPrice(entryPrice: number, leverage: number, isLong: boolean): number {
  if (isLong) {
    return entryPrice * (1 - 1 / leverage + MARGIN_FEE / leverage)
  }
  return entryPrice * (1 + 1 / leverage - MARGIN_FEE / leverage)
}

function validateLeverage(leverage: number): { isValid: boolean; error?: string } {
  if (leverage < 1 || leverage > 10) {
    return { isValid: false, error: 'Maximum leverage is 10x' }
  }
  return { isValid: true }
}

export function OrderPanel({ market }: OrderPanelProps) {
  const { address, isConnected } = useAccount()
  const { data: prices } = usePrices()
  const form = useTradeForm()

  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const leverageFromPointer = useCallback((clientX: number) => {
    if (!sliderTrackRef.current) return
    const rect = sliderTrackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const raw = 1 + pct * 9
    form.setLeverage(Math.round(raw * 10) / 10)
  }, [form])

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) leverageFromPointer(e.clientX) }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [leverageFromPointer])

  const indexToken = market === 'ETH' ? ADDRESSES.ETH : ADDRESSES.BTC
  const currentPrice = market === 'ETH'
    ? (prices?.ETH ? parseFloat(prices.ETH) : 0)
    : (prices?.BTC ? parseFloat(prices.BTC) : 0)

  // USDC allowance check
  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? ZERO_ADDRESS, ADDRESSES.PositionRouter],
    query: { enabled: !!address },
  })

  // Router plugin approval check
  const { data: isPluginApproved } = useReadContract({
    address: ADDRESSES.Router,
    abi: ROUTER_ABI,
    functionName: 'approvedPlugins',
    args: [address ?? ZERO_ADDRESS, ADDRESSES.PositionRouter],
    query: { enabled: !!address },
  })

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  function approvePlugin() {
    writeContract({
      address: ADDRESSES.Router,
      abi: ROUTER_ABI,
      functionName: 'approvePlugin',
      args: [ADDRESSES.PositionRouter],
    })
  }

  async function openPosition() {
    if (!form.isValid || !prices || !address) return

    // USDC has 6 decimals
    const collateralAmount = parseUnits(form.collateral, 6)

    // Approve USDC if allowance is insufficient
    const currentAllowance = allowance ?? 0n
    if (currentAllowance < collateralAmount) {
      writeContract({
        address: ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.PositionRouter, collateralAmount],
      })
      return // User must re-submit after approve confirms
    }

    // path is always [USDC] for both long and short
    const path: `0x${string}`[] = [ADDRESSES.USDC]

    // sizeDelta with 30 decimal precision: collateral * leverage * 10^24
    const sizeDelta = collateralAmount * BigInt(Math.floor(form.leverage)) * 10n ** 24n

    // acceptablePrice with 30 decimal precision
    const priceWith30Dec = BigInt(Math.floor(currentPrice * 1e10)) * BigInt(10 ** 20)
    const acceptablePrice = form.direction === 'long'
      ? (priceWith30Dec * 1005n) / 1000n  // +0.5% slippage for long
      : (priceWith30Dec * 995n) / 1000n   // -0.5% slippage for short

    writeContract({
      address: ADDRESSES.PositionRouter,
      abi: POSITION_ROUTER_ABI,
      functionName: 'createIncreasePosition',
      args: [
        path,
        indexToken,
        collateralAmount,
        0n,
        sizeDelta,
        form.direction === 'long',
        acceptablePrice,
        EXECUTION_FEE,
        ZERO_BYTES32,
        ZERO_ADDRESS,
      ],
      value: EXECUTION_FEE,
    })
  }

  const isLoading = isPending || isConfirming
  const needsApprove = !!address && (allowance ?? 0n) < (form.collateral ? parseUnits(form.collateral, 6) : 0n)

  const leverageValidation = validateLeverage(form.leverage)
  const collateralNum = parseFloat(form.collateral) || 0
  const positionSizeUsd = collateralNum * form.leverage
  const liqPrice = collateralNum > 0 && currentPrice > 0
    ? calcLiqPrice(currentPrice, form.leverage, form.direction === 'long')
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* Long/Short toggle */}
      <div className="flex p-1 rounded-2xl bg-[#080808] border border-[#111]">
        {(['long', 'short'] as Direction[]).map((dir) => (
          <button
            key={dir}
            onClick={() => form.setDirection(dir)}
            className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-200 ${
              form.direction === dir
                ? 'bg-[#1A1A1A] text-white border border-[#222] shadow-sm'
                : 'text-[#444] hover:text-[#666]'
            }`}
          >
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
          </button>
        ))}
      </div>

      {/* Market price and Order type */}
      <div className="flex gap-2">
        <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222]">
          <span className="block text-[12px] text-[#555] font-medium mb-1">Market price</span>
          <span className="block text-[15px] text-white font-bold tabular-nums">
            {currentPrice > 0
              ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </span>
        </div>
        <div className="flex-1 p-4 rounded-2xl bg-[#1A1A1A] border border-[#222] flex items-center justify-between group cursor-pointer">
          <div>
            <span className="block text-[12px] text-[#555] font-medium mb-1">Order type</span>
            <span className="block text-[15px] text-white font-bold">Market</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#666] transition-colors">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Collateral and size section */}
      <div className="relative rounded-2xl bg-[#1A1A1A] border border-[#222] overflow-hidden">
        {/* Collateral */}
        <div className="p-6 border-b border-[#222]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] text-[#555] font-medium">Collateral</span>
          </div>
          <div className="flex items-center justify-between">
            <input
              type="number"
              value={form.collateral}
              onChange={(e) => form.setCollateral(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-bold text-white outline-none placeholder:text-[#333] tabular-nums"
            />
            <span className="text-[14px] font-bold text-[#555] ml-4">USDC</span>
          </div>
        </div>

        {/* Swap icon */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center text-[#444] shadow-2xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 15l-4-4 4-4" /><path d="M3 11h18" /><path d="M17 9l4 4-4 4" />
            </svg>
          </div>
        </div>

        {/* Estimated size */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[12px] text-[#555] font-medium">Estimated size</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`flex-1 text-3xl font-bold tabular-nums ${form.sizeUsd > 0 && currentPrice > 0 ? 'text-white' : 'text-[#333]'}`}>
              {form.sizeUsd > 0 && currentPrice > 0
                ? (form.sizeUsd / currentPrice).toFixed(market === 'BTC' ? 6 : 8)
                : '0.00000000'}
            </span>
            <span className="text-[14px] font-bold text-[#555] ml-4">{market}</span>
          </div>
        </div>
      </div>

      {/* Leverage section */}
      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#222]">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] text-[#555] font-bold">Leverage</span>
          <span className="text-[13px] font-bold text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]">{form.leverage.toFixed(1)}x</span>
        </div>

        <div
          ref={sliderTrackRef}
          className="relative h-2 rounded-full bg-[#222] mb-6 mx-1 cursor-pointer"
          onMouseDown={(e) => { isDragging.current = true; leverageFromPointer(e.clientX) }}
        >
          {/* Fill */}
          <div
            className="h-2 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.2)]"
            style={{ width: `${((form.leverage - 1) / 9) * 100}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-xl pointer-events-none"
            style={{ left: `calc(${((form.leverage - 1) / 9) * 100}% - 10px)` }}
          />
        </div>

        <div className="flex justify-between px-1">
          {[1, 2, 5, 10].map((val) => (
            <button
              key={val}
              onClick={() => form.setLeverage(val)}
              className="group flex flex-col items-center gap-2"
            >
              <div className={`w-[1px] h-2 transition-colors ${form.leverage >= val ? 'bg-white' : 'bg-[#333]'}`} />
              <span className={`text-[10px] font-bold transition-all ${
                Math.round(form.leverage) === val ? 'text-white' : 'text-[#333] group-hover:text-[#555]'
              }`}>
                {val}x
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Slippage */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[12px] text-[#555] font-bold tracking-tight">Slippage:</span>
        <div className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-[12px] text-[#AAA] font-bold">0.5%</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      </div>

      {/* Position info */}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#555] font-bold tracking-tight">Position Size:</span>
          <span className="text-[12px] text-[#AAA] font-bold tabular-nums">
            {positionSizeUsd > 0 ? `$${positionSizeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#555] font-bold tracking-tight">Liq. Price:</span>
          <span className="text-[12px] text-[#AAA] font-bold tabular-nums">
            {liqPrice !== null
              ? `$${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '-'}
          </span>
        </div>
      </div>

      {/* Leverage warning */}
      {!leverageValidation.isValid && (
        <div className="px-1">
          <span className="text-[12px] text-red-400 font-bold">{leverageValidation.error}</span>
        </div>
      )}

      {/* Action Button */}
      {!isConnected ? (
        <button
          onClick={() => {/* wallet connect handled by layout */}}
          className="mt-2 w-full h-[64px] rounded-2xl bg-gradient-to-r from-[#2D60FF] to-[#5A88FF] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(45,96,255,0.3)] hover:shadow-[0_12px_28px_rgba(45,96,255,0.45)] active:scale-[0.98] transition-all relative overflow-hidden"
        >
          Connect Wallet
        </button>
      ) : !isPluginApproved ? (
        <button
          onClick={approvePlugin}
          disabled={isLoading}
          className="mt-2 w-full h-[64px] rounded-2xl bg-gradient-to-r from-[#2D60FF] to-[#5A88FF] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(45,96,255,0.3)] hover:shadow-[0_12px_28px_rgba(45,96,255,0.45)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>APPROVING...</span>
            </div>
          ) : (
            'Enable Trading'
          )}
        </button>
      ) : needsApprove ? (
        <button
          onClick={openPosition}
          disabled={!form.isValid || isLoading || !leverageValidation.isValid}
          className="mt-2 w-full h-[64px] rounded-2xl bg-gradient-to-r from-[#FF8C00] to-[#FFA500] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(255,140,0,0.3)] hover:shadow-[0_12px_28px_rgba(255,140,0,0.45)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>APPROVING...</span>
            </div>
          ) : (
            'Approve USDC'
          )}
        </button>
      ) : (
        <button
          onClick={openPosition}
          disabled={!form.isValid || isLoading || !leverageValidation.isValid}
          className="mt-2 w-full h-[64px] rounded-2xl bg-gradient-to-r from-[#2D60FF] to-[#5A88FF] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(45,96,255,0.3)] hover:shadow-[0_12px_28px_rgba(45,96,255,0.45)] active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-30 disabled:pointer-events-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>SUBMITTING...</span>
            </div>
          ) : (
            `Open ${form.direction.charAt(0).toUpperCase() + form.direction.slice(1)}`
          )}
        </button>
      )}
    </div>
  )
}
