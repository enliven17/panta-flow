# Uygulama Planı: PantaDEX on Flow

## Genel Bakış

Bu plan, PantaDEX'in native Flow Cadence ile yeniden yazılmasını kapsar. Görevler bağımlılık sırasına göre düzenlenmiştir: proje iskeleti → token kontratları → oracle → vault → pozisyon yönetimi → faucet/staking → transactions/scripts → frontend FCL entegrasyonu → backend güncelleme → deployment → entegrasyon testleri.

## Görevler

- [x] 1. Proje İskeleti ve flow.json Konfigürasyonu
  - `flow-perpdex/` dizin yapısını oluştur: `cadence/contracts/`, `cadence/transactions/`, `cadence/scripts/`, `tests/`
  - `flow.json` dosyasını tüm kontratlar, hesaplar, bağımlılıklar (FungibleToken, FlowToken) ve testnet deployment hedefleriyle yaz
  - `deployed-addresses-flow.json` şablon dosyasını oluştur
  - _Gereksinimler: 11.1, 11.2, 11.4, 11.6_

- [x] 2. MockUSDC.cdc Kontratı
  - [x] 2.1 MockUSDC.cdc kontratını yaz
    - FungibleToken standart arayüzünü implement et
    - `Vault` resource, `Minter` resource ve `Admin` resource tanımla
    - `createEmptyVault`, `mintTokens`, `burnTokens` fonksiyonlarını implement et
    - _Gereksinimler: 7.1, 12.1, 12.2_

- [x] 3. PANTAToken.cdc Kontratı
  - [x] 3.1 PANTAToken.cdc kontratını yaz
    - FungibleToken arayüzünü implement et, `maxSupply = 10_000_000.0` sabiti tanımla
    - `Vault`, `Minter`, `Admin` resource'larını implement et
    - `mintTokens`'da max arz kontrolü (`assert`), `burnCallback`'de arz azaltma yaz
    - _Gereksinimler: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - [ ]* 3.2 Property testi: Maksimum Arz Invariantı (Property 1)
    - **Property 1: Maksimum Arz Invariantı**
    - **Validates: Requirements 1.2, 1.5**
  - [ ]* 3.3 Property testi: Mint/Burn Round-Trip (Property 2)
    - **Property 2: Mint/Burn Round-Trip**
    - **Validates: Requirements 1.6**
  - [ ]* 3.4 Property testi: Minter Erişim Kontrolü (Property 3)
    - **Property 3: Minter Erişim Kontrolü**
    - **Validates: Requirements 1.4, 1.7**
  - [ ]* 3.5 Property testi: Vault Bakiye Non-Negativity (Property 4)
    - **Property 4: Vault Bakiye Non-Negativity**
    - **Validates: Requirements 1.9**

- [x] 4. PLPToken.cdc Kontratı
  - [x] 4.1 PLPToken.cdc kontratını yaz
    - FungibleToken arayüzünü implement et
    - `lastMintTime` dictionary ile 15 dakika cooldown mekanizmasını implement et
    - `transferWhitelist` ile transfer kısıtlamasını implement et
    - `getPLPPrice(aum: UFix64): UFix64` fonksiyonunu yaz (`aum / totalSupply`, arz=0 ise 1.0)
    - `Minter` resource'unda `mintPLP` ve `burnPLP` fonksiyonlarını implement et
    - _Gereksinimler: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ]* 4.2 Property testi: PLP Mint Doğruluğu (Property 5)
    - **Property 5: PLP Mint Doğruluğu**
    - **Validates: Requirements 2.2, 4.2**
  - [ ]* 4.3 Property testi: PLP Redeem Round-Trip (Property 6)
    - **Property 6: PLP Redeem Round-Trip**
    - **Validates: Requirements 2.3, 4.3**
  - [ ]* 4.4 Property testi: PLP Transfer Whitelist (Property 7)
    - **Property 7: PLP Transfer Whitelist**
    - **Validates: Requirements 2.4**
  - [ ]* 4.5 Property testi: PLP Cooldown Kısıtlaması (Property 8)
    - **Property 8: PLP Cooldown Kısıtlaması**
    - **Validates: Requirements 2.5**
  - [ ]* 4.6 Property testi: PLP Fiyat Formülü (Property 9)
    - **Property 9: PLP Fiyat Formülü**
    - **Validates: Requirements 2.6**

