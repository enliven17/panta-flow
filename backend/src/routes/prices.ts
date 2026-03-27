import { Router, Request, Response } from 'express'
import { getPrices, getPriceHistory } from '../services/priceService'

const router = Router()

router.get('/prices', (_req: Request, res: Response) => {
  res.json(getPrices())
})

router.get('/prices/history', (req: Request, res: Response) => {
  const token = (req.query.token as string) || 'WETH'
  const interval = (req.query.interval as '1m' | '5m' | '1h' | '1d') || '1m'
  const limit = Math.min(parseInt((req.query.limit as string) || '500'), 1000)

  const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d']
  if (!validIntervals.includes(interval)) {
    return res.status(400).json({ error: 'Invalid interval. Use 1m, 5m, 1h, or 1d' })
  }

  const candles = getPriceHistory(token, interval, limit)
  res.json(candles)
})

export default router
