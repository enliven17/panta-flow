// scripts/config/setupVault.js
// Tüm deploy scriptleri çalıştıktan sonra Vault'u konfigüre eder.
// Çalıştırma: npx hardhat run scripts/config/setupVault.js --network initia_testnet
const { ethers } = require("hardhat")
const fs = require("fs")

function expandDecimals(n, decimals) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(decimals))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"))

  console.log("Vault konfigürasyonu başlıyor...")
  console.log("Deployer:", deployer.address)
  console.log("")

  // Contract bağlantıları
  const vault             = await ethers.getContractAt("Vault",           addresses.Vault)
  const vaultPriceFeed    = await ethers.getContractAt("VaultPriceFeed",  addresses.VaultPriceFeed)
  const router            = await ethers.getContractAt("Router",          addresses.Router)
  const positionRouter    = await ethers.getContractAt("PositionRouter",  addresses.PositionRouter)
  const orderBook         = await ethers.getContractAt("OrderBook",       addresses.OrderBook)
  const usdg              = await ethers.getContractAt("USDG",            addresses.USDG)
  const glpManager        = await ethers.getContractAt("GlpManager",      addresses.GlpManager)

  // ─────────────────────────────────────────────
  // 1. VaultPriceFeed konfigürasyonu
  // ─────────────────────────────────────────────
  console.log("1/5 VaultPriceFeed ayarlanıyor...")

  // Slinky tarihsel round desteklemiyor — priceSampleSpace=1 zorunlu
  await vaultPriceFeed.setPriceSampleSpace(1)
  console.log("  ✓ priceSampleSpace = 1")

  // Initia'da AMM pair yok
  await vaultPriceFeed.setIsAmmEnabled(false)
  console.log("  ✓ AMM fiyatlandırma devre dışı")

  // FastPriceFeed (secondary price feed) kullanmıyoruz
  await vaultPriceFeed.setIsSecondaryPriceEnabled(false)
  console.log("  ✓ Secondary price feed devre dışı")

  // WETH için Slinky adapter kaydı (8 decimal, volatile, shortable)
  await vaultPriceFeed.setTokenConfig(
    addresses.WETH,
    addresses.SlinkyFeed_WETH,
    8,     // priceDecimals — adapter 8 decimal döner
    false  // isStrictStable
  )
  console.log("  ✓ WETH oracle =", addresses.SlinkyFeed_WETH)

  // USDC için Slinky adapter kaydı (8 decimal, stable)
  await vaultPriceFeed.setTokenConfig(
    addresses.USDC,
    addresses.SlinkyFeed_USDC,
    8,     // priceDecimals
    true   // isStrictStable
  )
  console.log("  ✓ USDC oracle =", addresses.SlinkyFeed_USDC)

  // ─────────────────────────────────────────────
  // 2. Vault token whitelist
  // ─────────────────────────────────────────────
  console.log("")
  console.log("2/5 Token whitelist ayarlanıyor...")

  // WETH: volatile collateral, longlanabilir ve shortlanabilir
  await vault.setTokenConfig(
    addresses.WETH,
    18,                           // tokenDecimals
    20000,                        // tokenWeight (toplam ağırlık içindeki pay)
    150,                          // minProfitBasisPoints = 0.75% (wash trading koruma)
    expandDecimals(30000000, 18), // maxUsdgAmount = $30M cap
    false,                        // isStable
    true                          // isShortable
  )
  console.log("  ✓ WETH whitelisted (volatile, shortable)")

  // USDC: stable collateral, shortlanamaz
  await vault.setTokenConfig(
    addresses.USDC,
    6,                            // tokenDecimals
    30000,                        // tokenWeight
    10,                           // minProfitBasisPoints = 0.05%
    expandDecimals(50000000, 18), // maxUsdgAmount = $50M cap
    true,                         // isStable
    false                         // isShortable
  )
  console.log("  ✓ USDC whitelisted (stable)")

  // ─────────────────────────────────────────────
  // 3. Leverage sınırı — 10x
  // ─────────────────────────────────────────────
  console.log("")
  console.log("3/5 Leverage sınırı ayarlanıyor...")

  // Contract default zaten 10x (Vault.sol:55), ama açıkça set ediyoruz
  await vault.setMaxLeverage(10 * 10000) // 100000 = 10x
  console.log("  ✓ maxLeverage = 10x (100000 basis points)")

  // ─────────────────────────────────────────────
  // 4. Manager ve plugin kayıtları
  // ─────────────────────────────────────────────
  console.log("")
  console.log("4/5 Manager ve plugin kayıtları...")

  // GlpManager Vault'tan token alabilsin (addLiquidity işlemleri için)
  await vault.setManager(glpManager.address, true)
  console.log("  ✓ GlpManager = Vault manager")

  // Vault USDG mint edebilsin
  await usdg.addVault(vault.address)
  console.log("  ✓ Vault → USDG vault")

  // PositionRouter ve OrderBook Router'a plugin olarak ekleniyor
  await router.addPlugin(addresses.PositionRouter)
  console.log("  ✓ PositionRouter plugin kayıtlı")

  await router.addPlugin(addresses.OrderBook)
  console.log("  ✓ OrderBook plugin kayıtlı")

  // ─────────────────────────────────────────────
  // 5. PositionRouter keeper
  // ─────────────────────────────────────────────
  console.log("")
  console.log("5/5 PositionRouter keeper ayarlanıyor...")

  // Deployer geçici keeper olarak ayarlanıyor (testnet)
  // Production'da ayrı bir keeper bot adresi kullanın
  await positionRouter.setPositionKeeper(deployer.address, true)
  console.log("  ✓ Keeper =", deployer.address)

  // ─────────────────────────────────────────────
  // Özet
  // ─────────────────────────────────────────────
  console.log("")
  console.log("══════════════════════════════════════════════")
  console.log("PANTA PerpDEX — Vault konfigürasyonu tamamlandı")
  console.log("══════════════════════════════════════════════")
  console.log("")
  console.log("Doğrulama adımları:")
  console.log("  vault.maxLeverage()                          → 100000 (10x)")
  console.log("  vaultPriceFeed.getPrice(WETH, ...)           → geçerli USD fiyatı")
  console.log("  glpManager.addLiquidity(USDC, ...)           → PLP mint edilmeli")
  console.log("")
  console.log("Vault :", addresses.Vault)
  console.log("Router:", addresses.Router)
  console.log("WETH  :", addresses.WETH)
  console.log("USDC  :", addresses.USDC)
}

main().catch(console.error)