- [x] 5. EsPANTAToken.cdc Kontratı
  - [x] 5.1 EsPANTAToken.cdc kontratını yaz
    - FungibleToken arayüzünü implement et, transfer whitelist mekanizmasını ekle
    - `VestingRecord` struct'ını tanımla: `startTime`, `totalAmount`, `vestedAmount`
    - `VESTING_DURATION = 365 * 24 * 3600` sabiti ile doğrusal vesting hesaplama implement et
    - `startVesting`, `claimVested`, `cancelVesting`, `getVestingStatus` fonksiyonlarını yaz
    - `claimVested`'da esPANTA yakıp PANTA basma mantığını implement et
    - _Gereksinimler: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 5.2 Property testi: esPANTA Transfer Kısıtlaması (Property 10)
    - **Property 10: esPANTA Transfer Kısıtlaması**
    - **Validates: Requirements 3.2**
  - [ ]* 5.3 Property testi: Vesting Round-Trip (Property 11)
    - **Property 11: Vesting Round-Trip**
    - **Validates: Requirements 3.4**
  - [ ]* 5.4 Property testi: Erken İptal İade Doğruluğu (Property 12)
    - **Property 12: Erken İptal İade Doğruluğu**
    - **Validates: Requirements 3.5**

- [x] 6. Checkpoint — Token kontratları tamamlandı
  - Tüm testler geçmeli, kullanıcıya soru varsa sor.

- [x] 7. PriceFeed.cdc Kontratı
  - [x] 7.1 PriceFeed.cdc kontratını yaz
    - `PriceData` struct'ını tanımla: `minPrice`, `maxPrice`, `timestamp`
    - IncrementFi `PublicPriceOracle` (`0x8232ce4a3aff4e94`) import ile birincil oracle entegrasyonunu implement et
    - Band Oracle (`0x9fb6606c300b5051`) yedek oracle olarak implement et
    - `STALE_PRICE_THRESHOLD = 1800.0` ile stale fiyat kontrolü ekle
    - `getPrice`, `getPrimaryPrice`, `getFallbackPrice` fonksiyonlarını yaz
    - UFix64 normalize etme ve spread hesaplama implement et
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 7.2 Property testi: Oracle Fiyat Aralığı (Property 25)
    - **Property 25: Oracle Fiyat Aralığı — minPrice <= maxPrice**
    - **Validates: Requirements 6.3**
  - [ ]* 7.3 Property testi: Oracle Fallback (Property 26)
    - **Property 26: Oracle Fallback**
    - **Validates: Requirements 6.6**

- [x] 8. Vault.cdc Kontratı
  - [x] 8.1 Vault.cdc kontratını yaz
    - `TokenPool` struct'ını tanımla: `poolAmount`, `reservedAmount`, `feeReserve`, `fundingRate`, `lastFundingTime`
    - `tokenPools` dictionary ile MockUSDC ve FlowToken havuzlarını yönet
    - `addLiquidity` ve `removeLiquidity` fonksiyonlarını PriceFeed entegrasyonuyla implement et
    - `SWAP_FEE_BPS = 30`, `MARGIN_FEE_BPS = 10`, `MAX_LEVERAGE = 50.0` sabitlerini tanımla
    - `calculateSwapFee`, `calculateMarginFee`, `distributeFees` (%70 LP / %30 hazine) implement et
    - `updateFundingRate` fonksiyonunu 8 saatlik interval ile implement et
    - Rezerv aşımı kontrolü: `reservedAmount <= poolAmount` invariantını koru
    - _Gereksinimler: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  - [ ]* 8.2 Property testi: Havuz/Rezerv Takibi (Property 13)
    - **Property 13: Havuz/Rezerv Takibi — reservedAmount <= poolAmount**
    - **Validates: Requirements 4.4**
  - [ ]* 8.3 Property testi: Fee Hesaplama Doğruluğu (Property 14)
    - **Property 14: Fee Hesaplama Doğruluğu**
    - **Validates: Requirements 4.5, 4.6**
  - [ ]* 8.4 Property testi: Fee Dağılımı (Property 15)
    - **Property 15: Fee Dağılımı — %70 LP / %30 hazine**
    - **Validates: Requirements 4.7**
  - [ ]* 8.5 Property testi: Rezerv Aşımında Pozisyon Engeli (Property 16)
    - **Property 16: Rezerv Aşımında Pozisyon Engeli**
    - **Validates: Requirements 4.8**

