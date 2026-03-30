/// PriceKeeper service
/// Reads live prices from Pyth and writes them to the on-chain PriceFeed contract
/// Also monitors SL/TP orders and closes positions when triggered.
/// Runs every 30 seconds (PriceFeed staleness threshold = 30 minutes, so plenty of headroom)

import { sendTx, fcl } from "./flowTxService"
import { getPriceNumber } from "./pythPriceService"
import { getPositionsWithActiveSLTP, closePositionInDB } from "./supabaseService"

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

// Cadence transaction: keeper executes a pending limit order
const EXECUTE_ORDER_TX = `
import OrderBook from 0xPANTA

transaction(orderId: UInt64) {
    prepare(_signer: auth(BorrowValue) &Account) {
        let mgr = getAccount(0xPANTA)
            .capabilities.borrow<&OrderBook.OrderManager>(/public/pantaOrderBook)
            ?? panic("Cannot borrow OrderBook.OrderManager")
        mgr.executeOrder(orderId: orderId)
    }
}
`

async function checkLimitOrders(prices: Record<string, number>): Promise<void> {
  let ordersResult: any
  try {
    const PANTA = `0x${(process.env.FLOW_DEPLOYER_ADDRESS || '').replace('0x', '')}`
    const script = `
      import OrderBook from ${PANTA}
      access(all) fun main(): {UInt64: OrderBook.LimitOrder} {
        let mgr = getAccount(${PANTA})
          .capabilities.borrow<&OrderBook.OrderManager>(/public/pantaOrderBook)
          ?? panic("Cannot borrow OrderBook.OrderManager")
        return mgr.getAllOrders()
      }
    `
    ordersResult = await (fcl as any).query({ cadence: script, args: () => [] })
  } catch {
    return
  }

  for (const [idStr, order] of Object.entries(ordersResult as Record<string, any>)) {
    const currentPrice = prices[order.indexToken as string] ?? 0
    if (currentPrice <= 0) continue

    const limitPrice = parseFloat(order.limitPrice)
    const isLong: boolean = order.isLong
    const triggered = isLong
      ? currentPrice <= limitPrice
      : currentPrice >= limitPrice

    if (!triggered) continue

    const orderId = parseInt(idStr)
    console.log(`[order-keeper] Executing limit order ${orderId} for ${order.account} ${order.indexToken} ${isLong ? 'Long' : 'Short'} limitPrice=$${limitPrice} current=$${currentPrice}`)

    try {
      await sendTx(EXECUTE_ORDER_TX, [
        { value: String(orderId), type: (t: any) => t.UInt64 },
      ])
      console.log(`[order-keeper] Order ${orderId} executed`)
    } catch (err) {
      console.error(`[order-keeper] Failed to execute order ${orderId}:`, err)
    }
  }
}

// Cadence transaction: keeper closes any user's position (deployer-signed)
// Funds go to the user's public USDC receiver capability
const KEEPER_CLOSE_TX = `
import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

transaction(
    account: Address,
    indexToken: String,
    collateralDelta: UFix64,
    sizeDelta: UFix64,
    isLong: Bool
) {
    prepare(_signer: auth(BorrowValue) &Account) {
        let receiver = getAccount(account)
            .capabilities.borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
            ?? panic("Cannot borrow USDC receiver for account")

        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool")

        pool.closePosition(
            account: account,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            receiver: receiver
        )
    }
}
`

async function checkSLTP(): Promise<void> {
  const btc = getPriceNumber("BTC")
  const eth = getPriceNumber("ETH")
  const flow = getPriceNumber("FLOW")
  if (btc <= 0 && eth <= 0 && flow <= 0) return

  const prices: Record<string, number> = { BTC: btc, ETH: eth, FLOW: flow }

  let positions: any[]
  try {
    positions = await getPositionsWithActiveSLTP()
  } catch {
    return
  }

  for (const pos of positions) {
    const currentPrice = prices[pos.index_token as string] ?? 0
    if (currentPrice <= 0) continue

    const sl = pos.stop_loss != null ? parseFloat(pos.stop_loss) : null
    const tp = pos.take_profit != null ? parseFloat(pos.take_profit) : null
    const isLong: boolean = pos.is_long

    let triggered = false
    let reason = ''

    if (sl != null) {
      if (isLong && currentPrice <= sl) { triggered = true; reason = 'SL' }
      if (!isLong && currentPrice >= sl) { triggered = true; reason = 'SL' }
    }
    if (tp != null && !triggered) {
      if (isLong && currentPrice >= tp) { triggered = true; reason = 'TP' }
      if (!isLong && currentPrice <= tp) { triggered = true; reason = 'TP' }
    }

    if (!triggered) continue

    const size = parseFloat(pos.size)
    const collateral = parseFloat(pos.collateral)
    if (size <= 0) continue

    console.log(`[sltp-keeper] ${reason} triggered for ${pos.account} ${pos.index_token} ${isLong ? 'Long' : 'Short'} @ $${currentPrice}`)

    try {
      await sendTx(KEEPER_CLOSE_TX, [
        { value: pos.account, type: (t: any) => t.Address },
        { value: pos.index_token, type: (t: any) => t.String },
        { value: collateral.toFixed(8), type: (t: any) => t.UFix64 },
        { value: size.toFixed(8), type: (t: any) => t.UFix64 },
        { value: isLong, type: (t: any) => t.Bool },
      ])
      await closePositionInDB(pos.account, 'USDC', pos.index_token, isLong)
      console.log(`[sltp-keeper] Position closed (${reason}) for ${pos.account}`)
    } catch (err) {
      console.error(`[sltp-keeper] Failed to close position for ${pos.account}:`, err)
    }
  }
}

export function startPriceKeeper(): void {
  // Initial update after 5s (wait for Pyth to fetch first prices)
  setTimeout(keeperUpdate, 5_000)
  // Then every 30s
  setInterval(keeperUpdate, 30_000)

  // SL/TP keeper — check every 10s
  setInterval(checkSLTP, 10_000)

  // Limit order executor — check every 10s
  setInterval(() => {
    const btc = getPriceNumber("BTC")
    const eth = getPriceNumber("ETH")
    const flow = getPriceNumber("FLOW")
    if (btc > 0 || eth > 0 || flow > 0) {
      checkLimitOrders({ BTC: btc, ETH: eth, FLOW: flow }).catch(() => {})
    }
  }, 10_000)
}
