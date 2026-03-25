// scripts/deploy/setupVault.js
// Deploy sonrası Vault, VaultPriceFeed, Router, ShortsTracker ve PositionRouter
// konfigürasyonunu tamamlar.
//
// Gereksinimler: 1.1–1.16, 10.8, 10.9
const { ethers } = require("hardhat")
const fs = require("fs")

const ADDRESSES_FILE = "./deployed-addresses.json"

// Vault.setTokenConfig parametreleri:
//   (token, decimals, weight, minProfitBps, maxUsdgAmount, isStable, isShortable)
// maxUsdgAmount değerleri 1e18 precision ile verilir
const USDC_MAX_USDG = ethers.utils.parseUnits("50000000", 18) // 50M
const ETH_MAX_USDG  = ethers.utils.parseUnits("30000000", 18) // 30M
const BTC_MAX_USDG  = ethers.utils.parseUnits("30000000", 18) // 30M

async function main() {
  // Gereksinim 1.1: deployed-addresses.json'dan tüm adresleri oku
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(
      "deployed-addresses.json bulunamadı. " +
      "Lütfen önce tüm deploy adımlarını çalıştırın."
    )
  }

  const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE))

  // Zorunlu adres kontrolü
  const required = [
    "Vault", "VaultPriceFeed", "Router",
    "ShortsTracker", "PositionRouter", "OrderBook",
    "FastPriceFeed",
    "PythPriceFeed_ETH", "PythPriceFeed_BTC", "PythPriceFeed_USDC",
    "ETH", "BTC", "USDC",
  ]
  for (const key of required) {
    if (!addresses[key]) {
      throw new Error(`deployed-addresses.json içinde '${key}' adresi bulunamadı.`)
    }
  }

  const [deployer] = await ethers.getSigners()

  // keeperAddress: KEEPER_PRIVATE_KEY env var'dan türet, yoksa deployer kullan
  let keeperAddress = deployer.address
  if (process.env.KEEPER_PRIVATE_KEY) {
    const keeperWallet = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY)
    keeperAddress = keeperWallet.address
  }

  console.log("=== setupVault.js ===")
  console.log("Deployer         :", deployer.address)
  console.log("Keeper           :", keeperAddress)
  console.log("")
  console.log("Vault            :", addresses.Vault)
  console.log("VaultPriceFeed   :", addresses.VaultPriceFeed)
  console.log("Router           :", addresses.Router)
  console.log("ShortsTracker    :", addresses.ShortsTracker)
  console.log("PositionRouter   :", addresses.PositionRouter)
  console.log("OrderBook        :", addresses.OrderBook)
  console.log("FastPriceFeed    :", addresses.FastPriceFeed)
  console.log("PythPriceFeed ETH :", addresses.PythPriceFeed_ETH)
  console.log("PythPriceFeed BTC :", addresses.PythPriceFeed_BTC)
  console.log("PythPriceFeed USDC:", addresses.PythPriceFeed_USDC)
  console.log("ETH              :", addresses.ETH)
  console.log("BTC              :", addresses.BTC)
  console.log("USDC             :", addresses.USDC)
  console.log("")

  // Kontrat instance'larını oluştur
  const vaultPriceFeed = await ethers.getContractAt("VaultPriceFeed", addresses.VaultPriceFeed)
  const vault          = await ethers.getContractAt("Vault",          addresses.Vault)
  const router         = await ethers.getContractAt("Router",         addresses.Router)
  const shortsTracker  = await ethers.getContractAt("ShortsTracker",  addresses.ShortsTracker)
  const positionRouter = await ethers.getContractAt("PositionRouter", addresses.PositionRouter)
  const fastPriceFeed  = await ethers.getContractAt("FastPriceFeed",  addresses.FastPriceFeed)

  // ─── 1. VaultPriceFeed konfigürasyonu ────────────────────────────────────

  // Gereksinim 1.2: VaultPriceFeed.setPriceSampleSpace(1)
  console.log("VaultPriceFeed.setPriceSampleSpace(1)...")
  let tx = await vaultPriceFeed.setPriceSampleSpace(1)
  await tx.wait()
  console.log("  ✓ setPriceSampleSpace(1)")

  // Gereksinim 1.3: ETH için setTokenConfig
  console.log("VaultPriceFeed.setTokenConfig(ETH, PythPriceFeed_ETH, 8, false)...")
  tx = await vaultPriceFeed.setTokenConfig(
    addresses.ETH,
    addresses.PythPriceFeed_ETH,
    8,
    false
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(ETH)")

  // Gereksinim 1.4: BTC için setTokenConfig
  console.log("VaultPriceFeed.setTokenConfig(BTC, PythPriceFeed_BTC, 8, false)...")
  tx = await vaultPriceFeed.setTokenConfig(
    addresses.BTC,
    addresses.PythPriceFeed_BTC,
    8,
    false
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(BTC)")

  // Gereksinim 1.5: USDC için setTokenConfig
  console.log("VaultPriceFeed.setTokenConfig(USDC, PythPriceFeed_USDC, 8, true)...")
  tx = await vaultPriceFeed.setTokenConfig(
    addresses.USDC,
    addresses.PythPriceFeed_USDC,
    8,
    true
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(USDC)")

  // Gereksinim 1.9 / 10.8: setSecondaryPriceFeed(FastPriceFeed)
  console.log("VaultPriceFeed.setSecondaryPriceFeed(FastPriceFeed)...")
  tx = await vaultPriceFeed.setSecondaryPriceFeed(addresses.FastPriceFeed)
  await tx.wait()
  console.log("  ✓ setSecondaryPriceFeed(FastPriceFeed)")

  // ─── 2. Vault token konfigürasyonu ───────────────────────────────────────

  // Gereksinim 1.6: USDC — stableToken=true, shortable=false
  console.log("Vault.setTokenConfig(USDC, 6, 30000, 10, 50M, true, false)...")
  tx = await vault.setTokenConfig(
    addresses.USDC,   // _token
    6,                // _tokenDecimals
    30000,            // _tokenWeight
    10,               // _minProfitBps
    USDC_MAX_USDG,    // _maxUsdgAmount
    true,             // _isStable
    false             // _isShortable
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(USDC)")

  // Gereksinim 1.7: ETH — stableToken=false, shortable=true
  console.log("Vault.setTokenConfig(ETH, 18, 20000, 150, 30M, false, true)...")
  tx = await vault.setTokenConfig(
    addresses.ETH,    // _token
    18,               // _tokenDecimals
    20000,            // _tokenWeight
    150,              // _minProfitBps
    ETH_MAX_USDG,     // _maxUsdgAmount
    false,            // _isStable
    true              // _isShortable
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(ETH)")

  // Gereksinim 1.8: BTC — stableToken=false, shortable=true
  console.log("Vault.setTokenConfig(BTC, 8, 20000, 150, 30M, false, true)...")
  tx = await vault.setTokenConfig(
    addresses.BTC,    // _token
    8,                // _tokenDecimals
    20000,            // _tokenWeight
    150,              // _minProfitBps
    BTC_MAX_USDG,     // _maxUsdgAmount
    false,            // _isStable
    true              // _isShortable
  )
  await tx.wait()
  console.log("  ✓ setTokenConfig(BTC)")

  // Gereksinim 1.14: Vault.setMaxLeverage(100000) — 10x
  console.log("Vault.setMaxLeverage(100000)...")
  tx = await vault.setMaxLeverage(100000)
  await tx.wait()
  console.log("  ✓ setMaxLeverage(100000)")

  // ─── 3. Router plugin kayıtları ──────────────────────────────────────────

  // Gereksinim 1.10: Router.addPlugin(PositionRouter)
  console.log("Router.addPlugin(PositionRouter)...")
  tx = await router.addPlugin(addresses.PositionRouter)
  await tx.wait()
  console.log("  ✓ addPlugin(PositionRouter)")

  // Gereksinim 1.11: Router.addPlugin(OrderBook)
  console.log("Router.addPlugin(OrderBook)...")
  tx = await router.addPlugin(addresses.OrderBook)
  await tx.wait()
  console.log("  ✓ addPlugin(OrderBook)")

  // ─── 4. ShortsTracker handler kaydı ──────────────────────────────────────

  // Gereksinim 1.12: ShortsTracker.setHandler(PositionRouter, true)
  console.log("ShortsTracker.setHandler(PositionRouter, true)...")
  tx = await shortsTracker.setHandler(addresses.PositionRouter, true)
  await tx.wait()
  console.log("  ✓ setHandler(PositionRouter)")

  // ─── 5. PositionRouter keeper kaydı ──────────────────────────────────────

  // Gereksinim 1.13: PositionRouter.setPositionKeeper(deployerAddress, true)
  console.log("PositionRouter.setPositionKeeper(deployer, true)...")
  tx = await positionRouter.setPositionKeeper(deployer.address, true)
  await tx.wait()
  console.log("  ✓ setPositionKeeper(deployer)")

  // ─── 6. FastPriceFeed updater kaydı ──────────────────────────────────────

  // Gereksinim 10.9: FastPriceFeed.setUpdater(keeperAddress, true)
  console.log(`FastPriceFeed.setUpdater(${keeperAddress}, true)...`)
  tx = await fastPriceFeed.setUpdater(keeperAddress, true)
  await tx.wait()
  console.log("  ✓ setUpdater(keeper)")

  // ─── 7. Özet log ─────────────────────────────────────────────────────────

  // Gereksinim 1.16: Başarıda özet logla
  console.log("")
  console.log("════════════════════════════════════════")
  console.log("  setupVault tamamlandı ✓")
  console.log("════════════════════════════════════════")
  console.log("")
  console.log("Konfigürasyon özeti:")
  console.log("  VaultPriceFeed.priceSampleSpace = 1")
  console.log("  VaultPriceFeed.priceFeeds[ETH]  =", addresses.PythPriceFeed_ETH)
  console.log("  VaultPriceFeed.priceFeeds[BTC]  =", addresses.PythPriceFeed_BTC)
  console.log("  VaultPriceFeed.priceFeeds[USDC] =", addresses.PythPriceFeed_USDC)
  console.log("  VaultPriceFeed.secondaryFeed    =", addresses.FastPriceFeed)
  console.log("")
  console.log("  Vault.whitelistedTokens[USDC]   = true  (stable, 6 dec, weight=30000)")
  console.log("  Vault.whitelistedTokens[ETH]    = true  (shortable, 18 dec, weight=20000)")
  console.log("  Vault.whitelistedTokens[BTC]    = true  (shortable, 8 dec, weight=20000)")
  console.log("  Vault.maxLeverage               = 100000 (10x)")
  console.log("")
  console.log("  Router.plugins[PositionRouter]  =", addresses.PositionRouter)
  console.log("  Router.plugins[OrderBook]       =", addresses.OrderBook)
  console.log("")
  console.log("  ShortsTracker.handler[PositionRouter] = true")
  console.log("  PositionRouter.keeper[deployer]       = true  (", deployer.address, ")")
  console.log("  FastPriceFeed.updater[keeper]         = true  (", keeperAddress, ")")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/syncAddresses.js --network initia_testnet")
}

// Gereksinim 1.15: Hata durumunda konsola yaz ve dur
main().catch((err) => {
  console.error("HATA:", err.message || err)
  process.exit(1)
})