- [x] 9. PositionManager.cdc Kontratı
  - [x] 9.1 PositionManager.cdc kontratını yaz
    - `Position` struct'ını tanımla: `size`, `collateral`, `averagePrice`, `entryFundingRate`, `isLong`, `lastIncreasedTime`
    - `getPositionKey(account, collateralToken, indexToken, isLong): String` implement et
    - `increasePosition` fonksiyonunu: min teminat kontrolü (10 USD), max kaldıraç (50x), PriceFeed entegrasyonu, rezerv güncelleme ile implement et
    - `decreasePosition` fonksiyonunu: PnL hesaplama (`(currentPrice - avgPrice) / avgPrice * size`), funding fee, teminat iadesi ile implement et
    - `liquidatePosition` fonksiyonunu: tasfiye eşiği kontrolü, `min(5.0, collateral * 0.10)` fee hesaplama ile implement et
    - `isLiquidatable` fonksiyonunu implement et
    - Long için maxPrice, short için minPrice spread korumasını implement et
    - `globalShortSizes` ve `globalShortAveragePrices` takibini implement et
    - _Gereksinimler: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_
  - [ ]* 9.2 Property testi: Pozisyon Anahtarı Determinizmi (Property 17)
    - **Property 17: Pozisyon Anahtarı Determinizmi**
    - **Validates: Requirements 5.2**
  - [ ]* 9.3 Property testi: Kar/Zarar Hesaplama Doğruluğu (Property 18)
    - **Property 18: Kar/Zarar Hesaplama Doğruluğu**
    - **Validates: Requirements 5.3**
  - [ ]* 9.4 Property testi: Minimum Teminat Kısıtlaması (Property 19)
    - **Property 19: Minimum Teminat Kısıtlaması**
    - **Validates: Requirements 5.4**
  - [ ]* 9.5 Property testi: Tasfiye Koşulu (Property 20)
    - **Property 20: Tasfiye Koşulu**
    - **Validates: Requirements 5.5**
  - [ ]* 9.6 Property testi: Tasfiye Ücreti Hesaplama (Property 21)
    - **Property 21: Tasfiye Ücreti — min(5.0, collateral * 0.10)**
    - **Validates: Requirements 5.6**
  - [ ]* 9.7 Property testi: Spread Koruması (Property 22)
    - **Property 22: Spread Koruması — long maxPrice, short minPrice**
    - **Validates: Requirements 5.8**
  - [ ]* 9.8 Property testi: Maksimum Kaldıraç Invariantı (Property 23)
    - **Property 23: Maksimum Kaldıraç Invariantı — size/collateral <= 50**
    - **Validates: Requirements 4.9, 5.10**
  - [ ]* 9.9 Property testi: Global Short İstatistikleri (Property 24)
    - **Property 24: Global Short İstatistikleri**
    - **Validates: Requirements 5.11**
  - [ ]* 9.10 Property testi: Pozisyon Size >= Collateral Invariantı (Property 31)
    - **Property 31: Pozisyon Size >= Collateral Invariantı**
    - **Validates: Requirements 13.3**

