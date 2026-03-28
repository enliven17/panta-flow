/// Backend API client for PantaDEX
/// All state-changing operations go through the backend (deployer signs on-chain txs)

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

async function get(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ─── Prices ──────────────────────────────────────────────────────────────────

export const getPrices = () => get("/prices")

export const getPriceHistory = (token: string, interval: string, limit = 200) =>
  get("/prices/history", { token, interval, limit: String(limit) })

// ─── Faucet ───────────────────────────────────────────────────────────────────

export const claimFaucet = (address: string) =>
  post("/faucet/claim", { address })

export const getFaucetStatus = (address: string) =>
  get("/faucet/status", { address })

// ─── Trading ─────────────────────────────────────────────────────────────────

export const openPosition = (params: {
  account: string
  indexToken: string
  collateralDelta: number
  sizeDelta: number
  isLong: boolean
}) => post("/trade/open", params)

export const closePosition = (params: {
  account: string
  indexToken: string
  collateralDelta: number
  sizeDelta: number
  isLong: boolean
}) => post("/trade/close", params)

export const getPositions = (account: string) =>
  get("/trade/positions", { account })

// ─── Staking / Earn ──────────────────────────────────────────────────────────

export const buyPANTA = (account: string, usdcAmount: number) =>
  post("/panta/buy", { account, usdcAmount })

export const stakeTokens = (account: string, tokenType: string, amount: number) =>
  post("/staking/stake", { account, tokenType, amount })

export const unstakeTokens = (account: string, tokenType: string) =>
  post("/staking/unstake", { account, tokenType })

export const claimStakingRewards = (account: string, tokenType: string) =>
  post("/staking/claim", { account, tokenType })

export const getStakingInfo = (account: string) =>
  get("/staking/info", { account })

// ─── Stats ────────────────────────────────────────────────────────────────────

export const getStats = () => get("/stats")

export const getTradeHistory = (account: string) =>
  get("/trades", { account })
