import { publicClient } from '../config/chain'
import { getAddress } from '../config/addresses'
import { getCurrentPrices } from './priceService'

const VAULT_ABI = [
  {
    name: 'reservedAmounts',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'globalShortSizes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'poolAmounts',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const GLP_MANAGER_ABI = [
  {
    name: 'getAumInUsdg',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'maximise', type: 'bool' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const PLP_ABI = [
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export interface Stats {
  tvl: string
  volume24h: string
  openInterest: string
  plpPrice: string
  plpApr: string
}

let cachedStats: Stats = {
  tvl: '0',
  volume24h: '0',
  openInterest: '0',
  plpPrice: '1.00',
  plpApr: '0',
}

async function calcOpenInterest(): Promise<number> {
  const vault = getAddress('Vault')
  const eth = getAddress('ETH')
  const btc = getAddress('BTC')

  const [
    reservedETH,
    reservedBTC,
    shortSizeETH,
    shortSizeBTC,
  ] = await Promise.all([
    publicClient.readContract({ address: vault, abi: VAULT_ABI, functionName: 'reservedAmounts', args: [eth] }),
    publicClient.readContract({ address: vault, abi: VAULT_ABI, functionName: 'reservedAmounts', args: [btc] }),
    publicClient.readContract({ address: vault, abi: VAULT_ABI, functionName: 'globalShortSizes', args: [eth] }),
    publicClient.readContract({ address: vault, abi: VAULT_ABI, functionName: 'globalShortSizes', args: [btc] }),
  ])

  const prices = getCurrentPrices()
  const ethPrice = parseFloat(prices.ETH)
  const btcPrice = parseFloat(prices.BTC)

  // Long OI: reservedAmounts * price / decimal
  // ETH: 18 decimals, BTC: 8 decimals
  const longOI_ETH = (Number(reservedETH) / 1e18) * ethPrice
  const longOI_BTC = (Number(reservedBTC) / 1e8) * btcPrice

  // Short OI: globalShortSizes is already in USD with 1e30 precision
  const shortOI_ETH = Number(shortSizeETH) / 1e30
  const shortOI_BTC = Number(shortSizeBTC) / 1e30

  return longOI_ETH + longOI_BTC + shortOI_ETH + shortOI_BTC
}

export async function updateStats() {
  try {
    const glpManager = getAddress('GlpManager')
    const plp = getAddress('PLP')

    const [aumMax, aumMin, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: glpManager,
        abi: GLP_MANAGER_ABI,
        functionName: 'getAumInUsdg',
        args: [true],
      }),
      publicClient.readContract({
        address: glpManager,
        abi: GLP_MANAGER_ABI,
        functionName: 'getAumInUsdg',
        args: [false],
      }),
      publicClient.readContract({
        address: plp,
        abi: PLP_ABI,
        functionName: 'totalSupply',
      }),
    ])

    const aum = (aumMax + aumMin) / 2n
    const aumUsd = Number(aum) / 1e18

    const supply = Number(totalSupply) / 1e18
    const plpPrice = supply > 0 ? aumUsd / supply : 1

    let openInterest = '0'
    try {
      const oi = await calcOpenInterest()
      openInterest = oi.toFixed(2)
    } catch {
      // Keep '0' if OI calculation fails — non-critical
    }

    cachedStats = {
      tvl: aumUsd.toFixed(2),
      volume24h: '0', // Would need event indexing for this
      openInterest,
      plpPrice: plpPrice.toFixed(4),
      plpApr: '0',
    }
  } catch {
    // Keep cached stats on error
  }
}

export function getStats(): Stats {
  return cachedStats
}

export function startStatsPolling() {
  updateStats()
  setInterval(updateStats, 30_000)
}
