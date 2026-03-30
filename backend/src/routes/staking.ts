import { Router } from "express"
import { sendTx, fcl } from "../services/flowTxService"
import { readFileSync } from "fs"
import { join } from "path"

const router = Router()
const CADENCE_DIR = join(__dirname, "../cadence")

function loadTx(path: string): string {
  return readFileSync(join(CADENCE_DIR, path), "utf8")
}

const PANTA_RATE = 100 // 100 USDC = 1 PANTA

// POST /api/panta/buy
// Body: { account, usdcAmount }
router.post("/panta/buy", async (req, res) => {
  const { account, usdcAmount } = req.body
  if (!account || usdcAmount == null) return res.status(400).json({ error: "account and usdcAmount required" })

  const pantaAmount = parseFloat(usdcAmount) / PANTA_RATE
  if (pantaAmount <= 0) return res.status(400).json({ error: "Amount too low" })

  try {
    const cadence = loadTx("panta/mintPANTAForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: pantaAmount.toFixed(8), type: (t: any) => t.UFix64 },
    ])
    res.json({ success: true, txId, pantaAmount, rate: PANTA_RATE })
  } catch (err: any) {
    console.error("[panta] buy error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// POST /api/staking/stake
// Body: { account, tokenType, amount }
router.post("/staking/stake", async (req, res) => {
  const { account, tokenType, amount } = req.body
  if (!account || !tokenType || amount == null) return res.status(400).json({ error: "Missing fields" })

  try {
    const cadence = loadTx("staking/stakeForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: tokenType, type: (t: any) => t.String },
      { value: parseFloat(amount).toFixed(8), type: (t: any) => t.UFix64 },
    ])
    res.json({ success: true, txId })
  } catch (err: any) {
    console.error("[staking] stake error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// POST /api/staking/unstake
// Body: { account, tokenType }
router.post("/staking/unstake", async (req, res) => {
  const { account, tokenType } = req.body
  if (!account || !tokenType) return res.status(400).json({ error: "Missing fields" })

  try {
    const cadence = loadTx("staking/unstakeForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: tokenType, type: (t: any) => t.String },
    ])
    res.json({ success: true, txId })
  } catch (err: any) {
    console.error("[staking] unstake error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// POST /api/staking/claim
// Body: { account, tokenType }
router.post("/staking/claim", async (req, res) => {
  const { account, tokenType } = req.body
  if (!account || !tokenType) return res.status(400).json({ error: "Missing fields" })

  try {
    const cadence = loadTx("staking/claimRewardsForUser.cdc")
    const txId = await sendTx(cadence, [
      { value: account, type: (t: any) => t.Address },
      { value: tokenType, type: (t: any) => t.String },
    ])
    res.json({ success: true, txId })
  } catch (err: any) {
    console.error("[staking] claim error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

// GET /api/staking/info?account=0x...
router.get("/staking/info", async (req, res) => {
  const { account } = req.query
  if (!account) return res.status(400).json({ error: "account required" })

  try {
    const script = `
      import StakingRewards from 0xPANTA
      access(all) fun main(account: Address): {String: UFix64} {
        let panta = StakingRewards.getStakeRecord(account: account, tokenType: "PANTA")
        let plp = StakingRewards.getStakeRecord(account: account, tokenType: "PLP")
        return {
          "pantaStaked": panta?.stakedAmount ?? 0.0,
          "plpStaked": plp?.stakedAmount ?? 0.0,
          "pantaPending": StakingRewards.calculatePendingRewards(account: account, tokenType: "PANTA"),
          "plpPending": StakingRewards.calculatePendingRewards(account: account, tokenType: "PLP"),
          "totalPantaStaked": StakingRewards.getTotalStaked(tokenType: "PANTA"),
          "totalPlpStaked": StakingRewards.getTotalStaked(tokenType: "PLP")
        }
      }
    `
    const PANTA = `0x${process.env.FLOW_DEPLOYER_ADDRESS?.replace("0x","")}`
    const result = await (fcl as any).query({
      cadence: script.replaceAll("0xPANTA", PANTA),
      args: (arg: any, t: any) => [arg(account as string, t.Address)],
    })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

export default router
