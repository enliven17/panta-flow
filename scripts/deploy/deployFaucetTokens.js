// scripts/deploy/deployFaucetTokens.js
// Testnet için FaucetToken olarak WETH (wrapped INIT) ve USDC deploy eder.
const { ethers } = require("hardhat")
const fs = require("fs")

function expandDecimals(n, decimals) {
  return ethers.BigNumber.from(n).mul(ethers.BigNumber.from(10).pow(decimals))
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying FaucetTokens with:", deployer.address)
  console.log("")

  const FaucetToken = await ethers.getContractFactory("FaucetToken")

  // 1. WETH — fake wrapped INIT (18 decimals)
  //    Droplet: 1 WETH per claim
  const weth = await FaucetToken.deploy(
    "Wrapped INIT",
    "WETH",
    18,
    expandDecimals(1, 18) // 1 WETH per faucet claim
  )
  await weth.deployed()
  console.log("✓ WETH (FaucetToken):", weth.address)

  // 2. USDC — fake stablecoin (6 decimals)
  //    Droplet: 1000 USDC per claim
  const usdc = await FaucetToken.deploy(
    "USD Coin",
    "USDC",
    6,
    expandDecimals(1000, 6) // 1000 USDC per faucet claim
  )
  await usdc.deployed()
  console.log("✓ USDC (FaucetToken):", usdc.address)

  // 3. Deployer'a başlangıç bakiyesi mint et (testnet likiditesi)
  await weth.mint(deployer.address, expandDecimals(1000, 18))   // 1000 WETH
  await usdc.mint(deployer.address, expandDecimals(1000000, 6)) // 1,000,000 USDC
  console.log("✓ Initial balances minted to deployer")

  // 4. Faucet'leri aktive et (herkes 8 saatte bir claim edebilir)
  await weth.enableFaucet()
  await usdc.enableFaucet()
  console.log("✓ Faucets enabled")

  // 5. Adresleri kaydet
  let addresses = {}
  if (fs.existsSync("./deployed-addresses.json")) {
    addresses = JSON.parse(fs.readFileSync("./deployed-addresses.json"))
  }

  const updated = {
    ...addresses,
    WETH: weth.address,
    USDC: usdc.address,
  }
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(updated, null, 2))
  console.log("")
  console.log("Adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/deployOracle.js --network initia_testnet")
}

main().catch(console.error)
