# Gereksinimler Dokümanı — PantaDEX on Flow

## Giriş

PantaDEX on Flow, PantaDEX'in (Initia EVM üzerinde Solidity ile yazılmış GMX-fork perpetual DEX) Flow blockchain versiyonudur. Proje adı ve token isimleri (PANTA, PLP, esPANTA) aynı kalacak; yalnızca altyapı Flow'a taşınacaktır. Tüm akıllı kontratlar **native Flow Cadence** ile yazılacak — EVM katmanı kullanılmayacak. Altyapı Flow Testnet'e taşınacak, frontend ve backend Flow Cadence'a özgü referanslarla güncellenecektir. Frontend renk teması yeşil tonlarına dönüştürülecektir. Kullanıcılar Flow Testnet faucet'inden test USDC alarak kaldıraçlı işlem yapabilecek, likidite sağlayabilecek ve staking ödülleri kazanabilecektir.

---

## Sözlük

- **PantaDEX_System**: Bu projenin tamamı — Cadence kontratları, frontend ve backend dahil. Proje adı "PANTA" markası altında devam eder.
- **Vault**: Likidite havuzunu yöneten ana Cadence kontratı. Tüm teminat varlıkları burada tutulur.
- **PLP_Contract**: PANTA Liquidity Provider token'ını yöneten Cadence kontratı.
- **PANTA_Contract**: Governance ve utility token'ını yöneten Cadence kontratı.
- **EsPANTA_Contract**: Escrowed PANTA token'ını yöneten Cadence kontratı.
- **PositionManager**: Pozisyon açma, kapatma ve tasfiye işlemlerini yöneten Cadence kontratı.
- **PriceFeed**: Fiyat verisi sağlayan oracle entegrasyon kontratı (IncrementFi veya Band Oracle — native Cadence).
- **Faucet_Contract**: Test USDC dağıtan Cadence faucet kontratı.
- **MockUSDC**: Flow Cadence Testnet'te deploy edilecek test USDC token'ı (native Cadence FungibleToken).
- **Trader**: Kaldıraçlı pozisyon açan kullanıcı.
- **LP_Provider**: Vault'a likidite sağlayan kullanıcı.
- **Staker**: PANTA veya PLP stake eden kullanıcı.
- **Admin**: Kontrat yöneticisi, governance yetkisine sahip hesap.
- **Flow_Testnet**: Flow blockchain test ağı — Cadence erişim noktası: `access.devnet.nodes.onflow.org:9000`.
- **Cadence**: Flow blockchain'in native akıllı kontrat dili. EVM kullanılmaz.
- **FungibleToken**: Flow'un standart fungible token arayüzü (`0x9a0766d93b6608b7` testnet).
- **FlowToken**: Native FLOW token'ı (`0x7e60df042a9c0868` testnet).
- **Long_Position**: Fiyat artışına bahis yapılan kaldıraçlı pozisyon.
- **Short_Position**: Fiyat düşüşüne bahis yapılan kaldıraçlı pozisyon.
- **AUM**: Assets Under Management — vault'taki toplam varlık değeri (USD cinsinden).
- **Funding_Rate**: Long ve short pozisyonlar arasındaki periyodik ödeme oranı.
- **Liquidation**: Teminat yetersiz kaldığında pozisyonun zorla kapatılması.
- **Flow_CLI**: Flow blockchain ile etkileşim için komut satırı aracı (`flow` komutu).
- **FCL**: Flow Client Library — frontend'in Flow Cadence ile iletişim kurduğu JavaScript kütüphanesi.
- **GreenTheme**: Frontend'de kullanılacak yeşil renk paleti — birincil `#00C853`, koyu `#1B5E20`, açık `#69F0AE`.

---

## Gereksinimler

### Gereksinim 1: PANTA Token Cadence Kontratı

**Kullanıcı Hikayesi:** Bir geliştirici olarak, Flow blockchain üzerinde PANTA governance token'ını native Cadence ile yönetmek istiyorum; böylece token ekonomisi Flow'un native standartlarına uygun çalışsın.

#### Kabul Kriterleri

