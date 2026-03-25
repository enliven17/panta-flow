// scripts/deploy/syncAddresses.js
// deployed-addresses.json → frontend/src/lib/contracts/addresses.ts senkronizasyonu
//
// Gereksinimler: 14.1, 14.2, 14.3, 14.4
//
// Kullanım:
//   node scripts/deploy/syncAddresses.js

const fs = require("fs")
const path = require("path")

const DEPLOYED_ADDRESSES_FILE = path.resolve(__dirname, "../../deployed-addresses.json")
const ADDRESSES_TS_FILE = path.resolve(
  __dirname,
  "../../frontend/src/lib/contracts/addresses.ts"
)

const PLACEHOLDER = "0x0000000000000000000000000000000000000000"

function main() {
  // Gereksinim 14.1: deployed-addresses.json oku
  if (!fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
    console.error("HATA: deployed-addresses.json bulunamadı:", DEPLOYED_ADDRESSES_FILE)
    console.error("Lütfen önce deploy scriptlerini çalıştırın.")
    process.exit(1)
  }

  const deployedAddresses = JSON.parse(
    fs.readFileSync(DEPLOYED_ADDRESSES_FILE, "utf8")
  )

  // Gereksinim 14.1: addresses.ts oku
  if (!fs.existsSync(ADDRESSES_TS_FILE)) {
    console.error("HATA: addresses.ts bulunamadı:", ADDRESSES_TS_FILE)
    process.exit(1)
  }

  let content = fs.readFileSync(ADDRESSES_TS_FILE, "utf8")

  // ADDRESSES objesindeki tüm key: value çiftlerini bul ve güncelle
  // Gereksinim 14.2: ADDRESSES objesindeki tüm adresleri güncelle
  // Gereksinim 14.3: deployed-addresses.json'da bulunmayanlar için PLACEHOLDER koru
  let updatedCount = 0

  // Her satırda `  Key: '0x...',` veya `  Key: PLACEHOLDER,` formatını eşleştir
  content = content.replace(
    /^(\s+)(\w+):\s*(?:'0x[0-9a-fA-F]*'|PLACEHOLDER),/gm,
    (match, indent, key) => {
      if (deployedAddresses[key] && deployedAddresses[key] !== PLACEHOLDER) {
        const newAddress = deployedAddresses[key]
        updatedCount++
        return `${indent}${key}: '${newAddress}',`
      }
      // Gereksinim 14.3: deployed-addresses.json'da yoksa PLACEHOLDER koru
      return match
    }
  )

  // Gereksinim 14.1: Güncellenmiş içeriği geri yaz
  fs.writeFileSync(ADDRESSES_TS_FILE, content, "utf8")

  // Gereksinim 14.4: Güncellenen adres sayısını logla
  console.log(`syncAddresses: ${updatedCount} adres güncellendi.`)
  console.log(`  Kaynak : ${DEPLOYED_ADDRESSES_FILE}`)
  console.log(`  Hedef  : ${ADDRESSES_TS_FILE}`)
}

main()
