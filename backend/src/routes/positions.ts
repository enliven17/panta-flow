// Legacy positions route — redirects to the new /api/trade/positions endpoint
import { Router, Request, Response } from "express"

const router = Router()

router.get("/positions/:account", (_req: Request, res: Response) => {
  res.json([])
})

export default router
