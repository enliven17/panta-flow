import { Router } from "express"
import { sendTx, fcl, PANTA } from "../services/flowTxService"
import { readFileSync } from "fs"
import { join } from "path"

const router = Router()

const CADENCE_DIR = join(__dirname, "../cadence")

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
    const txId = await sendTx(cadence, [
      { value: address, type: (t: any) => t.Address },
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
    if (msg.includes("no MockUSDC vault") || msg.includes("Recipient has no MockUSDC vault")) {
      return res.status(400).json({ error: "needsSetup" })
    }
    console.error("[faucet] claim error:", err)
    res.status(500).json({ error: msg })
  }
})

// GET /api/faucet/status?address=0x...
router.get("/faucet/status", async (req, res) => {
  const { address } = req.query
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "address required" })
  }

  try {
    // Check cooldown and reserve
    const faucetScript = `
      import MockUSDCFaucet from ${PANTA}
      access(all) fun main(account: Address): {String: UFix64} {
        return {
          "canClaim": MockUSDCFaucet.canClaim(account: account) ? 1.0 : 0.0,
          "cooldownRemaining": MockUSDCFaucet.getRemainingCooldown(account: account),
          "reserveBalance": MockUSDCFaucet.getReserveBalance()
        }
      }
    `

    // Check if user has a balance-readable MockUSDC capability
    // New setup publishes full vault type at /public/mockUSDCBalance
    // Old setup has Receiver-only at VaultPublicPath — needsSetup triggers re-setup
    const vaultScript = `
      import MockUSDC from ${PANTA}
      access(all) fun main(account: Address): Bool {
        return getAccount(account)
          .capabilities.borrow<&MockUSDC.Vault>(/public/mockUSDCBalance) != nil
      }
    `

    const [faucetResult, hasVault] = await Promise.all([
      (fcl as any).query({
        cadence: faucetScript,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      }),
      (fcl as any).query({
        cadence: vaultScript,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      }),
    ])

    const canClaim = parseFloat(faucetResult?.canClaim ?? "0") >= 1.0
    const cooldownRemaining = parseFloat(faucetResult?.cooldownRemaining ?? "0")

    res.json({
      onCooldown: !canClaim,
      secondsUntilClaim: Math.ceil(cooldownRemaining),
      needsSetup: !hasVault,
      reserveBalance: parseFloat(faucetResult?.reserveBalance ?? "0"),
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// POST /api/faucet/refill  (deployer-only, secured by env secret)
router.post("/faucet/refill", async (req, res) => {
  const { secret, amount } = req.body
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" })
  }
  const refillAmount = typeof amount === "number" ? amount : 10_000_000

  try {
    const cadence = loadTx("admin/refillFaucet.cdc")
    const txId = await sendTx(cadence, [
      { value: refillAmount.toFixed(8), type: (t: any) => t.UFix64 },
    ])
    res.json({ success: true, txId, amount: refillAmount })
  } catch (err: any) {
    console.error("[faucet] refill error:", err)
    res.status(500).json({ error: err?.message })
  }
})

// POST /api/admin/seed-pool  (deployer-only)
// Seeds USDC and FLOW pools so traders can open positions
router.post("/admin/seed-pool", async (req, res) => {
  const { secret, usdcAmount, flowAmount, flowPriceUSD } = req.body
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const usdc = typeof usdcAmount === "number" ? usdcAmount : 1_000_000
  const flow = typeof flowAmount === "number" ? flowAmount : 500_000
  const flowPrice = typeof flowPriceUSD === "number" ? flowPriceUSD : 0.03

  try {
    const cadence = loadTx("admin/seedPool.cdc")
    const txId = await sendTx(cadence, [
      { value: usdc.toFixed(8),      type: (t: any) => t.UFix64 },
      { value: flow.toFixed(8),      type: (t: any) => t.UFix64 },
      { value: flowPrice.toFixed(8), type: (t: any) => t.UFix64 },
    ])
    res.json({ success: true, txId, usdcAmount: usdc, flowAmount: flow })
  } catch (err: any) {
    console.error("[admin] seed-pool error:", err)
    res.status(500).json({ error: err?.message })
  }
})

export default router
