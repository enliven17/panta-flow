/// Pyth Hermes real-time price service
/// Polls BTC/USD, ETH/USD, FLOW/USD every 1 second
/// Hermes REST API: https://hermes.pyth.network/v2/updates/price/latest

const HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest"

// Pyth price feed IDs
const PRICE_IDS: Record<string, string> = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  FLOW: "0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30",
}

export interface OHLCVCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
}
const MAX_CANDLES = 500

interface TokenState {
  price: number
  publishTime: number
  candles: Record<Interval, OHLCVCandle[]>
  current: Record<Interval, OHLCVCandle | null>
}

function makeTokenState(): TokenState {
  return {
    price: 0,
    publishTime: 0,
    candles: { "1m": [], "5m": [], "15m": [], "1h": [], "4h": [], "1d": [] },
    current: { "1m": null, "5m": null, "15m": null, "1h": null, "4h": null, "1d": null },
  }
}

const state: Record<string, TokenState> = {
  BTC: makeTokenState(),
  ETH: makeTokenState(),
  FLOW: makeTokenState(),
}

function parsePythPrice(raw: { price: string; expo: number }): number {
  return parseInt(raw.price, 10) * Math.pow(10, raw.expo)
}

function updateCandle(token: string, price: number, ts: number) {
  const t = state[token]
  if (!t) return
  for (const iv of Object.keys(INTERVAL_SECONDS) as Interval[]) {
    const sec = INTERVAL_SECONDS[iv]
    const bucket = Math.floor(ts / sec) * sec
    const cur = t.current[iv]
    if (!cur || cur.time !== bucket) {
      if (cur) {
        t.candles[iv].push(cur)
        if (t.candles[iv].length > MAX_CANDLES) t.candles[iv].shift()
      }
      t.current[iv] = { time: bucket, open: price, high: price, low: price, close: price, volume: 0 }
    } else {
      cur.high = Math.max(cur.high, price)
      cur.low = Math.min(cur.low, price)
      cur.close = price
    }
  }
}

export async function pollPythPrices(): Promise<void> {
  try {
    const ids = Object.values(PRICE_IDS).map(id => `ids[]=${id}`).join("&")
    const res = await fetch(`${HERMES_URL}?${ids}`)
    if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`)
    const data = await res.json() as { parsed: Array<{ id: string; price: { price: string; expo: number; publish_time: number } }> }

    // Build id→symbol map (strip leading 0x, lowercase)
    const idToSymbol: Record<string, string> = {}
    for (const [sym, id] of Object.entries(PRICE_IDS)) {
      idToSymbol[id.replace("0x", "").toLowerCase()] = sym
    }

    for (const item of data.parsed) {
      const symbol = idToSymbol[item.id.toLowerCase()]
      if (!symbol) continue
      const price = parsePythPrice(item.price)
      if (price <= 0) continue
      state[symbol].price = price
      state[symbol].publishTime = item.price.publish_time
      updateCandle(symbol, price, item.price.publish_time)
    }
  } catch (err) {
    // Keep cached prices on failure
    console.error("[pythPriceService] Hermes poll failed:", err)
  }
}

export function getPrices(): Record<string, string> {
  return {
    BTC: state.BTC.price > 0 ? state.BTC.price.toFixed(2) : "0",
    ETH: state.ETH.price > 0 ? state.ETH.price.toFixed(2) : "0",
    FLOW: state.FLOW.price > 0 ? state.FLOW.price.toFixed(4) : "0",
    USDC: "1.00",
  }
}

export function getPriceNumber(symbol: string): number {
  return state[symbol]?.price ?? 0
}

export function getPriceHistory(token: string, interval: Interval, limit: number): OHLCVCandle[] {
  const t = state[token]
  if (!t) return []
  const closed = t.candles[interval]
  const cur = t.current[interval]
  const all = cur ? [...closed, cur] : closed
  return all.slice(-limit)
}

export function startPythPolling(): void {
  pollPythPrices()
  setInterval(pollPythPrices, 1_000)
}