1. THE PANTA_Contract SHALL FungibleToken standart arayüzünü (`0x9a0766d93b6608b7` testnet) implement etmek ZORUNDADIR.
2. THE PANTA_Contract SHALL maksimum 10.000.000 PANTA arzını aşmamak ZORUNDADIR.
3. THE PANTA_Contract SHALL ondalık hassasiyeti UFix64 (8 ondalık basamak) olarak tanımlamak ZORUNDADIR.
4. WHEN yetkili bir minter `mintTokens` fonksiyonunu çağırdığında, THE PANTA_Contract SHALL belirtilen miktarda PANTA token'ı basıp alıcı hesabına aktarmak ZORUNDADIR.
5. IF mint işlemi maksimum arzı aşacaksa, THEN THE PANTA_Contract SHALL işlemi iptal edip hata döndürmek ZORUNDADIR.
6. WHEN bir hesap `burnCallback` fonksiyonunu çağırdığında, THE PANTA_Contract SHALL belirtilen miktarda PANTA token'ı yakıp toplam arzı azaltmak ZORUNDADIR.
7. THE PANTA_Contract SHALL minter yetkisini yalnızca Admin tarafından atanabilir bir `Minter` resource olarak tanımlamak ZORUNDADIR.
8. THE PANTA_Contract SHALL token bakiyelerini her hesabın kendi storage'ında `Vault` resource olarak saklamak ZORUNDADIR.
9. FOR ALL geçerli PANTA Vault resource'ları, token miktarı sıfır veya pozitif olmak ZORUNDADIR (negatif bakiye imkansız).

---

### Gereksinim 2: PLP Token Cadence Kontratı

**Kullanıcı Hikayesi:** Bir likidite sağlayıcısı olarak, Flow üzerinde PLP token'ı alıp satmak istiyorum; böylece vault'taki payımı temsil eden bir token'a sahip olayım.

#### Kabul Kriterleri

1. THE PLP_Contract SHALL FungibleToken standart arayüzünü implement etmek ZORUNDADIR.
2. WHEN bir kullanıcı Vault'a USDC yatırdığında, THE PLP_Contract SHALL AUM ve mevcut PLP arzına göre hesaplanan miktarda PLP token basıp kullanıcıya göndermek ZORUNDADIR.
3. WHEN bir kullanıcı PLP token'larını geri verdiğinde, THE PLP_Contract SHALL orantılı USDC miktarını kullanıcıya iade edip PLP token'larını yakmak ZORUNDADIR.
4. THE PLP_Contract SHALL transfer işlemlerini yalnızca whitelist'teki kontratların (Vault, StakedPLP) gerçekleştirebileceği şekilde kısıtlamak ZORUNDADIR.
5. WHILE bir kullanıcı PLP mint ettikten sonra 15 dakika geçmemişse, THE PLP_Contract SHALL o kullanıcının PLP'sini redeem etmesine izin vermemek ZORUNDADIR.
6. THE PLP_Contract SHALL PLP fiyatını `AUM / totalSupply` formülüyle hesaplamak ZORUNDADIR.
7. IF vault'ta hiç PLP yoksa, THEN THE PLP_Contract SHALL ilk mint işleminde PLP fiyatını 1 USD olarak kabul etmek ZORUNDADIR.

---

### Gereksinim 3: esPANTA Token Cadence Kontratı

**Kullanıcı Hikayesi:** Bir staker olarak, staking ödüllerimi esPANTA olarak almak ve zamanla PANTA'ya vest etmek istiyorum; böylece uzun vadeli protokol katılımım ödüllendirilsin.

#### Kabul Kriterleri

1. THE EsPANTA_Contract SHALL FungibleToken standart arayüzünü implement etmek ZORUNDADIR.
2. THE EsPANTA_Contract SHALL transfer işlemlerini varsayılan olarak devre dışı bırakmak ZORUNDADIR; yalnızca whitelist'teki kontratlar (RewardTracker, Vester) transfer yapabilmek ZORUNDADIR.
3. WHEN bir kullanıcı esPANTA'yı vesting'e başlattığında, THE EsPANTA_Contract SHALL 365 günlük doğrusal vesting planı oluşturmak ZORUNDADIR.
4. WHEN vesting süresi dolduğunda, THE EsPANTA_Contract SHALL esPANTA'yı yakıp eşdeğer miktarda PANTA basıp kullanıcıya göndermek ZORUNDADIR.
5. WHEN bir kullanıcı vesting'i erken iptal ettiğinde, THE EsPANTA_Contract SHALL vest olmamış esPANTA'yı kullanıcıya iade etmek ZORUNDADIR.
6. THE EsPANTA_Contract SHALL her kullanıcının vesting durumunu (başlangıç zamanı, miktar, vest edilen miktar) sorgulanabilir şekilde saklamak ZORUNDADIR.

