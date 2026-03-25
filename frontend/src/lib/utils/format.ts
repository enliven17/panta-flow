export function formatUsd(value: bigint, decimals = 30): string {
  const divisor = BigInt(10) ** BigInt(decimals)
  const integer = value / divisor
  const fraction = value % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2)
  return `$${integer.toLocaleString()}.${fractionStr}`
}

export function formatToken(value: bigint, decimals: number, displayDecimals = 4): string {
  const divisor = BigInt(10) ** BigInt(decimals)
  const integer = value / divisor
  const fraction = value % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, displayDecimals)
  return `${integer.toLocaleString()}.${fractionStr}`
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
