import { Router, Request, Response } from 'express'
import { publicClient } from '../config/chain'
import { getAddress } from '../config/addresses'

const READER_ABI = [
  {
    name: 'getPositions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_vault', type: 'address' },
      { name: '_account', type: 'address' },
      { name: '_collateralTokens', type: 'address[]' },
      { name: '_indexTokens', type: 'address[]' },
      { name: '_isLong', type: 'bool[]' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const

export interface Position {
  collateralToken: `0x${string}`  // USDC address
  indexToken: `0x${string}`       // ETH or BTC address
  isLong: boolean
  size: string                    // 1e30 precision, USD
  collateral: string              // 1e30 precision, USD
  averagePrice: string            // 1e30 precision, USD
  entryFundingRate: string
  reserveAmount: string
  realisedPnl: string
  lastIncreasedTime: string
  hasProfit: boolean
  delta: string                   // 1e30 precision, USD
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const router = Router()

// Open CORS for all origins (testnet dev environment)
router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

router.get('/positions/:account', async (req: Request, res: Response) => {
  const account = req.params.account as `0x${string}`
  const reader = getAddress('Reader')
  const vault = getAddress('Vault')
  const USDC = getAddress('USDC')
  const ETH = getAddress('ETH')
  const BTC = getAddress('BTC')

  // If Reader is not deployed, return empty array instead of throwing 500
  if (reader === ZERO_ADDRESS) {
    return res.json([])
  }

  const collaterals: `0x${string}`[] = [USDC, USDC, USDC, USDC]
  const indexTokens: `0x${string}`[] = [ETH, ETH, BTC, BTC]
  const isLong = [true, false, true, false]

  try {
    const data = await publicClient.readContract({
      address: reader,
      abi: READER_ABI,
      functionName: 'getPositions',
      args: [vault, account, collaterals, indexTokens, isLong],
    })

    // Each position is 9 uint256 values
    const positions: Position[] = []
    const POSITION_FIELDS = 9
    for (let i = 0; i < collaterals.length; i++) {
      const offset = i * POSITION_FIELDS
      const size = data[offset]
      if (size === 0n) continue
      positions.push({
        collateralToken: collaterals[i],
        indexToken: indexTokens[i],
        isLong: isLong[i],
        size: size.toString(),
        collateral: data[offset + 1].toString(),
        averagePrice: data[offset + 2].toString(),
        entryFundingRate: data[offset + 3].toString(),
        reserveAmount: data[offset + 4].toString(),
        realisedPnl: data[offset + 5].toString(),
        lastIncreasedTime: data[offset + 6].toString(),
        hasProfit: data[offset + 7] === 1n,
        delta: data[offset + 8].toString(),
      })
    }

    res.json(positions)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch positions' })
  }
})

export default router
