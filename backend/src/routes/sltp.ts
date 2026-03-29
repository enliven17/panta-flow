import { Router } from 'express'
import { setSLTP } from '../services/supabaseService'

const router = Router()

// POST /api/sltp
// Body: { account, indexToken, isLong, stopLoss?, takeProfit? }
router.post('/sltp', async (req, res) => {
  const { account, indexToken, isLong, stopLoss, takeProfit } = req.body

  if (!account || !indexToken || isLong === undefined) {
    return res.status(400).json({ error: 'account, indexToken, isLong required' })
  }

  try {
    await setSLTP(
      account,
      'USDC',
      indexToken,
      Boolean(isLong),
      stopLoss != null ? parseFloat(stopLoss) : null,
      takeProfit != null ? parseFloat(takeProfit) : null
    )
    res.json({ ok: true })
  } catch (err: any) {
    console.error('[sltp] error:', err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
