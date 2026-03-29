// ─── Token Logo Mapping ────────────────────────────────────────────────────
// Maps token symbols to their logo image paths in /public

export const TOKEN_IMAGES: Record<string, string> = {
  BTC: '/bitcoin-btc-logo.png',
  ETH: '/ethereum-eth-logo.png',
  FLOW: '/flow-flow-logo.png',
}

export function getTokenImage(symbol: string): string | undefined {
  return TOKEN_IMAGES[symbol.toUpperCase()]
}
