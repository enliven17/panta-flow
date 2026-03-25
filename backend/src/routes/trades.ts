import { Router } from 'express'
import { getCachedTrades } from '../services/tradesService'

const router = Router()

router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

router.get('/trades/history', (_req, res) => {
  res.json(getCachedTrades())
})

export default router
