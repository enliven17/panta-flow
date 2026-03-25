const BASIS_POINTS_DIVISOR = 10000n
const PRICE_PRECISION = BigInt(10) ** 30n
const USD_DECIMALS = 30

export function getLiquidationPrice(
  isLong: boolean,
  size: bigint,
  collateral: bigint,
  averagePrice: bigint,
  entryFundingRate: bigint,
  cumulativeFundingRate: bigint,
  liquidationFeeUsd: bigint
): bigint {
  if (size === 0n) return 0n
  const fundingFee = (size * (cumulativeFundingRate - entryFundingRate)) / 1000000n
  const remainingCollateral = collateral - fundingFee - liquidationFeeUsd

  if (isLong) {
    return (averagePrice * (remainingCollateral)) / size + averagePrice - (averagePrice * remainingCollateral) / size
  } else {
    const liquidationDelta = (remainingCollateral * averagePrice) / size
    return averagePrice + liquidationDelta
  }
}

export function getPnl(
  isLong: boolean,
  size: bigint,
  averagePrice: bigint,
  currentPrice: bigint
): bigint {
  if (size === 0n || averagePrice === 0n) return 0n
  const priceDelta = isLong
    ? currentPrice > averagePrice ? currentPrice - averagePrice : 0n
    : averagePrice > currentPrice ? averagePrice - currentPrice : 0n
  const hasProfit = isLong ? currentPrice > averagePrice : averagePrice > currentPrice
  const delta = (size * priceDelta) / averagePrice
  return hasProfit ? delta : -delta
}

export function getLeverage(size: bigint, collateral: bigint): number {
  if (collateral === 0n) return 0
  return Number((size * 100n) / collateral) / 100
}

export function getPositionFee(size: bigint): bigint {
  // 0.1% fee
  return (size * 10n) / BASIS_POINTS_DIVISOR
}