---

### Gereksinim 4: Vault (Likidite Havuzu) Cadence Kontratı

**Kullanıcı Hikayesi:** Bir likidite sağlayıcısı olarak, USDC'mi Flow Vault'una yatırmak istiyorum; böylece trading fee'lerinden pay alayım ve esPANTA ödülleri kazanayım.

#### Kabul Kriterleri

1. THE Vault SHALL MockUSDC ve FlowToken'ı teminat olarak kabul etmek ZORUNDADIR.
2. WHEN bir kullanıcı desteklenen bir token yatırdığında, THE Vault SHALL PriceFeed'den güncel fiyatı alıp USD değerini hesaplayarak orantılı PLP token basıp kullanıcıya göndermek ZORUNDADIR.
3. WHEN bir kullanıcı PLP token'larını redeem ettiğinde, THE Vault SHALL mevcut AUM'a göre orantılı token miktarını kullanıcıya iade etmek ZORUNDADIR.
4. THE Vault SHALL her token için ayrı havuz miktarı, rezerv miktarı ve fee rezervini takip etmek ZORUNDADIR.
5. THE Vault SHALL swap işlemlerinde `swapFeeBasisPoints` (varsayılan: 30 bps = %0.3) oranında fee kesmek ZORUNDADIR.
6. THE Vault SHALL margin işlemlerinde `marginFeeBasisPoints` (varsayılan: 10 bps = %0.1) oranında fee kesmek ZORUNDADIR.
7. THE Vault SHALL toplanan fee'lerin %70'ini PLP staker'larına, %30'unu protokol hazinesine dağıtmak ZORUNDADIR.
8. WHILE bir token'ın rezerv miktarı havuz miktarını aşıyorsa, THE Vault SHALL o token için yeni pozisyon açılmasına izin vermemek ZORUNDADIR.
9. THE Vault SHALL maksimum kaldıraç oranını 50x olarak sınırlamak ZORUNDADIR.
10. THE Vault SHALL funding rate'i her 8 saatte bir güncellemek ZORUNDADIR.

---

### Gereksinim 5: Pozisyon Yönetimi (PositionManager) Cadence Kontratı

**Kullanıcı Hikayesi:** Bir trader olarak, Flow üzerinde kaldıraçlı long ve short pozisyonlar açmak ve kapatmak istiyorum; böylece kripto varlıkların fiyat hareketlerinden kar edeyim.

#### Kabul Kriterleri

1. WHEN bir Trader `increasePosition` çağırdığında, THE PositionManager SHALL teminat token'ını Vault'a transfer edip pozisyon kaydını oluşturmak veya güncellemek ZORUNDADIR.
2. THE PositionManager SHALL pozisyon anahtarını `(hesap_adresi, teminat_token, index_token, isLong)` kombinasyonundan türetmek ZORUNDADIR.
3. WHEN bir Trader `decreasePosition` çağırdığında, THE PositionManager SHALL pozisyon boyutunu azaltıp kar/zarar hesaplayarak teminatı kullanıcıya iade etmek ZORUNDADIR.
4. THE PositionManager SHALL pozisyon açarken minimum teminat miktarını 10 USD olarak uygulamak ZORUNDADIR.
5. IF bir pozisyonun teminat oranı tasfiye eşiğinin altına düşerse, THEN THE PositionManager SHALL pozisyonu tasfiye edip tasfiye ücretini tasfiyeciye göndermek ZORUNDADIR.
6. THE PositionManager SHALL tasfiye ücretini maksimum 5 USD veya kalan teminatın %10'u (hangisi küçükse) olarak hesaplamak ZORUNDADIR.
7. WHEN bir pozisyon açılırken, THE PositionManager SHALL PriceFeed'den anlık fiyatı alıp ortalama giriş fiyatını hesaplamak ZORUNDADIR.
8. THE PositionManager SHALL long pozisyonlar için maksimum fiyatı, short pozisyonlar için minimum fiyatı kullanmak ZORUNDADIR (spread koruması).
9. THE PositionManager SHALL her açık pozisyon için funding fee'yi periyodik olarak hesaplayıp uygulamak ZORUNDADIR.
10. WHILE kaldıraç oranı maksimum kaldıraç sınırını aşıyorsa, THE PositionManager SHALL pozisyon artırma işlemini reddetmek ZORUNDADIR.
11. THE PositionManager SHALL global short pozisyon boyutunu ve ortalama fiyatını takip etmek ZORUNDADIR.

