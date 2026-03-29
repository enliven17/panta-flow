import { Router } from 'express'
import { getCachedTrades } from '../services/tradesService'
import { getTradesForAccount } from '../services/supabaseService'

const router = Router()

router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// GET /api/trades?account=0x...
router.get('/trades', async (req, res) => {
  const { account } = req.query
  if (!account || typeof account !== 'string') {
    return res.status(400).json({ error: 'account required' })
  }
  try {
    const trades = await getTradesForAccount(account)
    res.json(trades)
  } catch (err: any) {
    console.error('[trades] error:', err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

router.get('/trades/history', (_req, res) => {
  res.json(getCachedTrades())
})

export default router
