import fs from 'fs'
import path from 'path'

interface DeployedAddresses {
  Vault?: string
  VaultUtils?: string
  VaultPriceFeed?: string
  Router?: string
  GlpManager?: string
  PositionRouter?: string
  OrderBook?: string
  ShortsTracker?: string
  Reader?: string
  VaultReader?: string
  OrderBookReader?: string
  WETH?: string
  USDC?: string
  USDG?: string
  PLP?: string
  SlinkyFeed_WETH?: string
  SlinkyFeed_USDC?: string
  [key: string]: string | undefined
}

let addresses: DeployedAddresses = {}

const addressesPath = path.resolve(__dirname, '../../../deployed-addresses.json')
if (fs.existsSync(addressesPath)) {
  addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'))
}

export function getAddress(key: string): `0x${string}` {
  const addr = addresses[key]
  if (!addr) return '0x0000000000000000000000000000000000000000'
  return addr as `0x${string}`
}

export default addresses
