// Contract addresses — populated after deployment
// Update DEPLOYED_ADDRESSES with your deployed-addresses.json values

export interface ContractAddresses {
  Vault: `0x${string}`
  VaultUtils: `0x${string}`
  VaultPriceFeed: `0x${string}`
  Router: `0x${string}`
  GlpManager: `0x${string}`
  PositionRouter: `0x${string}`
  OrderBook: `0x${string}`
  ShortsTracker: `0x${string}`
  Reader: `0x${string}`
  VaultReader: `0x${string}`
  OrderBookReader: `0x${string}`
  WETH: `0x${string}`
  ETH: `0x${string}`
  BTC: `0x${string}`
  USDC: `0x${string}`
  USDG: `0x${string}`
  PLP: `0x${string}`
  PANTA: `0x${string}`
  esPANTA: `0x${string}`
  bnPANTA: `0x${string}`
  stakedPantaTracker: `0x${string}`
  bonusPantaTracker: `0x${string}`
  feePantaTracker: `0x${string}`
  stakedPlpTracker: `0x${string}`
  feePlpTracker: `0x${string}`
  RewardRouter: `0x${string}`
  Vester: `0x${string}`
  SlinkyFeed_WETH: `0x${string}`
  SlinkyFeed_USDC: `0x${string}`
}

// Placeholder addresses — replace with actual deployed-addresses.json values
// after running: npx hardhat run scripts/deploy/deployAll.js --network initia_testnet
const PLACEHOLDER = '0x0000000000000000000000000000000000000000' as `0x${string}`

export const ADDRESSES: ContractAddresses = {
  Vault: PLACEHOLDER,
  VaultUtils: PLACEHOLDER,
  VaultPriceFeed: PLACEHOLDER,
  Router: PLACEHOLDER,
  GlpManager: PLACEHOLDER,
  PositionRouter: PLACEHOLDER,
  OrderBook: PLACEHOLDER,
  ShortsTracker: PLACEHOLDER,
  Reader: PLACEHOLDER,
  VaultReader: PLACEHOLDER,
  OrderBookReader: PLACEHOLDER,
  WETH: PLACEHOLDER,
  ETH: PLACEHOLDER,
  BTC: PLACEHOLDER,
  USDC: PLACEHOLDER,
  USDG: PLACEHOLDER,
  PLP: PLACEHOLDER,
  PANTA: PLACEHOLDER,
  esPANTA: PLACEHOLDER,
  bnPANTA: PLACEHOLDER,
  stakedPantaTracker: PLACEHOLDER,
  bonusPantaTracker: PLACEHOLDER,
  feePantaTracker: PLACEHOLDER,
  stakedPlpTracker: PLACEHOLDER,
  feePlpTracker: PLACEHOLDER,
  RewardRouter: PLACEHOLDER,
  Vester: PLACEHOLDER,
  SlinkyFeed_WETH: PLACEHOLDER,
  SlinkyFeed_USDC: PLACEHOLDER,
}

export const TOKENS = [
  {
    symbol: 'WETH',
    name: 'Wrapped ETH',
    address: ADDRESSES.WETH,
    decimals: 18,
    isStable: false,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: ADDRESSES.USDC,
    decimals: 6,
    isStable: true,
  },
] as const

// ─── Flow Testnet Contract Addresses ───────────────────────────────────────

export interface FlowContractAddresses {
  MockUSDC: string
  PANTAToken: string
  PLPToken: string
  EsPANTAToken: string
  PriceFeed: string
  Vault: string
  PositionManager: string
  MockUSDCFaucet: string
  StakingRewards: string
  // Standard Flow contracts
  FungibleToken: string
  FlowToken: string
}

export const FLOW_ADDRESSES: FlowContractAddresses = {
  MockUSDC: "",
  PANTAToken: "",
  PLPToken: "",
  EsPANTAToken: "",
  PriceFeed: "",
  Vault: "",
  PositionManager: "",
  MockUSDCFaucet: "",
  StakingRewards: "",
  FungibleToken: "0x9a0766d93b6608b7",
  FlowToken: "0x7e60df042a9c0868",
}
