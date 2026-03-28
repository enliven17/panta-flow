import { Router } from "express"
import { sendTx, fcl } from "../services/flowTxService"
import { readFileSync } from "fs"
import { join } from "path"

const router = Router()

const CADENCE_DIR = join(__dirname, "../../../flow-perpdex/cadence/transactions")

function loadTx(path: string): string {
  return readFileSync(join(CADENCE_DIR, path), "utf8")
}

// POST /api/faucet/claim
// Body: { address: "0x..." }
router.post("/faucet/claim", async (req, res) => {
  const { address } = req.body
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "address required" })
  }

  try {
    const cadence = loadTx("faucet/claimUSDCForRecipient.cdc")
    const t = (fcl as any).t
    const txId = await sendTx(cadence, [
      { value: address, type: (tt: any) => tt.Address },
    ])
    res.json({ success: true, txId, amount: 1000 })
  } catch (err: any) {
    const msg: string = err?.message || String(err)
    if (msg.includes("Cooldown not expired")) {
      return res.status(429).json({ error: "Cooldown active. Try again in 24 hours." })
    }
    if (msg.includes("Insufficient faucet reserve")) {
      return res.status(503).json({ error: "Faucet reserve empty. Contact admin." })
    }
    if (msg.includes("no MockUSDC vault")) {
      return res.status(400).json({ error: "Account not set up. Sign the setupAccount transaction first." })
    }
    console.error("[faucet] claim error:", err)
    res.status(500).json({ error: msg })
  }
})

// GET /api/faucet/status?address=0x...
router.get("/faucet/status", async (req, res) => {
  const { address } = req.query
  if (!address) return res.status(400).json({ error: "address required" })

  try {
    const script = `
      import MockUSDCFaucet from 0xPANTA
      access(all) fun main(account: Address): {String: UFix64} {
        return {
          "canClaim": MockUSDCFaucet.canClaim(account: account) ? 1.0 : 0.0,
          "cooldownRemaining": MockUSDCFaucet.getRemainingCooldown(account: account),
          "reserveBalance": MockUSDCFaucet.getReserveBalance()
        }
      }
    `
    const result = await (fcl as any).query({
      cadence: script.replaceAll("0xPANTA", `0x${process.env.FLOW_DEPLOYER_ADDRESS?.replace("0x","")}`),
      args: (arg: any, t: any) => [arg(address, t.Address)],
    })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

export default router
