export interface IncreaseOrder {
  account: `0x${string}`
  purchaseToken: `0x${string}`
  purchaseTokenAmount: bigint
  collateralToken: `0x${string}`
  indexToken: `0x${string}`
  sizeDelta: bigint
  isLong: boolean
  triggerPrice: bigint
  triggerAboveThreshold: boolean
  executionFee: bigint
  index: bigint
}

export interface DecreaseOrder {
  account: `0x${string}`
  collateralToken: `0x${string}`
  collateralDelta: bigint
  indexToken: `0x${string}`
  sizeDelta: bigint
  isLong: boolean
  triggerPrice: bigint
  triggerAboveThreshold: boolean
  executionFee: bigint
  index: bigint
}
