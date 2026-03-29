import { createClient, SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    }
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  }
  return _client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

// ---- Positions ----

export async function upsertPosition(p: {
  account: string
  collateral_token: string
  index_token: string
  is_long: boolean
  size: number
  collateral: number
  average_price: number
  status?: string
}) {
  if (!isSupabaseConfigured()) return
  const db = getSupabase()
  await db.from("positions").upsert(
    { ...p, updated_at: new Date().toISOString() },
    { onConflict: "account,collateral_token,index_token,is_long" }
  )
}

export async function closePositionInDB(account: string, collateralToken: string, indexToken: string, isLong: boolean) {
  if (!isSupabaseConfigured()) return
  await getSupabase()
    .from("positions")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .match({ account, collateral_token: collateralToken, index_token: indexToken, is_long: isLong })
}

export async function getPositionsForAccount(account: string) {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("positions")
    .select("*")
    .eq("account", account)
    .eq("status", "open")
  return data || []
}

export async function getAllOpenPositions() {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("positions")
    .select("*")
    .eq("status", "open")
  return data || []
}

// ---- Trades ----

export async function insertTrade(t: {
  account: string
  collateral_token: string
  index_token: string
  is_long: boolean
  action: string
  size_delta: number
  collateral_delta: number
  price: number
  pnl?: number
  fee?: number
  tx_hash?: string
}) {
  if (!isSupabaseConfigured()) return
  await getSupabase().from("trades").insert(t)
}

export async function getTradesForAccount(account: string, limit = 50) {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("trades")
    .select("*")
    .eq("account", account)
    .order("created_at", { ascending: false })
    .limit(limit)
  return data || []
}

export async function getAllTrades(limit = 100) {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data || []
}

export async function setSLTP(
  account: string,
  collateralToken: string,
  indexToken: string,
  isLong: boolean,
  stopLoss: number | null,
  takeProfit: number | null
) {
  if (!isSupabaseConfigured()) return
  await getSupabase()
    .from("positions")
    .update({
      stop_loss: stopLoss,
      take_profit: takeProfit,
      updated_at: new Date().toISOString(),
    })
    .match({ account, collateral_token: collateralToken, index_token: indexToken, is_long: isLong })
}

export async function getPositionsWithActiveSLTP() {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("positions")
    .select("*")
    .eq("status", "open")
    .or("stop_loss.not.is.null,take_profit.not.is.null")
  return data || []
}

// ---- Leaderboard ----

export async function getLeaderboard(limit = 20) {
  if (!isSupabaseConfigured()) return []
  const { data } = await getSupabase()
    .from("trades")
    .select("account, pnl")
    .order("pnl", { ascending: false })
    .limit(limit)
  return data || []
}
