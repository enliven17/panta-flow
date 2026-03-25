// scripts/deploy/deployTokens.js
// Deploy PANTA, esPANTA, PLP token contracts to Initia EVM Testnet

const { ethers } = require("hardhat")
const fs = require("fs")

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log("╔══════════════════════════════════════╗")
  console.log("║      PantaDEX Token Deployment       ║")
  console.log("║   Panta Rhei — Everything Flows      ║")
  console.log("╚══════════════════════════════════════╝")
  console.log("")
  console.log("Deployer :", deployer.address)
  console.log("Balance  :", ethers.utils.formatEther(await deployer.getBalance()), "ETH")
  console.log("")

  // ─── 1. PANTA ────────────────────────────────────────────
  console.log("Deploying PANTA...")
  const PANTA = await ethers.getContractFactory("PANTA")
  const panta = await PANTA.deploy()
  await panta.deployed()
  console.log("  ✓ PANTA     :", panta.address)

  // Governance'ı deployer'dan multisig'e devret (production'da)
  // await panta.setGov(MULTISIG_ADDRESS)

  // ─── 2. esPANTA ──────────────────────────────────────────
  console.log("Deploying esPANTA...")
  const EsPANTA = await ethers.getContractFactory("EsPANTA")
  const esPanta = await EsPANTA.deploy()
  await esPanta.deployed()
  console.log("  ✓ esPANTA   :", esPanta.address)

  // ─── 3. PLP ──────────────────────────────────────────────
  console.log("Deploying PLP...")
  const PLP = await ethers.getContractFactory("PLP")
  const plp = await PLP.deploy()
  await plp.deployed()
  console.log("  ✓ PLP       :", plp.address)

  // ─── Verify deployment ───────────────────────────────────
  const maxSupply = await panta.MAX_SUPPLY()
  console.log("")
  console.log("PANTA max supply :", ethers.utils.formatUnits(maxSupply, 18), "PANTA")
  console.log("PANTA philosophy :", await panta.philosophy())
  console.log("")

  // ─── Save addresses ──────────────────────────────────────
  let existing = {}
  if (fs.existsSync("./deployed-addresses.json")) {
    existing = JSON.parse(fs.readFileSync("./deployed-addresses.json"))
  }

  const updated = {
    ...existing,
    PANTA:   panta.address,
    esPANTA: esPanta.address,
    PLP:     plp.address,
  }

  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(updated, null, 2))

  console.log("╔══════════════════════════════════════╗")
  console.log("║         Deployed Addresses           ║")
  console.log("╠══════════════════════════════════════╣")
  console.log("║  PANTA  :", panta.address.slice(0, 20) + "...  ║")
  console.log("║ esPANTA :", esPanta.address.slice(0, 20) + "...  ║")
  console.log("║  PLP    :", plp.address.slice(0, 20) + "...  ║")
  console.log("╚══════════════════════════════════════╝")
  console.log("")
  console.log("Sonraki adım: deployAll.js (Vault, Router, GlpManager)")
  console.log("  npx hardhat run scripts/deploy/deployAll.js --network initia_testnet")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
