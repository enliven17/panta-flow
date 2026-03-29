import { Router } from 'express'
import { getTradesForAccount, getAllTrades } from '../services/supabaseService'

const router = Router()

function mapTrade(row: any) {
  const action = row.action || ''
  return {
    type: (action === 'open' || action === 'increase') ? 'increase' : 'decrease',
    account: row.account,
    indexToken: row.index_token,
    isLong: row.is_long,
    sizeDelta: parseFloat(row.size_delta) || 0,
    price: parseFloat(row.price) || 0,
    fee: parseFloat(row.fee) || 0,
    pnl: parseFloat(row.pnl) || 0,
    txHash: row.tx_hash || '',
    timestamp: row.created_at ? new Date(row.created_at).getTime() : 0,
  }
}

// GET /api/trades?account=0x...  (optional — omit for all trades)
router.get('/trades', async (req, res) => {
  const { account } = req.query
  try {
    const rows = account && typeof account === 'string'
      ? await getTradesForAccount(account)
      : await getAllTrades()
    
    console.log(`[trades] Found ${rows.length} trades for account: ${account || 'ALL'}`)
    res.json({ trades: rows.map(mapTrade) })
  } catch (err: any) {
    console.error('[trades] error:', err)
    res.status(500).json({ error: err?.message || String(err) })
  }
})

export default router
