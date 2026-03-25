// scripts/deploy/deployPythOracle.js
// PythPriceFeed (ETH, BTC, USDC) ve FastPriceFeed kontratlarını deploy eder.
const { ethers } = require("hardhat")
const fs = require("fs")

// Pyth Price Feed ID'leri
const ETH_FEED_ID  = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
const BTC_FEED_ID  = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
const USDC_FEED_ID = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"

async function main() {
  const [deployer] = await ethers.getSigners()
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"))

  // Pyth kontrat adresini belirle:
  // 1. deployed-addresses.json["Pyth"] varsa kullan
  // 2. PYTH_CONTRACT_ADDRESS env var varsa kullan
  // 3. Hata ver
  const pythAddress =
    addresses.Pyth ||
    process.env.PYTH_CONTRACT_ADDRESS

  if (!pythAddress) {
    throw new Error(
      "Pyth kontrat adresi bulunamadı. " +
      "deployed-addresses.json'a 'Pyth' anahtarı ekleyin " +
      "veya PYTH_CONTRACT_ADDRESS env değişkenini ayarlayın."
    )
  }

  console.log("Deploying Pyth oracle contracts...")
  console.log("Deployer        :", deployer.address)
  console.log("Pyth contract   :", pythAddress)
  console.log("VaultPriceFeed  :", addresses.VaultPriceFeed)
  console.log("FastPriceEvents :", addresses.FastPriceEvents)
  console.log("")

  const PythPriceFeed = await ethers.getContractFactory("PythPriceFeed")

  // 1. PythPriceFeed — ETH
  const pythFeedETH = await PythPriceFeed.deploy(
    pythAddress,
    ETH_FEED_ID,
    "ETH / USD"
  )
  await pythFeedETH.deployed()
  console.log("✓ PythPriceFeed ETH  :", pythFeedETH.address)

  // 2. PythPriceFeed — BTC
  const pythFeedBTC = await PythPriceFeed.deploy(
    pythAddress,
    BTC_FEED_ID,
    "BTC / USD"
  )
  await pythFeedBTC.deployed()
  console.log("✓ PythPriceFeed BTC  :", pythFeedBTC.address)

  // 3. PythPriceFeed — USDC
  const pythFeedUSDC = await PythPriceFeed.deploy(
    pythAddress,
    USDC_FEED_ID,
    "USDC / USD"
  )
  await pythFeedUSDC.deployed()
  console.log("✓ PythPriceFeed USDC :", pythFeedUSDC.address)

  // 4. FastPriceFeed
  const FastPriceFeed = await ethers.getContractFactory("FastPriceFeed")
  const fastPriceFeed = await FastPriceFeed.deploy(
    pythAddress,          // _pyth
    300,                  // _priceDuration: 5 dakika
    3600,                 // _maxPriceUpdateDelay: 1 saat
    0,                    // _minBlockInterval: testnet için 0
    750,                  // _maxDeviationBasisPoints: 7.5%
    addresses.VaultPriceFeed,   // _vaultPriceFeed
    addresses.FastPriceEvents,  // _fastPriceEvents
    deployer.address      // _tokenManager
  )
  await fastPriceFeed.deployed()
  console.log("✓ FastPriceFeed      :", fastPriceFeed.address)

  // 5. Adresleri deployed-addresses.json'a yaz
  const updated = {
    ...addresses,
    PythPriceFeed_ETH:  pythFeedETH.address,
    PythPriceFeed_BTC:  pythFeedBTC.address,
    PythPriceFeed_USDC: pythFeedUSDC.address,
    FastPriceFeed:      fastPriceFeed.address,
  }
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(updated, null, 2))
  console.log("")
  console.log("Adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/deployReaders.js --network initia_testnet")
}

main().catch(console.error)
