const HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest"
const ETH_FEED_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
const BTC_FEED_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"

interface HermesResponse {
  binary: {
    encoding: "hex"
    data: string[]
  }
  parsed: Array<{
    id: string
    price: {
      price: string
      conf: string
      expo: number
      publish_time: number
    }
    ema_price: {
      price: string
      conf: string
      expo: number
      publish_time: number
    }
  }>
}

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

const state: Record<string, TokenPriceState> = {
  ETH: {
    currentPrice: 0,
    candles: { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] },
    currentCandle: { '1m': null, '5m': null, '15m': null, '1h': null, '4h': null, '1d': null },
  },
  BTC: {
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

function normalizePythPrice(priceStr: string, expo: number): number {
  return parseInt(priceStr) * Math.pow(10, expo)
}

export async function pollPrices() {
  try {
    const url = `${HERMES_URL}?ids[]=${ETH_FEED_ID}&ids[]=${BTC_FEED_ID}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Hermes API error: ${response.status} ${response.statusText}`)
    }

    const data: HermesResponse = await response.json()
    const now = Math.floor(Date.now() / 1000)

    for (const parsed of data.parsed) {
      const id = parsed.id.replace(/^0x/, '')
      const ethId = ETH_FEED_ID.replace(/^0x/, '')
      const btcId = BTC_FEED_ID.replace(/^0x/, '')

      const price = normalizePythPrice(parsed.price.price, parsed.price.expo)

      if (price <= 0) continue

      if (id === ethId) {
        state.ETH.currentPrice = price
        updateCandle('ETH', price, now)
      } else if (id === btcId) {
        state.BTC.currentPrice = price
        updateCandle('BTC', price, now)
      }
    }
  } catch (err) {
    // Keep previous cached prices on error
    console.error('[priceService] Failed to fetch Pyth Hermes prices:', err)
  }
}

export function getCurrentPrices(): { ETH: string; BTC: string } {
  return {
    ETH: state.ETH.currentPrice > 0 ? state.ETH.currentPrice.toFixed(2) : '0',
    BTC: state.BTC.currentPrice > 0 ? state.BTC.currentPrice.toFixed(2) : '0',
  }
}

export function getPriceHistory(token: string, interval: Interval, limit: number): OHLCVCandle[] {
  const tokenState = state[token]
  if (!tokenState) return []

  const closed = tokenState.candles[interval]
  const current = tokenState.currentCandle[interval]
  const all = current ? [...closed, current] : closed

  return all.slice(-limit)
}

const BINANCE_SYMBOLS: Record<string, string> = {
  ETH: 'ETHUSDT',
  BTC: 'BTCUSDT',
}

async function seedHistoricalCandles(token: string, interval: Interval, limit = 500) {
  const symbol = BINANCE_SYMBOLS[token]
  if (!symbol) return
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`)
    const rows: [number, string, string, string, string, string][] = await res.json()
    const tokenState = state[token]
    if (!tokenState) return
    const mapped = rows.map((row) => ({
      time: Math.floor(row[0] / 1000),
      open: parseFloat(row[1]),
      high: parseFloat(row[2]),
      low: parseFloat(row[3]),
      close: parseFloat(row[4]),
      volume: parseFloat(row[5]),
    }))
    // Last row from Binance is the currently open (unclosed) candle — put it in currentCandle to avoid duplicates
    tokenState.candles[interval] = mapped.slice(0, -1)
    tokenState.currentCandle[interval] = mapped[mapped.length - 1] ?? null
    console.log(`[priceService] Seeded ${tokenState.candles[interval].length} ${interval} candles for ${token}`)
  } catch (err) {
    console.error(`[priceService] Failed to seed ${interval} candles for ${token}:`, err)
  }
}

async function seedAllHistoricalData() {
  const intervals: Interval[] = ['1m', '5m', '1h', '1d']
  const tokens = ['ETH', 'BTC']
  await Promise.all(tokens.flatMap((t) => intervals.map((iv) => seedHistoricalCandles(t, iv))))
}

export function startPricePolling() {
  // Seed historical candles first, then start live polling
  seedAllHistoricalData().then(() => {
    pollPrices()
    setInterval(pollPrices, 3_000)
  })
}