- [x] 10. Checkpoint — Vault ve PositionManager tamamlandı
  - Tüm testler geçmeli, kullanıcıya soru varsa sor.

- [x] 11. MockUSDCFaucet.cdc Kontratı
  - [x] 11.1 MockUSDCFaucet.cdc kontratını yaz
    - `DAILY_LIMIT = 1000.0`, `COOLDOWN = 86400.0`, `LOW_RESERVE_THRESHOLD = 10000.0` sabitlerini tanımla
    - `lastClaimTime` dictionary ile 24 saatlik rate limiting implement et
    - `claimTokens`, `getReserveBalance`, `getRemainingCooldown` fonksiyonlarını yaz
    - `LowReserveWarning` event'ini rezerv eşiği altına düşünce yayınla
    - _Gereksinimler: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ]* 11.2 Property testi: Faucet Rate Limiting (Property 27)
    - **Property 27: Faucet Rate Limiting — 86400 saniye cooldown**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 12. StakingRewards.cdc Kontratı
  - [x] 12.1 StakingRewards.cdc kontratını yaz
    - `StakeRecord` struct'ını tanımla: `stakedAmount`, `startBlock`, `lastClaimBlock`, `pendingRewards`
    - `pantaStakers` ve `plpStakers` dictionary'lerini implement et
    - `stakePANTA`, `stakePLP`, `unstake`, `claimRewards` fonksiyonlarını implement et
    - `calculatePendingRewards`: `stakedAmount * rewardPerBlock * (currentBlock - lastClaimBlock)` formülünü implement et
    - esPANTA ödül dağıtımını EsPANTAToken Minter ile entegre et
    - _Gereksinimler: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ]* 12.2 Property testi: Stake Ödül Hesaplama (Property 28)
    - **Property 28: Stake Ödül Hesaplama — rewardPerBlock formülü**
    - **Validates: Requirements 8.1, 8.2, 8.4**
  - [ ]* 12.3 Property testi: Stake Round-Trip (Property 29)
    - **Property 29: Stake Round-Trip — stake + unstake = orijinal miktar + ödüller**
    - **Validates: Requirements 8.3, 8.5, 8.6**

- [x] 13. Admin Erişim Kontrolü Property Testi
  - [ ]* 13.1 Property testi: Admin Erişim Kontrolü (Property 30)
    - **Property 30: Admin Erişim Kontrolü — Admin resource olmadan admin fonksiyonları başarısız olmalı**
    - **Validates: Requirements 12.1, 12.3, 12.4**

- [x] 14. Cadence Transactions
  - [x] 14.1 Token transaction'larını yaz
    - `cadence/transactions/panta/mint.cdc`: Admin Minter ile PANTA mint
    - `cadence/transactions/panta/burn.cdc`: PANTA burn
    - _Gereksinimler: 1.4, 1.6, 11.6_
  - [x] 14.2 Vault transaction'larını yaz
    - `cadence/transactions/vault/addLiquidity.cdc`: MockUSDC/FLOW yatır, PLP al
    - `cadence/transactions/vault/removeLiquidity.cdc`: PLP ver, token al
    - _Gereksinimler: 4.2, 4.3, 11.6_
  - [x] 14.3 Pozisyon transaction'larını yaz
    - `cadence/transactions/positions/increasePosition.cdc`
    - `cadence/transactions/positions/decreasePosition.cdc`
    - `cadence/transactions/positions/liquidate.cdc`
    - _Gereksinimler: 5.1, 5.3, 5.5, 11.6_
  - [x] 14.4 Staking ve vesting transaction'larını yaz
    - `cadence/transactions/staking/stake.cdc`, `unstake.cdc`, `claimRewards.cdc`
    - `cadence/transactions/vesting/startVesting.cdc`, `claimVested.cdc`
    - `cadence/transactions/faucet/claimUSDC.cdc`
    - _Gereksinimler: 8.3, 8.5, 8.6, 3.3, 3.4, 7.3, 11.6_

