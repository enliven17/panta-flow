import { executeScript } from '../config/flow'

// IncrementFi oracle Cadence script for FLOW/USD price
const FLOW_PRICE_SCRIPT = `
import PublicPriceOracle from 0x8232ce4a3aff4e94
access(all) fun main(): UFix64 {
  return PublicPriceOracle.getLatestPrice(symbol: "FLOW/USD")
}
`

export interface OHLCVCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
const INTERVAL_SECONDS: Record<Interval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
}

interface TokenPriceState {
  currentPrice: number
  candles: Record<Interval, OHLCVCandle[]>
  currentCandle: Record<Interval, OHLCVCandle | null>
}

const MAX_CANDLES = 1000

// Cached prices — used as fallback on oracle failure
const cachedPrices: { FLOW: string; USDC: string; ETH: string; BTC: string } = {
  FLOW: '0',
  USDC: '1.00',
  ETH: '0',
  BTC: '0',
}

const state: Record<string, TokenPriceState> = {
  FLOW: {
    currentPrice: 0,
    candles: { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] },
    currentCandle: { '1m': null, '5m': null, '15m': null, '1h': null, '4h': null, '1d': null },
  },
}

function updateCandle(token: string, price: number, timestamp: number) {
  const tokenState = state[token]
  if (!tokenState) return

  for (const interval of Object.keys(INTERVAL_SECONDS) as Interval[]) {
    const intervalSec = INTERVAL_SECONDS[interval]
    const bucketTime = Math.floor(timestamp / intervalSec) * intervalSec
    const current = tokenState.currentCandle[interval]

    if (!current || current.time !== bucketTime) {
      if (current) {
        tokenState.candles[interval].push(current)
        if (tokenState.candles[interval].length > MAX_CANDLES) {
          tokenState.candles[interval].shift()
        }
      }
      tokenState.currentCandle[interval] = {
        time: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
      }
    } else {
      current.high = Math.max(current.high, price)
      current.low = Math.min(current.low, price)
      current.close = price
    }
  }
}

export async function pollPrices() {
  try {
    // Fetch FLOW/USD from IncrementFi oracle via Cadence script
    const flowPriceRaw: string = await executeScript(FLOW_PRICE_SCRIPT)
    const flowPrice = parseFloat(flowPriceRaw)

    if (flowPrice > 0) {
      state.FLOW.currentPrice = flowPrice
      const now = Math.floor(Date.now() / 1000)
      updateCandle('FLOW', flowPrice, now)
      cachedPrices.FLOW = flowPrice.toFixed(4)
    }

    // USDC/USD is always 1.0 (stable)
    cachedPrices.USDC = '1.00'
  } catch (err) {
    // On oracle failure, keep cached prices (fallback)
    console.error('[priceService] Failed to fetch Flow oracle prices:', err)
  }
}

export function getPrices(): { FLOW: string; USDC: string; ETH: string; BTC: string } {
  return { ...cachedPrices }
}

export function getPriceHistory(token: string, interval: Interval, limit: number): OHLCVCandle[] {
  const tokenState = state[token]
  if (!tokenState) return []

  const closed = tokenState.candles[interval]
  const current = tokenState.currentCandle[interval]
  const all = current ? [...closed, current] : closed

  return all.slice(-limit)
}

export function startPricePolling() {
  pollPrices()
  setInterval(pollPrices, 3_000)
}
