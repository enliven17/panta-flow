// scripts/deploy/deployStaking.js
// Staking kontratlarını deploy eder:
// RewardTracker x5, RewardDistributor x4, BonusDistributor x1, Vester x1, RewardRouter x1
const { ethers } = require("hardhat")
const fs = require("fs")

const ADDRESSES_FILE = "./deployed-addresses.json"
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60 // 31536000

async function main() {
  // Gereksinim 3.1: deployed-addresses.json yoksa hata fırlat
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error(
      "deployed-addresses.json bulunamadı. " +
      "Lütfen önce önceki deploy adımlarını çalıştırın."
    )
  }

  const addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE))
  const [deployer] = await ethers.getSigners()

  // Token adreslerini doğrula
  const required = ["PANTA", "esPANTA", "bnPANTA", "WETH", "GlpManager", "PLP"]
  for (const key of required) {
    if (!addresses[key]) {
      throw new Error(`deployed-addresses.json içinde '${key}' adresi bulunamadı.`)
    }
  }

  const { PANTA, esPANTA, bnPANTA, WETH, GlpManager, PLP } = addresses

  console.log("Deploying Staking contracts...")
  console.log("Deployer   :", deployer.address)
  console.log("PANTA      :", PANTA)
  console.log("esPANTA    :", esPANTA)
  console.log("bnPANTA    :", bnPANTA)
  console.log("WETH       :", WETH)
  console.log("GlpManager :", GlpManager)
  console.log("PLP        :", PLP)
  console.log("")

  const RewardTracker = await ethers.getContractFactory("RewardTracker")
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor")
  const BonusDistributor = await ethers.getContractFactory("BonusDistributor")
  const Vester = await ethers.getContractFactory("Vester")
  const RewardRouter = await ethers.getContractFactory("RewardRouter")

  // ─── 1. stakedPantaTracker ───────────────────────────────────────────────
  // Gereksinim 3.2: RewardTracker("Staked PANTA", "sPANTA")
  const stakedPantaTracker = await RewardTracker.deploy("Staked PANTA", "sPANTA")
  await stakedPantaTracker.deployed()
  console.log("✓ stakedPantaTracker     :", stakedPantaTracker.address)

  // ─── 2. stakedPantaDistributor ──────────────────────────────────────────
  // Gereksinim 3.3: RewardDistributor(esPANTA, stakedPantaTracker)
  const stakedPantaDistributor = await RewardDistributor.deploy(esPANTA, stakedPantaTracker.address)
  await stakedPantaDistributor.deployed()
  console.log("✓ stakedPantaDistributor :", stakedPantaDistributor.address)

  // stakedPantaTracker'ı initialize et: deposit token = PANTA, distributor = stakedPantaDistributor
  await stakedPantaTracker.initialize([PANTA, esPANTA], stakedPantaDistributor.address)
  console.log("  stakedPantaTracker initialized")

  // ─── 3. bonusPantaTracker ────────────────────────────────────────────────
  // Gereksinim 3.2: RewardTracker("Bonus PANTA", "bPANTA")
  const bonusPantaTracker = await RewardTracker.deploy("Bonus PANTA", "bPANTA")
  await bonusPantaTracker.deployed()
  console.log("✓ bonusPantaTracker      :", bonusPantaTracker.address)

  // ─── 4. bonusPantaDistributor ────────────────────────────────────────────
  // Gereksinim 3.3: BonusDistributor(bnPANTA, bonusPantaTracker)
  const bonusPantaDistributor = await BonusDistributor.deploy(bnPANTA, bonusPantaTracker.address)
  await bonusPantaDistributor.deployed()
  console.log("✓ bonusPantaDistributor  :", bonusPantaDistributor.address)

  // bonusPantaTracker'ı initialize et: deposit token = stakedPantaTracker
  await bonusPantaTracker.initialize([stakedPantaTracker.address], bonusPantaDistributor.address)
  console.log("  bonusPantaTracker initialized")

  // ─── 5. feePantaTracker ──────────────────────────────────────────────────
  // Gereksinim 3.2: RewardTracker("Fee PANTA", "fPANTA")
  const feePantaTracker = await RewardTracker.deploy("Fee PANTA", "fPANTA")
  await feePantaTracker.deployed()
  console.log("✓ feePantaTracker        :", feePantaTracker.address)

  // ─── 6. feePantaDistributor ──────────────────────────────────────────────
  // Gereksinim 3.3: RewardDistributor(WETH, feePantaTracker)
  const feePantaDistributor = await RewardDistributor.deploy(WETH, feePantaTracker.address)
  await feePantaDistributor.deployed()
  console.log("✓ feePantaDistributor    :", feePantaDistributor.address)

  // feePantaTracker'ı initialize et: deposit token = bonusPantaTracker + bnPANTA
  await feePantaTracker.initialize([bonusPantaTracker.address, bnPANTA], feePantaDistributor.address)
  console.log("  feePantaTracker initialized")

  // ─── 7. feePlpTracker ────────────────────────────────────────────────────
  // Gereksinim 3.2: RewardTracker("Fee PLP", "fPLP")
  const feePlpTracker = await RewardTracker.deploy("Fee PLP", "fPLP")
  await feePlpTracker.deployed()
  console.log("✓ feePlpTracker          :", feePlpTracker.address)

  // ─── 8. feePlpDistributor ────────────────────────────────────────────────
  // Gereksinim 3.3: RewardDistributor(WETH, feePlpTracker)
  const feePlpDistributor = await RewardDistributor.deploy(WETH, feePlpTracker.address)
  await feePlpDistributor.deployed()
  console.log("✓ feePlpDistributor      :", feePlpDistributor.address)

  // feePlpTracker'ı initialize et: deposit token = PLP
  await feePlpTracker.initialize([PLP], feePlpDistributor.address)
  console.log("  feePlpTracker initialized")

  // ─── 9. stakedPlpTracker ─────────────────────────────────────────────────
  // Gereksinim 3.2: RewardTracker("Staked PLP", "sPLP")
  const stakedPlpTracker = await RewardTracker.deploy("Staked PLP", "sPLP")
  await stakedPlpTracker.deployed()
  console.log("✓ stakedPlpTracker       :", stakedPlpTracker.address)

  // ─── 10. stakedPlpDistributor ────────────────────────────────────────────
  // Gereksinim 3.3: RewardDistributor(esPANTA, stakedPlpTracker)
  const stakedPlpDistributor = await RewardDistributor.deploy(esPANTA, stakedPlpTracker.address)
  await stakedPlpDistributor.deployed()
  console.log("✓ stakedPlpDistributor   :", stakedPlpDistributor.address)

  // stakedPlpTracker'ı initialize et: deposit token = feePlpTracker
  await stakedPlpTracker.initialize([feePlpTracker.address], stakedPlpDistributor.address)
  console.log("  stakedPlpTracker initialized")

  // ─── 11. Vester ──────────────────────────────────────────────────────────
  // Gereksinim 3.4: Vester("Vested PANTA", "vPANTA", 365 gün, esPANTA, feePantaTracker, PANTA, stakedPantaTracker)
  const vester = await Vester.deploy(
    "Vested PANTA",           // _name
    "vPANTA",                 // _symbol
    SECONDS_PER_YEAR,         // _vestingDuration (365 gün)
    esPANTA,                  // _esToken
    feePantaTracker.address,  // _pairToken
    PANTA,                    // _claimableToken
    stakedPantaTracker.address // _rewardTracker
  )
  await vester.deployed()
  console.log("✓ Vester                 :", vester.address)

  // ─── 12. RewardRouter ────────────────────────────────────────────────────
  // Gereksinim 3.5: RewardRouter deploy et
  const rewardRouter = await RewardRouter.deploy()
  await rewardRouter.deployed()
  console.log("✓ RewardRouter           :", rewardRouter.address)

  // Gereksinim 3.6: RewardRouter.initialize(...)
  await rewardRouter.initialize(
    WETH,                        // _weth
    PANTA,                       // _gmx (PANTA)
    esPANTA,                     // _esGmx (esPANTA)
    bnPANTA,                     // _bnGmx (bnPANTA)
    PLP,                         // _glp (PLP)
    stakedPantaTracker.address,  // _stakedGmxTracker
    bonusPantaTracker.address,   // _bonusGmxTracker
    feePantaTracker.address,     // _feeGmxTracker
    feePlpTracker.address,       // _feeGlpTracker
    stakedPlpTracker.address,    // _stakedGlpTracker
    GlpManager                   // _glpManager
  )
  console.log("  RewardRouter initialized")

  // ─── 13. Handler kayıtları ───────────────────────────────────────────────
  // Gereksinim 3.7: RewardRouter'ı tüm tracker'lara handler olarak kaydet
  console.log("")
  console.log("Handler kayıtları yapılıyor...")

  await stakedPantaTracker.setHandler(rewardRouter.address, true)
  console.log("  stakedPantaTracker.setHandler(rewardRouter) ✓")

  await bonusPantaTracker.setHandler(rewardRouter.address, true)
  console.log("  bonusPantaTracker.setHandler(rewardRouter) ✓")

  await feePantaTracker.setHandler(rewardRouter.address, true)
  console.log("  feePantaTracker.setHandler(rewardRouter) ✓")

  await feePlpTracker.setHandler(rewardRouter.address, true)
  console.log("  feePlpTracker.setHandler(rewardRouter) ✓")

  await stakedPlpTracker.setHandler(rewardRouter.address, true)
  console.log("  stakedPlpTracker.setHandler(rewardRouter) ✓")

  // ─── 14. Adresleri deployed-addresses.json'a yaz ─────────────────────────
  // Gereksinim 3.8 & 3.9: Tüm adresleri kaydet
  const updated = {
    ...addresses,
    stakedPantaTracker:    stakedPantaTracker.address,
    stakedPantaDistributor: stakedPantaDistributor.address,
    bonusPantaTracker:     bonusPantaTracker.address,
    bonusPantaDistributor: bonusPantaDistributor.address,
    feePantaTracker:       feePantaTracker.address,
    feePantaDistributor:   feePantaDistributor.address,
    feePlpTracker:         feePlpTracker.address,
    feePlpDistributor:     feePlpDistributor.address,
    stakedPlpTracker:      stakedPlpTracker.address,
    stakedPlpDistributor:  stakedPlpDistributor.address,
    Vester:                vester.address,
    RewardRouter:          rewardRouter.address,
  }
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(updated, null, 2))

  console.log("")
  console.log("Adresler deployed-addresses.json'a kaydedildi ✓")
  console.log("")
  console.log("Sonraki adım:")
  console.log("  npx hardhat run scripts/deploy/setupVault.js --network initia_testnet")
}

main().catch(console.error)
