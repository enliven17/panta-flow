import * as fcl from "@onflow/fcl"
import { insertTrade } from './supabaseService'

const DEPLOYER_ADDRESS = (process.env.FLOW_DEPLOYER_ADDRESS || "").replace("0x", "")

const EVENT_OPENED = `A.${DEPLOYER_ADDRESS}.TradingRouter.PositionOpened`
const EVENT_CLOSED = `A.${DEPLOYER_ADDRESS}.TradingRouter.PositionClosed`

// Flow API enforces max 250-block window per event query
const MAX_RANGE = 249

let lastBlockHeight = 0

async function getLatestBlockHeight(): Promise<number> {
  const block = await (fcl as any).send([(fcl as any).getBlock(true)]).then((fcl as any).decode)
  return block.height as number
}

async function getEventsInRange(eventType: string, start: number, end: number): Promise<any[]> {
  const results: any[] = []
  for (let from = start; from <= end; from += MAX_RANGE) {
    const to = Math.min(from + MAX_RANGE - 1, end)
    const chunk = await (fcl as any)
      .send([(fcl as any).getEventsAtBlockHeightRange(eventType, from, to)])
      .then((fcl as any).decode)
    results.push(...(chunk ?? []))
  }
  return results
}

export async function fetchRecentTrades(): Promise<void> {
  try {
    const currentHeight = await getLatestBlockHeight()

    if (lastBlockHeight === 0) {
      // Only look back 500 blocks on first run to avoid huge initial range
      lastBlockHeight = Math.max(0, currentHeight - 500)
    }

    if (currentHeight <= lastBlockHeight) return

    const start = lastBlockHeight + 1
    const end = currentHeight

    const [openedEvents, closedEvents] = await Promise.all([
      getEventsInRange(EVENT_OPENED, start, end),
      getEventsInRange(EVENT_CLOSED, start, end),
    ])

    const allEvents = [...openedEvents, ...closedEvents]
      .sort((a, b) => a.blockHeight - b.blockHeight)

    for (const evt of allEvents) {
      const data = evt.data
      const isOpen = evt.type.endsWith('PositionOpened')

      // For close events: pnl = amountOut - collateralDelta (positive = profit, negative = loss)
      let pnl = 0
      if (!isOpen) {
        const amountOut = parseFloat(data.amountOut ?? "0")
        const collateralDelta = parseFloat(data.collateralDelta ?? "0")
        pnl = amountOut - collateralDelta
      }

      await insertTrade({
        account: data.account,
        collateral_token: "USDC",
        index_token: data.indexToken,
        is_long: data.isLong,
        action: isOpen ? 'open' : 'close',
        size_delta: parseFloat(data.sizeDelta ?? "0"),
        collateral_delta: parseFloat(data.collateralDelta ?? "0"),
        price: parseFloat(data.execPrice ?? "0"),
        fee: 0,
        pnl,
        tx_hash: evt.transactionId,
      })
    }

    lastBlockHeight = end
    if (allEvents.length > 0) {
      console.log(`[tradesService] indexed ${allEvents.length} events (blocks ${start}→${end})`)
    }
  } catch (err) {
    console.error("[tradesService] poll error:", err)
  }
}

export function startTradesPolling(): void {
  setInterval(() => {
    fetchRecentTrades().catch(console.error)
  }, 10_000)
}