- [x] 15. Cadence Scripts
  - `cadence/scripts/getPrices.cdc`: PriceFeed'den USDC/USD ve FLOW/USD fiyatlarını sorgula
  - `cadence/scripts/getPosition.cdc`: Adres ve token parametresiyle pozisyon verisi döndür
  - `cadence/scripts/getVaultStats.cdc`: AUM, havuz miktarları, fee rezervleri döndür
  - `cadence/scripts/getPLPPrice.cdc`: Güncel PLP fiyatını hesapla
  - `cadence/scripts/getStakingInfo.cdc`: Stake miktarı ve bekleyen ödülleri döndür
  - `cadence/scripts/getFaucetBalance.cdc`: Faucet rezerv bakiyesini döndür
  - _Gereksinimler: 6.2, 7.5, 11.6_

- [x] 16. Checkpoint — Cadence katmanı tamamlandı
  - Tüm testler geçmeli, kullanıcıya soru varsa sor.

- [x] 17. Frontend FCL Konfigürasyonu ve Tema
  - [x] 17.1 FCL konfigürasyonunu yaz
    - `frontend/src/lib/config/flow.ts` dosyasını oluştur
    - `accessNode.api: "https://rest-testnet.onflow.org"`, `discovery.wallet: "https://fcl-discovery.onflow.org/testnet/authn"` ayarlarını yap
    - `flow.network: "testnet"` ile ağ kontrolü için `useFlowNetwork` hook'unu yaz
    - Tüm "Initia" referanslarını "Flow" ile değiştir, block explorer URL'sini `https://testnet.flowscan.io` yap
    - _Gereksinimler: 9.1, 9.2, 9.3, 9.7, 9.10_
  - [x] 17.2 Yeşil renk temasını uygula
    - CSS değişkenlerini güncelle: `--color-primary: #00C853`, `--color-dark: #1B5E20`, `--color-accent: #69F0AE`
    - Butonlar, grafikler, badge'ler ve navigasyon öğelerinde yeşil temayı uygula
    - Mevcut renk paletini tamamen GreenTheme ile değiştir
    - _Gereksinimler: 9.8, 9.9_

- [x] 18. Frontend FCL Hook'ları ve Kontrat Çağrıları
  - [x] 18.1 Wallet bağlantı hook'larını yaz
    - `useCurrentUser` ile FCL wallet bağlantısını implement et (Flow Wallet, Blocto, Lilico)
    - Yanlış ağ uyarısı bileşenini implement et
    - _Gereksinimler: 9.2, 9.7_
  - [x] 18.2 Pozisyon ve vault FCL hook'larını yaz
    - `usePositions`: `fcl.query` ile pozisyon verisi çek
    - `useVaultStats`: AUM ve havuz istatistiklerini çek
    - `usePLPPrice`: Güncel PLP fiyatını çek
    - Tüm kontrat çağrılarını `fcl.query` (script) ve `fcl.mutate` (transaction) üzerinden yap
    - _Gereksinimler: 9.4_
  - [x] 18.3 Staking ve faucet FCL hook'larını yaz
    - `useStakingInfo`: Stake bilgisi ve bekleyen ödülleri çek
    - Faucet sayfasında Flow resmi faucet linkini (`https://faucet.flow.com/fund-account`) ve MockUSDC faucet'ini göster
    - _Gereksinimler: 9.5, 9.6_
  - [x] 18.4 FCL hata yönetimini implement et
    - `fcl.mutate` çağrılarında Cadence hata mesajlarını yakala ve kullanıcıya göster
    - "Max supply exceeded", "Leverage exceeds maximum" gibi hata mesajlarını Türkçe toast ile göster
    - _Gereksinimler: 9.4_

