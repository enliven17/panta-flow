import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health'
import pricesRouter from './routes/prices'
import statsRouter from './routes/stats'
import positionsRouter from './routes/positions'
import tradesRouter from './routes/trades'
import { startPricePolling } from './services/priceService'
import { startStatsPolling } from './services/statsService'
import { startTradesPolling } from './services/tradesService'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/', healthRouter)
app.use('/api', pricesRouter)
app.use('/api', statsRouter)
app.use('/api', positionsRouter)
app.use('/api', tradesRouter)

app.listen(PORT, () => {
  console.log(`Panta backend running on port ${PORT}`)
  startPricePolling()
  startStatsPolling()
  startTradesPolling()
})
