import { Router } from "express"
import { sendTx, fcl } from "../services/flowTxService"
import { upsertPosition, closePositionInDB, insertTrade } from "../services/supabaseService"
import { getPriceNumber } from "../services/pythPriceService"
import { readFileSync } from "fs"
import { join } from "path"

const router = Router()
const CADENCE_DIR = join(__dirname, "../../../flow-perpdex/cadence/transactions")

function loadTx(path: string): string {
  return readFileSync(join(CADENCE_DIR, path), "utf8")
}

// POST /api/trade/open
// Body: { account, indexToken, collateralDelta, sizeDelta, isLong }
router.post("/trade/open", async (req, res) => {
  const { account, indexToken, collateralDelta, sizeDelta, isLong } = req.body
  if (!account || !indexToken || collateralDelta == null || sizeDelta == null || isLong == null) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const symbol = `${indexToken}/USD`
  const price = getPriceNumber(indexToken)
  if (price <= 0) return res.status(503).json({ error: "Price not available" })

  // For longs: use maxPrice (price + spread); for shorts: minPrice (price - spread)
  const spreadBps = 0.002
  const execPrice = isLong ? price * (1 + spreadBps) : price * (1 - spreadBps)

  try {
    const cadence = loadTx("positions/increasePositionForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: "USDC", type: (t: any) => t.String },
      { value: indexToken, type: (t: any) => t.String },
      { value: parseFloat(collateralDelta).toFixed(8), type: (t: any) => t.UFix64 },
      { value: parseFloat(sizeDelta).toFixed(8), type: (t: any) => t.UFix64 },
      { value: isLong, type: (t: any) => t.Bool },
      { value: execPrice.toFixed(8), type: (t: any) => t.UFix64 },
    ])

    await Promise.all([
      upsertPosition({
        account,
        collateral_token: "USDC",
        index_token: indexToken,
        is_long: isLong,
        size: parseFloat(sizeDelta),
        collateral: parseFloat(collateralDelta),
        average_price: execPrice,
        status: "open",
      }),
      insertTrade({
        account,
        collateral_token: "USDC",
        index_token: indexToken,
        is_long: isLong,
        action: "open",
        size_delta: parseFloat(sizeDelta),
        collateral_delta: parseFloat(collateralDelta),
        price: execPrice,
        tx_hash: txId,
      }),
    ])

    res.json({ success: true, txId, execPrice })
  } catch (err: any) {
    console.error("[trading] open error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// POST /api/trade/close
// Body: { account, indexToken, collateralDelta, sizeDelta, isLong }
router.post("/trade/close", async (req, res) => {
  const { account, indexToken, collateralDelta, sizeDelta, isLong } = req.body
  if (!account || !indexToken || collateralDelta == null || sizeDelta == null || isLong == null) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  const price = getPriceNumber(indexToken)
  if (price <= 0) return res.status(503).json({ error: "Price not available" })

  const spreadBps = 0.002
  // For closing: longs use minPrice, shorts use maxPrice
  const execPrice = isLong ? price * (1 - spreadBps) : price * (1 + spreadBps)

  try {
    const cadence = loadTx("positions/decreasePositionForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: "USDC", type: (t: any) => t.String },
      { value: indexToken, type: (t: any) => t.String },
      { value: parseFloat(collateralDelta).toFixed(8), type: (t: any) => t.UFix64 },
      { value: parseFloat(sizeDelta).toFixed(8), type: (t: any) => t.UFix64 },
      { value: isLong, type: (t: any) => t.Bool },
      { value: execPrice.toFixed(8), type: (t: any) => t.UFix64 },
    ])

    await Promise.all([
      closePositionInDB(account, "USDC", indexToken, isLong),
      insertTrade({
        account,
        collateral_token: "USDC",
        index_token: indexToken,
        is_long: isLong,
        action: "close",
        size_delta: parseFloat(sizeDelta),
        collateral_delta: parseFloat(collateralDelta),
        price: execPrice,
        tx_hash: txId,
      }),
    ])

    res.json({ success: true, txId, execPrice })
  } catch (err: any) {
    console.error("[trading] close error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// GET /api/trade/positions?account=0x...
router.get("/trade/positions", async (req, res) => {
  const { account } = req.query
  if (!account) return res.status(400).json({ error: "account required" })

  try {
    // PositionManager stores positions in a public {String: Position} dict
    // keyed by getPositionKey(account, collateralToken, indexToken, isLong)
    const script = `
      import PositionManager from 0xPANTA
      access(all) fun main(account: Address): [PositionManager.Position?] {
        let tokens = ["BTC", "ETH", "FLOW"]
        var results: [PositionManager.Position?] = []
        for token in tokens {
          let longKey  = PositionManager.getPositionKey(account: account, collateralToken: "USDC", indexToken: token, isLong: true)
          let shortKey = PositionManager.getPositionKey(account: account, collateralToken: "USDC", indexToken: token, isLong: false)
          results.append(PositionManager.getPosition(positionKey: longKey))
          results.append(PositionManager.getPosition(positionKey: shortKey))
        }
        return results
      }
    `
    const PANTA = `0x${process.env.FLOW_DEPLOYER_ADDRESS?.replace("0x","")}`
    const result = await (fcl as any).query({
      cadence: script.replaceAll("0xPANTA", PANTA),
      args: (arg: any, t: any) => [arg(account as string, t.Address)],
    })
    res.json(result)
  } catch (err: any) {
    console.error("[trading] getPositions error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
