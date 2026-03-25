// scripts/deploy/deployReaders.js
// Reader ve VaultReader kontratlarını deploy eder.
const { ethers } = require("hardhat")
const fs = require("fs")

const ADDRESSES_FILE = "./deployed-addresses.json"

async function main() {
  // Gereksinim 2.5: deployed-addresses.json yoksa hata fırlat
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(
      "deployed-addresses.json bulunamadı. " +
      "Lütfen önce önceki deploy adımlarını çalıştırın:\n" +
      "  npx hardhat run scripts/deploy/deployAll.js --network initia_testnet\n" +
      "  npx hardhat run scripts/deploy/deployPositionRouter.js --network initia_testnet\n" +
      "  npx hardhat run scripts/deploy/deployPythOracle.js --network initia_testnet"
    )
  }

  const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE))
  const [deployer] = await ethers.getSigners()

  console.log("Deploying Reader contracts...")
  console.log("Deployer:", deployer.address)
  console.log("")

  // Gereksinim 2.1: Reader kontratını deploy et
  const Reader = await ethers.getContractFactory("Reader")
  const reader = await Reader.deploy()
  await reader.deployed()
  console.log("✓ Reader      :", reader.address)

  // Gereksinim 2.2: VaultReader kontratını deploy et
  const VaultReader = await ethers.getContractFactory("VaultReader")
  const vaultReader = await VaultReader.deploy()
  await vaultReader.deployed()
  console.log("✓ VaultReader :", vaultReader.address)

  // Gereksinim 2.3: Adresleri deployed-addresses.json'a yaz
  const updated = {
    ...addresses,
    Reader: reader.address,
    VaultReader: vaultReader.address,
  }
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(updated, null, 2))
  console.log("")
  console.log("Adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/deployStaking.js --network initia_testnet")
}

main().catch(console.error)
