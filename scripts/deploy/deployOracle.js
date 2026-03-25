// scripts/deploy/deployOracle.js
// Initia ConnectOracle precompile için InitiaSlinkyPriceFeed adapter'larını deploy eder.
const { ethers } = require("hardhat")
const fs = require("fs")

// Initia EVM testnet ConnectOracle precompile adresi
const CONNECT_ORACLE = "0x031ECb63480983FD216D17BB6e1d393f3816b72F"

async function main() {
  const [deployer] = await ethers.getSigners()
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"))

  console.log("Deploying Slinky oracle adapters...")
  console.log("ConnectOracle precompile:", CONNECT_ORACLE)
  console.log("WETH:", addresses.WETH)
  console.log("USDC:", addresses.USDC)
  console.log("")

  const InitiaSlinkyPriceFeed = await ethers.getContractFactory("InitiaSlinkyPriceFeed")

  // ETH/USD adapter (WETH)
  const slinkyWETH = await InitiaSlinkyPriceFeed.deploy(
    CONNECT_ORACLE,
    "ETH/USD",
    "ETH / USD"
  )
  await slinkyWETH.deployed()
  console.log("✓ SlinkyFeed WETH (ETH/USD):", slinkyWETH.address)

  // USDC/USD adapter
  const slinkyUSDC = await InitiaSlinkyPriceFeed.deploy(
    CONNECT_ORACLE,
    "USDC/USD",
    "USDC / USD"
  )
  await slinkyUSDC.deployed()
  console.log("✓ SlinkyFeed USDC (USDC/USD):", slinkyUSDC.address)

  // Adres doğrulama: latestAnswer() çağrısı (testnet bağlantısı gerektirir)
  // Lokal'de çalıştırmayın, sadece initia_testnet network'ünde test edin
  console.log("")
  console.log("Oracle adreslerini kaydet...")

  const updated = {
    ...addresses,
    ConnectOracle:   CONNECT_ORACLE,
    SlinkyFeed_WETH: slinkyWETH.address,
    SlinkyFeed_USDC: slinkyUSDC.address,
  }
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(updated, null, 2))
  console.log("Adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/deployAll.js --network initia_testnet")
}

main().catch(console.error)