---

### Gereksinim 6: Fiyat Oracle Entegrasyonu (Native Cadence)

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, Flow Testnet'teki native Cadence oracle'larından güvenilir fiyat verisi almak istiyorum; böylece pozisyon hesaplamaları doğru fiyatlarla yapılsın.

#### Kabul Kriterleri

1. THE PriceFeed SHALL IncrementFi PublicPriceOracle (`0x8232ce4a3aff4e94` testnet) veya Band Oracle (`0x9fb6606c300b5051` testnet) ile native Cadence import üzerinden entegre olmak ZORUNDADIR.
2. THE PriceFeed SHALL USDC/USD ve FLOW/USD fiyat çiftlerini desteklemek ZORUNDADIR.
3. WHEN PriceFeed bir fiyat sorgulandığında, THE PriceFeed SHALL hem minimum hem maksimum fiyatı (spread dahil) döndürmek ZORUNDADIR.
4. IF oracle'dan alınan fiyat 30 dakikadan eskiyse, THEN THE PriceFeed SHALL işlemi durdurup "stale price" hatası döndürmek ZORUNDADIR.
5. THE PriceFeed SHALL fiyat hassasiyetini UFix64 formatında normalize etmek ZORUNDADIR.
6. WHERE yedek oracle konfigüre edilmişse, THE PriceFeed SHALL birincil oracle başarısız olduğunda yedek oracle'a geçmek ZORUNDADIR.

---

### Gereksinim 7: Test USDC Faucet Sistemi (Native Cadence)

**Kullanıcı Hikayesi:** Bir testnet kullanıcısı olarak, Flow Testnet'te test USDC almak istiyorum; böylece PantaDEX on Flow'u gerçek para harcamadan deneyebiliyeyim.

#### Kabul Kriterleri

1. THE Faucet_Contract SHALL native Cadence FungibleToken standardında bir MockUSDC kontratı deploy etmek ZORUNDADIR.
2. THE Faucet_Contract SHALL her hesaba 24 saatte bir maksimum 1.000 MockUSDC dağıtmak ZORUNDADIR.
3. WHEN bir kullanıcı faucet transaction'ını çalıştırdığında, THE Faucet_Contract SHALL kullanıcının son talep zamanını kontrol edip 24 saat geçmişse token göndermek ZORUNDADIR.
4. IF bir kullanıcı 24 saat geçmeden tekrar talep ederse, THEN THE Faucet_Contract SHALL işlemi reddedip kalan bekleme süresini döndürmek ZORUNDADIR.
5. THE Faucet_Contract SHALL faucet rezervinin mevcut bakiyesini Cadence script ile sorgulanabilir şekilde sunmak ZORUNDADIR.
6. WHEN faucet rezervi 10.000 MockUSDC'nin altına düşerse, THE Faucet_Contract SHALL Admin'e uyarı event'i yayınlamak ZORUNDADIR.
7. THE Faucet_Contract SHALL resmi Flow faucet'ini (`https://faucet.flow.com/fund-account`) FLOW token almak için frontend'de referans göstermek ZORUNDADIR.

---

### Gereksinim 8: Staking ve Ödül Sistemi

**Kullanıcı Hikayesi:** Bir PANTA veya PLP sahibi olarak, token'larımı stake etmek istiyorum; böylece esPANTA ödülleri ve trading fee payı kazanayım.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL PANTA stake etme ve esPANTA ödülü kazanma işlevini desteklemek ZORUNDADIR.
2. THE PantaDEX_System SHALL PLP stake etme, esPANTA ödülü ve fee payı kazanma işlevini desteklemek ZORUNDADIR.
3. WHEN bir kullanıcı PANTA stake ettiğinde, THE PantaDEX_System SHALL stake miktarını ve başlangıç zamanını kaydetmek ZORUNDADIR.
4. THE PantaDEX_System SHALL ödül dağıtımını Flow blok yüksekliği bazlı olarak hesaplayıp her kullanıcının birikmiş ödülünü takip etmek ZORUNDADIR.
5. WHEN bir kullanıcı ödüllerini talep ettiğinde, THE PantaDEX_System SHALL birikmiş esPANTA miktarını kullanıcı hesabına aktarmak ZORUNDADIR.
6. WHEN bir kullanıcı stake'ini çektiğinde, THE PantaDEX_System SHALL stake edilen token'ları ve birikmiş ödülleri kullanıcıya iade etmek ZORUNDADIR.