- [x] 19. Backend Flow SDK Entegrasyonu
  - [x] 19.1 Backend FCL konfigürasyonunu yaz
    - `backend/src/config/flow.ts` dosyasını oluştur, `@onflow/fcl` ile Flow Testnet'e bağlan
    - `backend/src/config/addresses.ts` dosyasını Flow Testnet kontrat adresleriyle güncelle
    - Tüm "Initia" referanslarını "Flow" ile değiştir
    - Block explorer URL'sini `https://testnet.flowscan.io` yap
    - _Gereksinimler: 10.1, 10.2, 10.3, 10.5_
  - [x] 19.2 Fiyat servisi Flow oracle entegrasyonunu yaz
    - `backend/src/services/priceService.ts` dosyasını güncelle
    - IncrementFi oracle Cadence script ile FLOW/USD ve USDC/USD fiyatlarını çek
    - `/api/prices` endpoint'inin Flow Testnet oracle verisi döndürmesini sağla
    - _Gereksinimler: 10.4_
  - [x] 19.3 Stats ve trades servislerini güncelle
    - `backend/src/services/statsService.ts` ve `tradesService.ts` dosyalarını Flow Cadence script'leriyle güncelle
    - viem bağımlılıklarını `@onflow/fcl` ile değiştir
    - _Gereksinimler: 10.1, 10.3_

- [x] 20. Flow Testnet Deployment
  - [x] 20.1 Deployment konfigürasyonunu hazırla
    - `flow.json` deployment sırasını doğrula: MockUSDC → PANTAToken → PLPToken → EsPANTAToken → PriceFeed → Vault → PositionManager → MockUSDCFaucet → StakingRewards
    - Testnet hesap anahtarını `panta-testnet.pkey` dosyasına yaz
    - _Gereksinimler: 11.2, 11.3, 11.4_
  - [x] 20.2 Deploy sonrası adres kaydını yaz
    - `flow project deploy --network testnet` çıktısından kontrat adreslerini `deployed-addresses-flow.json` dosyasına kaydet
    - Frontend ve backend konfigürasyonlarını deploy edilen adreslerle güncelle
    - _Gereksinimler: 11.5_

- [ ] 21. Entegrasyon Testleri
  - [ ]* 21.1 Cadence kontrat entegrasyon testlerini yaz
    - `tests/PANTAToken_test.cdc`: Mint, burn, transfer, erişim kontrolü birim testleri
    - `tests/PLPToken_test.cdc`: Mint formülü, redeem, cooldown birim testleri
    - `tests/Vault_test.cdc`: Likidite ekleme/çıkarma, fee dağılımı, stale oracle birim testleri
    - `tests/PositionManager_test.cdc`: Pozisyon açma/kapama, tasfiye birim testleri
    - `tests/StakingRewards_test.cdc`: Stake, unstake, ödül birim testleri
    - _Gereksinimler: 13.1, 13.2, 13.4_
  - [ ]* 21.2 Frontend FCL mock testlerini yaz
    - `@onflow/fcl` jest mock'u ile wallet bağlantısı ve kontrat çağrısı birim testleri
    - CSS değişken doğrulama testleri (yeşil tema)
    - Yanlış ağ uyarısı testi
    - _Gereksinimler: 9.7, 9.8_
  - [ ]* 21.3 Backend oracle entegrasyon testlerini yaz
    - IncrementFi/Band oracle mock ile `/api/prices` endpoint testi
    - Oracle başarısızlığında cached fiyat kullanımı testi
    - _Gereksinimler: 10.4_

- [x] 22. Final Checkpoint — Tüm testler geçmeli
  - Tüm Cadence, frontend ve backend testleri geçmeli, kullanıcıya soru varsa sor.

## Notlar

- `*` ile işaretli görevler isteğe bağlıdır, MVP için atlanabilir
- Her görev ilgili gereksinim numaralarına referans verir
- Property testleri minimum 100 iterasyon çalıştırılmalıdır (Cadence Testing Framework)
- Deployment sırası bağımlılık grafiğine göre kesinlikle uyulmalıdır
- Tüm parasal değerler UFix64 (8 ondalık basamak) tipinde saklanmalıdır
