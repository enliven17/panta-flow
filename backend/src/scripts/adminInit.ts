/// adminInit.ts
/// One-time initialization script — run ONCE after deployment:
///   npm run init
///
/// 1. Creates Minter resources in deployer's storage
/// 2. Fills faucet reserve with 10,000,000 USDC
///
/// Prerequisites:
///   FLOW_DEPLOYER_ADDRESS and FLOW_PRIVATE_KEY must be set in .env

import { config } from "dotenv"
import { join } from "path"

config({ path: join(__dirname, "../../.env") })

import { sendTx } from "../services/flowTxService"
import { readFileSync } from "fs"

const CADENCE_DIR = join(__dirname, "../../../flow-perpdex/cadence/transactions")

function loadTx(path: string): string {
  return readFileSync(join(CADENCE_DIR, path), "utf8")
}

async function main() {
  console.log("=== Panta Admin Init ===")
  console.log(`Deployer: ${process.env.FLOW_DEPLOYER_ADDRESS}`)

  // Step 1: Setup Minters
  console.log("\n[1/2] Setting up Minter resources...")
  try {
    const txId = await sendTx(loadTx("admin/setupMinters.cdc"), [])
    console.log(`✓ Minters set up. txId=${txId}`)
  } catch (err: any) {
    if (err?.message?.includes("already exists") || err?.message?.includes("path is already")) {
      console.log("✓ Minters already set up (skipped)")
    } else {
      console.error("✗ Failed to set up minters:", err?.message)
      process.exit(1)
    }
  }

  // Step 2: Refill faucet with 10M USDC reserve
  console.log("\n[2/3] Filling faucet reserve (10,000,000 MockUSDC)...")
  try {
    const txId = await sendTx(loadTx("admin/refillFaucet.cdc"), [
      { value: "10000000.00000000", type: (t: any) => t.UFix64 },
    ])
    console.log(`✓ Faucet filled. txId=${txId}`)
  } catch (err: any) {
    console.error("✗ Failed to fill faucet:", err?.message)
    process.exit(1)
  }

  // Step 3: Seed liquidity pools so traders can open positions
  console.log("\n[3/3] Seeding liquidity pools (1,000,000 USDC + 500,000 FLOW)...")
  try {
    const txId = await sendTx(loadTx("admin/seedPool.cdc"), [
      { value: "1000000.00000000", type: (t: any) => t.UFix64 }, // usdcAmount
      { value: "500000.00000000",  type: (t: any) => t.UFix64 }, // flowAmount
      { value: "0.03000000",       type: (t: any) => t.UFix64 }, // flowPriceUSD (will be overridden by live price, just initial seed)
    ])
    console.log(`✓ Pools seeded. txId=${txId}`)
  } catch (err: any) {
    if (err?.message?.includes("already") || err?.message?.includes("exceeded")) {
      console.log("✓ Pool already has liquidity (skipped)")
    } else {
      console.error("✗ Failed to seed pools:", err?.message)
      process.exit(1)
    }
  }

  console.log("\n=== Admin init complete ===")
  console.log("Next: npm run dev (start backend)")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
