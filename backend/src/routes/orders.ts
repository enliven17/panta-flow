import { Router } from 'express'
import { fcl } from '../services/flowTxService'

const router = Router()

const PANTA = `0x${(process.env.FLOW_DEPLOYER_ADDRESS || '').replace('0x', '')}`

// GET /api/orders  — read all pending limit orders from on-chain
// GET /api/orders?account=0x...  — filter by account
router.get('/orders', async (req, res) => {
  const { account } = req.query
  try {
    const script = `
      import TradingRouter from ${PANTA}

      access(all) fun main(): {UInt64: TradingRouter.LimitOrder} {
        let pool = getAccount(${PANTA})
          .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
          ?? panic("Cannot borrow Pool")
        return pool.getPendingOrders()
      }
    `
    const result = await (fcl as any).query({ cadence: script, args: () => [] })

    const orders = Object.entries(result as Record<string, any>).map(([id, o]) => ({
      id: parseInt(id),
      account: o.account,
      indexToken: o.indexToken,
      sizeDelta: parseFloat(o.sizeDelta),
      isLong: o.isLong,
      limitPrice: parseFloat(o.limitPrice),
      collateralAmount: parseFloat(o.collateralAmount),
      createdAt: parseFloat(o.createdAt),
    }))

    const filtered = account
      ? orders.filter(o => o.account === account)
      : orders

    res.json({ orders: filtered })
  } catch (err: any) {
    console.error('[orders] error:', err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
