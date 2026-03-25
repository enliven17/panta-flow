// scripts/deploy/deployAll.js
// Vault + Router + GlpManager — PANTA/PLP entegrasyonuyla
const { ethers } = require("hardhat")
const fs = require("fs")

function expandDecimals(n, decimals) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(decimals))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  const addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"))

  console.log("Deploying core contracts (Vault, Router, GlpManager)...")
  console.log("Using PLP  :", addresses.PLP)
  console.log("")

  // 1. USDG (Vault'un iç stablecoin'i — PantaDEX'te "PUSD" olarak rename edebilirsin)
  const USDG = await ethers.getContractFactory("USDG")
  const usdg = await USDG.deploy(deployer.address)
  await usdg.deployed()
  console.log("✓ USDG (internal)  :", usdg.address)

  // 2. Vault
  const Vault = await ethers.getContractFactory("Vault")
  const vault = await Vault.deploy()
  await vault.deployed()
  console.log("✓ Vault            :", vault.address)

  // 3. VaultUtils
  const VaultUtils = await ethers.getContractFactory("VaultUtils")
  const vaultUtils = await VaultUtils.deploy(vault.address)
  await vaultUtils.deployed()
  console.log("✓ VaultUtils       :", vaultUtils.address)

  // 4. VaultErrorController
  const VaultErrorController = await ethers.getContractFactory("VaultErrorController")
  const vaultErrorController = await VaultErrorController.deploy()
  await vaultErrorController.deployed()
  console.log("✓ VaultErrorCtrl   :", vaultErrorController.address)

  // 5. VaultPriceFeed (oracle — production'da Initia Slinky ile değiştir)
  const VaultPriceFeed = await ethers.getContractFactory("VaultPriceFeed")
  const vaultPriceFeed = await VaultPriceFeed.deploy()
  await vaultPriceFeed.deployed()
  console.log("✓ VaultPriceFeed   :", vaultPriceFeed.address)

  // 6. Router
  // NOT: WETH_ADDRESS = Initia testnet'teki wrapped native token adresi
  const WETH_ADDRESS = addresses.WETH   // deployFaucetTokens.js ile deploy edilen FaucetToken
  const Router = await ethers.getContractFactory("Router")
  const router = await Router.deploy(vault.address, usdg.address, WETH_ADDRESS)
  await router.deployed()
  console.log("✓ Router           :", router.address)

  // 7. GlpManager — PLP tokenını kullanır
  const GlpManager = await ethers.getContractFactory("GlpManager")
  const COOLDOWN = 15 * 60 // 15 dakika
  const glpManager = await GlpManager.deploy(
    vault.address,
    usdg.address,
    addresses.PLP,        // ← GMX'teki GLP yerine bizim PLP
    ethers.constants.AddressZero,
    COOLDOWN
  )
  await glpManager.deployed()
  console.log("✓ GlpManager (PLP) :", glpManager.address)

  // 8. Vault initialize
  await vault.initialize(
    router.address,
    usdg.address,
    vaultPriceFeed.address,
    expandDecimals(2, 30), // liquidationFeeUsd = $2
    100,                   // fundingRateFactor
    100                    // stableFundingRateFactor
  )
  await vault.setVaultUtils(vaultUtils.address)
  await vault.setErrorController(vaultErrorController.address)
  console.log("✓ Vault initialized")

  // 9. PLP minting yetkisi GlpManager'a ver
  const PLP = await ethers.getContractAt("PLP", addresses.PLP)
  await PLP.setMinter(glpManager.address, true)
  await usdg.addVault(glpManager.address)
  console.log("✓ PLP minter = GlpManager")

  // 10. Adresler
  const updated = {
    ...addresses,
    USDG:                usdg.address,
    Vault:               vault.address,
    VaultUtils:          vaultUtils.address,
    VaultErrorController: vaultErrorController.address,
    VaultPriceFeed:      vaultPriceFeed.address,
    Router:              router.address,
    GlpManager:          glpManager.address,
    WETH:                WETH_ADDRESS,
  }
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(updated, null, 2))
  console.log("")
  console.log("Tüm adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/deployPositionRouter.js --network initia_testnet")
}

main().catch(console.error)
