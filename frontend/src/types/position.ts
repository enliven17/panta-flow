export interface Position {
  account: `0x${string}`
  collateralToken: `0x${string}`
  indexToken: `0x${string}`
  isLong: boolean
  size: bigint
  collateral: bigint
  averagePrice: bigint
  entryFundingRate: bigint
  reserveAmount: bigint
  realisedPnl: bigint
  lastIncreasedTime: bigint
  hasProfit: boolean
  delta: bigint
}
