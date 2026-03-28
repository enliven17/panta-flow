/// PriceKeeper service
/// Reads live prices from Pyth and writes them to the on-chain PriceFeed contract
/// Runs every 30 seconds (PriceFeed staleness threshold = 30 minutes, so plenty of headroom)

import { sendTx, fcl } from "./flowTxService"
import { getPriceNumber } from "./pythPriceService"

// Cadence transaction: update BTC, ETH, FLOW prices in PriceFeed
const UPDATE_PRICES_TX = `
import PriceFeed from 0xPANTA

transaction(btcPrice: UFix64, ethPrice: UFix64, flowPrice: UFix64) {
    let admin: &PriceFeed.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.admin = signer.storage.borrow<&PriceFeed.Admin>(from: /storage/priceFeedAdmin)
            ?? panic("Could not borrow PriceFeed Admin")
    }

    execute {
        self.admin.updatePrice(symbol: "BTC/USD", price: btcPrice)
        self.admin.updatePrice(symbol: "ETH/USD", price: ethPrice)
        self.admin.updatePrice(symbol: "FLOW/USD", price: flowPrice)
        self.admin.updatePrice(symbol: "USDC/USD", price: 1.0)
    }
}
`

export async function keeperUpdate(): Promise<void> {
  const btc = getPriceNumber("BTC")
  const eth = getPriceNumber("ETH")
  const flow = getPriceNumber("FLOW")

  if (btc <= 0 || eth <= 0 || flow <= 0) {
    console.log("[priceKeeper] Skipping on-chain update — prices not ready yet")
    return
  }

  try {
    const t = fcl.t as any
    const arg = fcl.arg as any
    const txId = await sendTx(UPDATE_PRICES_TX, [
      { value: btc.toFixed(8), type: (t: any) => t.UFix64 },
      { value: eth.toFixed(8), type: (t: any) => t.UFix64 },
      { value: flow.toFixed(8), type: (t: any) => t.UFix64 },
    ])
    console.log(`[priceKeeper] On-chain prices updated. BTC=$${btc.toFixed(2)} ETH=$${eth.toFixed(2)} FLOW=$${flow.toFixed(4)} tx=${txId}`)
  } catch (err) {
    console.error("[priceKeeper] Failed to update on-chain prices:", err)
  }
}

export function startPriceKeeper(): void {
  // Initial update after 5s (wait for Pyth to fetch first prices)
  setTimeout(keeperUpdate, 5_000)
  // Then every 30s
  setInterval(keeperUpdate, 30_000)
}