---

### Gereksinim 9: Frontend Güncelleme (FCL Entegrasyonu, Yeşil Renk Teması)

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, PantaDEX on Flow frontend'inin native Flow Cadence ile iletişim kurmasını, yeşil renk temasıyla sunulmasını ve PANTA markasını korumasını istiyorum.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL frontend'deki tüm "Initia" referanslarını "Flow" ile değiştirmek ZORUNDADIR.
2. THE PantaDEX_System SHALL wallet bağlantısını FCL (Flow Client Library) üzerinden Flow Cadence cüzdanlarını (Flow Wallet, Blocto, Lilico) destekleyecek şekilde yapılandırmak ZORUNDADIR — EVM/MetaMask bağlantısı kullanılmayacaktır.
3. THE PantaDEX_System SHALL FCL'i Flow Testnet'e (`accessNode.api: "https://rest-testnet.onflow.org"`, `discovery.wallet: "https://fcl-discovery.onflow.org/testnet/authn"`) bağlanacak şekilde konfigüre etmek ZORUNDADIR.
4. THE PantaDEX_System SHALL tüm kontrat çağrılarını FCL `query` (script) ve `mutate` (transaction) fonksiyonları üzerinden yapmak ZORUNDADIR.
5. THE PantaDEX_System SHALL block explorer linklerini Flow Testnet Cadence explorer'ına (`https://testnet.flowscan.io`) yönlendirmek ZORUNDADIR.
6. THE PantaDEX_System SHALL faucet sayfasında Flow resmi faucet linkini (`https://faucet.flow.com/fund-account`) ve MockUSDC Cadence faucet'ini göstermek ZORUNDADIR.
7. WHEN bir kullanıcı yanlış ağa bağlıysa, THE PantaDEX_System SHALL kullanıcıyı Flow Testnet'e geçmesi için uyarmak ZORUNDADIR.
8. THE PantaDEX_System SHALL frontend renk temasını yeşil tonlarına dönüştürmek ZORUNDADIR; birincil renk `#00C853`, ikincil renk `#1B5E20`, vurgu rengi `#69F0AE` olarak tanımlanmak ZORUNDADIR.
9. THE PantaDEX_System SHALL mevcut renk paletini tamamen GreenTheme ile değiştirmek ZORUNDADIR; butonlar, grafikler, badge'ler ve navigasyon öğeleri dahil tüm UI bileşenlerinde yeşil tema uygulanmak ZORUNDADIR.
10. THE PantaDEX_System SHALL proje adını "PANTA" olarak korumak ZORUNDADIR; logo, başlık ve tüm marka referanslarında "PANTA" ismi değiştirilmemek ZORUNDADIR.

---

### Gereksinim 10: Backend Güncelleme (Flow Cadence RPC Entegrasyonu)

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, backend'in Flow Cadence Testnet Access Node'una bağlanmasını istiyorum; böylece fiyat ve istatistik verileri doğru ağdan çekilsin.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL backend'i Flow Cadence Testnet Access Node'una (`https://rest-testnet.onflow.org`) bağlanacak şekilde güncellemek ZORUNDADIR — EVM RPC kullanılmayacaktır.
2. THE PantaDEX_System SHALL backend'deki tüm "Initia" referanslarını "Flow" ile değiştirmek ZORUNDADIR.
3. THE PantaDEX_System SHALL deployed Cadence kontrat adreslerini Flow Testnet'e deploy edilen adreslerle güncellemek ZORUNDADIR.
4. WHEN backend `/api/prices` endpoint'i çağrıldığında, THE PantaDEX_System SHALL Flow Testnet Cadence oracle'larından (IncrementFi veya Band) güncel fiyat verisi döndürmek ZORUNDADIR.
5. THE PantaDEX_System SHALL backend block explorer URL'sini `https://testnet.flowscan.io` olarak güncellemek ZORUNDADIR.

