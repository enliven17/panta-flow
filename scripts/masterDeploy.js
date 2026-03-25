// scripts/masterDeploy.js
// Tüm deploy adımlarını sırayla çalıştıran orkestrasyon scripti
//
// Gereksinimler: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.5
//
// Kullanım:
//   npx hardhat run scripts/masterDeploy.js --network initia_testnet
//   npx hardhat run scripts/masterDeploy.js --network initia_testnet -- --skip-staking

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Gereksinim 13.6: --skip-staking flag desteği
const SKIP_STAKING = process.argv.includes("--skip-staking")

// Gereksinim 13.4: Her adım arasında 2 saniye bekle
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Hardhat network argümanını process.argv'den çıkar
function getNetwork() {
  const networkIdx = process.argv.indexOf("--network")
  if (networkIdx !== -1 && process.argv[networkIdx + 1]) {
    return process.argv[networkIdx + 1]
  }
  return "hardhat"
}

// Bir deploy scriptini çalıştır
function runScript(scriptPath, network) {
  const cmd = `npx hardhat run ${scriptPath} --network ${network}`
  execSync(cmd, { stdio: "inherit" })
}

// Gereksinim 13.5: deployed-addresses.json özetini logla
function logAddressSummary() {
  const addressFile = path.resolve(__dirname, "../deployed-addresses.json")
  if (!fs.existsSync(addressFile)) {
    console.log("  (deployed-addresses.json bulunamadı)")
    return
  }
  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"))
  const keys = Object.keys(addresses)
  const maxKeyLen = Math.max(...keys.map((k) => k.length))
  keys.forEach((key) => {
    console.log(`  ${key.padEnd(maxKeyLen)} : ${addresses[key]}`)
  })
}

async function main() {
  const network = getNetwork()

  console.log("╔══════════════════════════════════════════════════╗")
  console.log("║         PantaDEX Master Deploy Script            ║")
  console.log("╚══════════════════════════════════════════════════╝")
  console.log("")
  console.log(`Network      : ${network}`)
  console.log(`Skip Staking : ${SKIP_STAKING}`)
  console.log("")

  // Gereksinim 13.1: Deploy adımları sırası
  // Gereksinim 13.6: --skip-staking ile deployStaking atlanır
  const steps = [
    { name: "deployTokens",       script: "scripts/deploy/deployTokens.js" },
    { name: "deployFaucetTokens", script: "scripts/deploy/deployFaucetTokens.js" },
    { name: "deployOracle",       script: "scripts/deploy/deployOracle.js" },
    { name: "deployAll",          script: "scripts/deploy/deployAll.js" },
    { name: "deployPositionRouter", script: "scripts/deploy/deployPositionRouter.js" },
    { name: "deployPythOracle",   script: "scripts/deploy/deployPythOracle.js" },
    { name: "deployReaders",      script: "scripts/deploy/deployReaders.js" },
    ...(SKIP_STAKING
      ? []
      : [{ name: "deployStaking", script: "scripts/deploy/deployStaking.js" }]),
    { name: "setupVault",         script: "scripts/deploy/setupVault.js" },
    { name: "syncAddresses",      script: "scripts/deploy/syncAddresses.js" }, // Gereksinim 14.5
  ]

  const totalSteps = steps.length
  let completedSteps = 0

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const stepNum = i + 1

    console.log(`\n[${stepNum}/${totalSteps}] ▶ ${step.name}`)
    console.log("─".repeat(50))

    try {
      runScript(step.script, network)
      completedSteps++

      // Gereksinim 13.2: Adımın başarılı olduğunu logla
      console.log(`\n✓ [${stepNum}/${totalSteps}] ${step.name} tamamlandı`)

      // Gereksinim 13.4: Sonraki adım varsa 2 saniye bekle
      if (i < steps.length - 1) {
        console.log("  (2 saniye bekleniyor...)")
        await sleep(2000)
      }
    } catch (err) {
      // Gereksinim 13.3: Hangi adımda hata oluştuğunu raporla ve dur
      console.error(`\n✗ [${stepNum}/${totalSteps}] ${step.name} BAŞARISIZ`)
      console.error("─".repeat(50))
      console.error(`Hata: ${err.message || err}`)
      console.error("")
      console.error(`Deploy ${step.name} adımında durdu.`)
      console.error(`Tamamlanan adımlar: ${completedSteps}/${totalSteps}`)
      if (completedSteps < totalSteps) {
        const remaining = steps.slice(i + 1).map((s) => s.name)
        console.error(`Çalıştırılmayan adımlar: ${remaining.join(", ")}`)
      }
      process.exit(1)
    }
  }

  // Gereksinim 13.5: Tüm adımlar tamamlandığında deployed-addresses.json özetini logla
  console.log("\n" + "═".repeat(50))
  console.log("✓ Tüm deploy adımları başarıyla tamamlandı!")
  console.log("═".repeat(50))
  console.log("")
  console.log("deployed-addresses.json özeti:")
  console.log("─".repeat(50))
  logAddressSummary()
  console.log("")
}

main().catch((err) => {
  console.error("masterDeploy beklenmedik hata:", err)
  process.exit(1)
})
