import { Router } from "express"
import { fcl } from "../services/flowTxService"

const router = Router()

// ─── GET /api/trade/positions ─────────────────────────────────────────────────
// Reads open positions directly from the on-chain PositionManager contract.
// POST /trade/open and /trade/close have been removed:
// users now sign openPosition.cdc / closePosition.cdc directly via their wallet.

router.get("/trade/positions", async (req, res) => {
  const { account } = req.query
  if (!account) return res.status(400).json({ error: "account required" })

  try {
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
    const PANTA = `0x${process.env.FLOW_DEPLOYER_ADDRESS?.replace("0x", "")}`
    const result = await (fcl as any).query({
      cadence: script.replaceAll("0xPANTA", PANTA),
      args: (arg: any, t: any) => [arg(account as string, t.Address)],
    })

    // Result order: [BTC-long, BTC-short, ETH-long, ETH-short, FLOW-long, FLOW-short]
    const TOKEN_MAP = [
      { indexToken: "BTC",  isLong: true  },
      { indexToken: "BTC",  isLong: false },
      { indexToken: "ETH",  isLong: true  },
      { indexToken: "ETH",  isLong: false },
      { indexToken: "FLOW", isLong: true  },
      { indexToken: "FLOW", isLong: false },
    ]

    const positions = (result as any[])
      .map((pos: any, i: number) => {
        if (!pos) return null
        const { indexToken, isLong } = TOKEN_MAP[i]
        return {
          account: account as string,
          collateralToken: "USDC",
          indexToken,
          isLong,
          size: parseFloat(pos.size),
          collateral: parseFloat(pos.collateral),
          averagePrice: parseFloat(pos.averagePrice),
          entryFundingRate: parseFloat(pos.entryFundingRate),
          lastIncreasedTime: parseFloat(pos.lastIncreasedTime),
          reserveAmount: 0,
          realisedPnl: 0,
          hasProfit: false,
          delta: 0,
        }
      })
      .filter(Boolean)

    res.json({ positions })
  } catch (err: any) {
    console.error("[trading] getPositions error:", err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
