import { Router } from 'express'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() })
})

export default router
