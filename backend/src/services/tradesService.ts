import * as fcl from "@onflow/fcl"
import { insertTrade, getAllTrades } from './supabaseService'

const DEPLOYER_ADDRESS = (process.env.FLOW_DEPLOYER_ADDRESS || "").replace("0x", "")
const PANTA = `0x${DEPLOYER_ADDRESS}`

const EVENT_INCREASED = `A.${DEPLOYER_ADDRESS}.PositionManager.PositionIncreased`
const EVENT_DECREASED = `A.${DEPLOYER_ADDRESS}.PositionManager.PositionDecreased`

let lastBlockHeight = 0

export interface Trade {
  type: 'increase' | 'decrease'
  account: string
  indexToken: string
  sizeDelta: number
  isLong: boolean
  price: number
  fee: number
  pnl: number
  txHash: string
  timestamp: number
}

export async function fetchRecentTrades(): Promise<void> {
  try {
    const latestBlock = await (fcl as any).send([(fcl as any).getBlock(true)]).then((fcl as any).decode)
    const currentHeight = latestBlock.height

    if (lastBlockHeight === 0) {
      lastBlockHeight = currentHeight - 1000 // poll last 1000 blocks on start to catch recent tests
    }

    if (currentHeight <= lastBlockHeight) return

    const start = lastBlockHeight + 1
    const end = currentHeight

    // fetch increase events
    const increaseEvents = await (fcl as any).send([
      (fcl as any).getEventsAtHeightRange(EVENT_INCREASED, start, end)
    ]).then((fcl as any).decode)

    // fetch decrease events
    const decreaseEvents = await (fcl as any).send([
      (fcl as any).getEventsAtHeightRange(EVENT_DECREASED, start, end)
    ]).then((fcl as any).decode)

    const allEvents = [...increaseEvents, ...decreaseEvents].sort((a, b) => a.blockHeight - b.blockHeight)

    for (const evt of allEvents) {
      const data = evt.data
      const type = evt.type.endsWith('PositionIncreased') ? 'increase' : 'decrease'
      
      await insertTrade({
        account: data.account,
        collateral_token: data.collateralToken || "USDC",
        index_token: data.indexToken,
        is_long: data.isLong,
        action: type === 'increase' ? (data.isNew ? 'open' : 'increase') : 'decrease',
        size_delta: parseFloat(data.sizeDelta),
        collateral_delta: parseFloat(data.collateralDelta || "0"),
        price: parseFloat(data.price),
        fee: parseFloat(data.fee || "0"),
        pnl: parseFloat(data.realisedPnl || "0"),
        tx_hash: evt.transactionId
      })
    }

    lastBlockHeight = end
  } catch (err) {
    console.error("[tradesService] poll error:", err)
  }
}

export function startTradesPolling(): void {
  // poll every 10 seconds
  setInterval(() => {
    fetchRecentTrades().catch(console.error)
  }, 10000)
}
