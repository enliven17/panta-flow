import "dotenv/config"
import express from "express"
import cors from "cors"
import healthRouter from "./routes/health"
import pricesRouter from "./routes/prices"
import statsRouter from "./routes/stats"
import positionsRouter from "./routes/positions"
import tradesRouter from "./routes/trades"
import faucetRouter from "./routes/faucet"
import tradingRouter from "./routes/trading"
import stakingRouter from "./routes/staking"
import { startPythPolling } from "./services/pythPriceService"
import { startPriceKeeper } from "./services/priceKeeperService"
import { startStatsPolling } from "./services/statsService"
import { startTradesPolling } from "./services/tradesService"

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use("/", healthRouter)
app.use("/api", pricesRouter)
app.use("/api", statsRouter)
app.use("/api", positionsRouter)
app.use("/api", tradesRouter)
app.use("/api", faucetRouter)
app.use("/api", tradingRouter)
app.use("/api", stakingRouter)

app.listen(PORT, () => {
  console.log(`[panta-backend] running on port ${PORT}`)

  // Pyth price polling — 1s (seeds 500 historical candles from Binance first)
  startPythPolling().catch(err => console.error("[panta-backend] startPythPolling failed:", err))

  // On-chain PriceFeed keeper — 30s
  startPriceKeeper()

  // Legacy stats + trades polling
  startStatsPolling()
  startTradesPolling()
})
