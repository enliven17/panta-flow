// Maps Cadence error messages to Turkish user-friendly messages
const ERROR_MAP: Record<string, string> = {
  "Max supply exceeded": "Maksimum arz aşıldı",
  "Leverage exceeds maximum": "Maksimum kaldıraç aşıldı (50x)",
  "Collateral below minimum": "Minimum teminat gereksinimi karşılanmadı (10 USD)",
  "Insufficient balance": "Yetersiz bakiye",
  "Cooldown not expired": "Bekleme süresi dolmadı",
  "Insufficient faucet reserve": "Faucet rezervi yetersiz",
  "Position not found": "Pozisyon bulunamadı",
  "Position not liquidatable": "Pozisyon tasfiye edilemez",
  "PLP transfer not allowed": "PLP transferi izin verilmiyor",
  "esPANTA transfer not allowed": "esPANTA transferi izin verilmiyor",
  "Stale price": "Fiyat verisi güncel değil",
  "Price not available": "Fiyat verisi mevcut değil",
  "Vesting record already exists": "Vesting kaydı zaten mevcut",
  "No vesting record found": "Vesting kaydı bulunamadı",
}

export function parseFCLError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  for (const [key, translation] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) {
      return translation
    }
  }

  // Generic fallback
  if (message.includes("panic")) {
    const panicMatch = message.match(/panic\("([^"]+)"\)/)
    if (panicMatch) return panicMatch[1]
  }

  return "İşlem başarısız oldu. Lütfen tekrar deneyin."
}

export function useFCLErrorToast() {
  return (error: unknown) => {
    const message = parseFCLError(error)
    // Simple console.error for now — integrate with toast library when available
    console.error("[FCL Error]", message, error)
    return message
  }
}