---

### Gereksinim 11: Flow CLI ile Deployment

**Kullanıcı Hikayesi:** Bir geliştirici olarak, Cadence kontratlarını Flow CLI kullanarak Flow Testnet'e deploy etmek istiyorum; böylece standart Flow geliştirme iş akışını takip edebileyim.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL tüm Cadence kontratlarını `flow-perpdex/cadence/contracts/` dizininde organize etmek ZORUNDADIR.
2. THE PantaDEX_System SHALL `flow.json` konfigürasyon dosyasında tüm kontratları, hesapları ve deployment hedeflerini tanımlamak ZORUNDADIR.
3. WHEN `flow project deploy --network testnet` komutu çalıştırıldığında, THE PantaDEX_System SHALL tüm kontratları doğru sırayla (bağımlılık sırasına göre: FungibleToken → MockUSDC → PANTA → PLP → esPANTA → Vault → PositionManager) deploy etmek ZORUNDADIR.
4. THE PantaDEX_System SHALL FungibleToken, FlowToken ve diğer standart Flow bağımlılıklarını `flow.json` dependencies bölümünde tanımlamak ZORUNDADIR.
5. THE PantaDEX_System SHALL deployment sonrası kontrat adreslerini `deployed-addresses-flow.json` dosyasına kaydetmek ZORUNDADIR.
6. THE PantaDEX_System SHALL Cadence transaction ve script dosyalarını `cadence/transactions/` ve `cadence/scripts/` dizinlerinde organize etmek ZORUNDADIR.

---

### Gereksinim 12: Kontrat Güvenliği ve Erişim Kontrolü

**Kullanıcı Hikayesi:** Bir protokol güvenlik sorumlusu olarak, tüm Cadence kontratlarının güvenli erişim kontrolü mekanizmalarına sahip olmasını istiyorum; böylece yetkisiz işlemler engellensin.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL yönetici işlevlerini yalnızca `Admin` resource sahibi hesapların çağırabileceği şekilde kısıtlamak ZORUNDADIR.
2. THE PantaDEX_System SHALL Cadence'ın resource-oriented programlama modelini kullanarak token sahipliğini güvence altına almak ZORUNDADIR.
3. IF yetkisiz bir hesap admin fonksiyonu çağırmaya çalışırsa, THEN THE PantaDEX_System SHALL işlemi iptal edip "Unauthorized" hatası döndürmek ZORUNDADIR.
4. THE PantaDEX_System SHALL kritik parametre değişikliklerini (max leverage, fee oranları) yalnızca Admin'in yapabileceği şekilde kısıtlamak ZORUNDADIR.
5. THE PantaDEX_System SHALL Cadence'ın native resource güvenliğini kullanmak ZORUNDADIR — Solidity'deki reentrancy guard'a gerek yoktur, Cadence resource modeli bunu doğal olarak önler.
6. THE PantaDEX_System SHALL tüm dış kontrat çağrılarını Cadence interface üzerinden yapmak ZORUNDADIR.

---

### Gereksinim 13: Veri Bütünlüğü ve Doğruluk Özellikleri

**Kullanıcı Hikayesi:** Bir geliştirici olarak, Cadence kontratlarının veri yapılarını doğru şekilde yönetmesini istiyorum; böylece on-chain veri tutarlı kalsın.

#### Kabul Kriterleri

1. THE PantaDEX_System SHALL pozisyon verilerini (boyut, teminat, ortalama fiyat, funding rate) Cadence struct olarak tanımlamak ZORUNDADIR.
2. THE PantaDEX_System SHALL tüm parasal değerleri UFix64 tipinde saklamak ZORUNDADIR.
3. FOR ALL geçerli pozisyon struct'ları, `size >= collateral` koşulu sağlanmak ZORUNDADIR (kaldıraç invariantı).
4. THE PantaDEX_System SHALL event'leri tüm kritik işlemler için yayınlamak ZORUNDADIR (pozisyon açma/kapama, likidite ekleme/çıkarma, tasfiye).
5. WHEN bir pozisyon kaydı okunup yazıldığında, THE PantaDEX_System SHALL Cadence transaction atomicity'sini kullanarak veri bütünlüğünü korumak ZORUNDADIR.
