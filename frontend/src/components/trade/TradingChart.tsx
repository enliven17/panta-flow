'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import { usePriceHistory } from '@/hooks/usePrices'

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

interface TradingChartProps {
  token: string
}

const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

export function TradingChart({ token }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [interval, setActiveInterval] = useState<Interval>('5m')
  const lastIntervalRef = useRef<Interval | null>(null)
  const lastTokenRef = useRef<string | null>(null)

  const { data: candles } = usePriceHistory(token, interval)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0A0A0A' },
        textColor: '#555',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.02)' },
        horzLines: { color: 'rgba(255,255,255,0.02)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#333', labelBackgroundColor: '#111' },
        horzLine: { color: '#333', labelBackgroundColor: '#111' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.04)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.04)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      width: containerRef.current.clientWidth,
      height: 480,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#00C076',
      downColor: '#FF3B3B',
      borderUpColor: '#00C076',
      borderDownColor: '#FF3B3B',
      wickUpColor: '#00C076',
      wickDownColor: '#FF3B3B',
    })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0) return

    const deduped = Array.from(
      candles.reduce((map, c) => { map.set(c.time, c); return map }, new Map<number, typeof candles[0]>()).values()
    ).sort((a, b) => a.time - b.time)

    const mapped = deduped.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const intervalChanged = lastIntervalRef.current !== interval
    const tokenChanged = lastTokenRef.current !== token
    lastIntervalRef.current = interval
    lastTokenRef.current = token

    if (intervalChanged || tokenChanged) {
      // Interval or token switched — reset view to fit new data
      seriesRef.current.setData(mapped)
      chartRef.current?.timeScale().fitContent()
      return
    }

    // Same interval & token — preserve user's scroll/zoom position
    const timeScale = chartRef.current?.timeScale()
    const visibleRange = timeScale?.getVisibleLogicalRange()
    seriesRef.current.setData(mapped)
    if (visibleRange) {
      timeScale?.setVisibleLogicalRange(visibleRange)
    }
  }, [candles, interval, token])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-3 bg-[#0A0A0A]">
        <div className="flex items-center gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv}
              onClick={() => setActiveInterval(iv)}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all duration-200 ${
                interval === iv
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'text-[#444] hover:text-[#666]'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full flex-1 relative min-h-[400px]">
        {(!candles || candles.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-[#333] text-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#111] border-t-[#00C076] rounded-full animate-spin" />
              <span className="font-bold tracking-tight">LOADING CHART...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
