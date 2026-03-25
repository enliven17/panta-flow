import { Router, Request, Response } from 'express'
import { getStats } from '../services/statsService'

const router = Router()

router.get('/stats', (_req: Request, res: Response) => {
  res.json(getStats())
})

export default router
