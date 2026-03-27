# Tasarım Dokümanı — PantaDEX on Flow

## Genel Bakış

PantaDEX on Flow, GMX-fork mimarisinin native Flow Cadence ile yeniden yazılmış versiyonudur. Initia EVM üzerindeki Solidity implementasyonundan farklı olarak bu proje tamamen Cadence resource-oriented programlama modeli üzerine inşa edilmiştir — EVM katmanı kullanılmaz.

Sistem; kaldıraçlı perpetual işlemler (max 50x), likidite sağlama (PLP token), staking (PANTA + PLP → esPANTA ödülü) ve native Cadence oracle entegrasyonu sunar. Frontend Next.js + FCL (Flow Client Library) ile Flow Testnet'e bağlanır; yeşil renk teması (#00C853, #1B5E20, #69F0AE) ve PANTA marka kimliği korunur.

### Temel Tasarım Kararları

- **EVM yok**: Tüm kontratlar `.cdc` dosyaları, Cadence resource modeli kullanılır
- **Resource-oriented güvenlik**: Reentrancy guard gereksiz — Cadence'ın doğal güvencesi
- **UFix64 aritmetiği**: Tüm parasal değerler 8 ondalık basamaklı UFix64 tipinde
- **Capability tabanlı erişim**: Admin işlevleri `Admin` resource capability'si ile korunur
- **Atomik transaction'lar**: Cadence transaction'ları doğal olarak atomik — kısmi başarı yok

---

## Mimari

### Sistem Bileşenleri

```
┌─────────────────────────────────────────────────────────────────┐
│                        KULLANICI KATMANI                        │
│  Next.js 16 App Router  +  FCL (Flow Client Library)           │
│  Yeşil Tema: #00C853 / #1B5E20 / #69F0AE                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ FCL query / mutate
┌──────────────────────────▼──────────────────────────────────────┐
│                    FLOW TESTNET ACCESS NODE                     │
│         https://rest-testnet.onflow.org                        │
│         access.devnet.nodes.onflow.org:9000                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Cadence Scripts & Transactions
┌──────────────────────────▼──────────────────────────────────────┐
│                    CADENCE KONTRAT KATMANI                      │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐   │
│  │ PANTA Token │  │  PLP Token  │  │   esPANTA Token      │   │
│  │  (max 10M)  │  │ (kısıtlı)   │  │  (365 gün vesting)   │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘   │
│         │                │                     │               │
│  ┌──────▼──────────────────────────────────────▼───────────┐   │
│  │                    VAULT (Likidite Havuzu)               │   │
│  │   MockUSDC + FlowToken teminat                          │   │
│  │   AUM takibi, fee dağıtımı (%70 LP / %30 hazine)       │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼──────────────────────────────────┐   │
│  │              POSITION MANAGER                           │   │
│  │   Long/Short pozisyonlar, max 50x kaldıraç             │   │
│  │   Tasfiye, funding rate, spread koruması               │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼──────────────────────────────────┐   │
│  │                  PRICE FEED                             │   │
│  │   IncrementFi (0x8232ce4a3aff4e94) veya               │   │
│  │   Band Oracle (0x9fb6606c300b5051)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │  MockUSDC Faucet │  │  Staking (RewardTracker/Vester)  │    │
│  │  1000 USDC/gün   │  │  PANTA + PLP → esPANTA ödülü    │    │
│  └──────────────────┘  └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Dizin Yapısı

```
flow-perpdex/
├── flow.json                          # Flow CLI konfigürasyonu
├── cadence/
│   ├── contracts/
│   │   ├── MockUSDC.cdc               # Test USDC token
│   │   ├── PANTAToken.cdc             # Governance token (max 10M)
│   │   ├── PLPToken.cdc               # Likidite sağlayıcı token
│   │   ├── EsPANTAToken.cdc           # Escrowed PANTA (vesting)
│   │   ├── PriceFeed.cdc              # Oracle entegrasyon
│   │   ├── Vault.cdc                  # Likidite havuzu
│   │   ├── PositionManager.cdc        # Kaldıraçlı pozisyonlar
│   │   ├── MockUSDCFaucet.cdc         # Test faucet
│   │   └── StakingRewards.cdc         # Staking + ödül sistemi
│   ├── transactions/
│   │   ├── panta/mint.cdc
│   │   ├── panta/burn.cdc
│   │   ├── vault/addLiquidity.cdc
│   │   ├── vault/removeLiquidity.cdc
│   │   ├── positions/increasePosition.cdc
│   │   ├── positions/decreasePosition.cdc
│   │   ├── positions/liquidate.cdc
│   │   ├── staking/stake.cdc
│   │   ├── staking/unstake.cdc
│   │   ├── staking/claimRewards.cdc
│   │   ├── vesting/startVesting.cdc
│   │   ├── vesting/claimVested.cdc
│   │   └── faucet/claimUSDC.cdc
│   └── scripts/
│       ├── getPrices.cdc
│       ├── getPosition.cdc
│       ├── getVaultStats.cdc
│       ├── getPLPPrice.cdc
│       ├── getStakingInfo.cdc
│       └── getFaucetBalance.cdc
├── deployed-addresses-flow.json       # Deploy sonrası adresler
└── tests/
    ├── PANTAToken_test.cdc
    ├── PLPToken_test.cdc
    ├── Vault_test.cdc
    ├── PositionManager_test.cdc
    └── StakingRewards_test.cdc
```

### Deployment Sırası (Bağımlılık Grafiği)

```
FungibleToken (0x9a0766d93b6608b7) ← standart, deploy edilmez
    ↓
MockUSDC.cdc          ← bağımlılık yok
    ↓
PANTAToken.cdc        ← FungibleToken
    ↓
PLPToken.cdc          ← FungibleToken, PANTAToken
    ↓
EsPANTAToken.cdc      ← FungibleToken, PANTAToken
    ↓
PriceFeed.cdc         ← IncrementFi/Band oracle import
    ↓
Vault.cdc             ← MockUSDC, PLPToken, PriceFeed
    ↓
PositionManager.cdc   ← Vault, PriceFeed
    ↓
MockUSDCFaucet.cdc    ← MockUSDC
    ↓
StakingRewards.cdc    ← PANTAToken, PLPToken, EsPANTAToken
```

---

## Bileşenler ve Arayüzler

### 1. PANTAToken.cdc

```cadence
// Temel yapı
access(all) contract PANTAToken: FungibleToken {
    access(all) let maxSupply: UFix64          // 10_000_000.0
    access(all) var totalSupply: UFix64

    // Resource: kullanıcı bakiyesi
    access(all) resource Vault: FungibleToken.Vault {
        access(all) var balance: UFix64
        access(all) fun withdraw(amount: UFix64): @{FungibleToken.Vault}
        access(all) fun deposit(from: @{FungibleToken.Vault})
    }

    // Resource: mint yetkisi — yalnızca Admin dağıtabilir
    access(all) resource Minter {
        access(all) fun mintTokens(amount: UFix64): @Vault
    }

    // Resource: Admin — Minter oluşturma yetkisi
    access(all) resource Admin {
        access(all) fun createMinter(): @Minter
    }

    // Public fonksiyonlar
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault}
    access(all) fun getMaxSupply(): UFix64
    access(all) fun getTotalSupply(): UFix64
}
```

**Tasarım Kararı**: `Minter` resource'u Admin'in storage'ında tutulur. Mint yetkisi capability link ile paylaşılabilir ama doğrudan transfer edilemez — Cadence resource semantiği bunu garanti eder.

### 2. PLPToken.cdc

```cadence
access(all) contract PLPToken: FungibleToken {
    access(all) var totalSupply: UFix64
    access(all) var lastMintTime: {Address: UFix64}   // cooldown takibi
    access(all) var transferWhitelist: {Address: Bool} // Vault, StakedPLP

    access(all) resource Vault: FungibleToken.Vault {
        // transfer() override: whitelist kontrolü
        access(all) fun transfer(amount: UFix64, recipient: &{FungibleToken.Receiver})
    }

    access(all) resource Minter {
        // Vault kontratı tarafından çağrılır
        access(all) fun mintPLP(amount: UFix64): @Vault
        access(all) fun burnPLP(vault: @Vault)
    }

    // PLP fiyat hesaplama: AUM / totalSupply
    access(all) fun getPLPPrice(aum: UFix64): UFix64
}
```

**Tasarım Kararı**: 15 dakikalık cooldown `lastMintTime` dictionary'sinde blok timestamp ile takip edilir. Transfer whitelist, `Admin` resource ile yönetilir.

### 3. EsPANTAToken.cdc

```cadence
access(all) contract EsPANTAToken: FungibleToken {
    access(all) let VESTING_DURATION: UFix64  // 365 * 24 * 3600 saniye

    access(all) struct VestingRecord {
        access(all) let startTime: UFix64
        access(all) let totalAmount: UFix64
        access(all) var vestedAmount: UFix64
    }

    access(all) var vestingRecords: {Address: VestingRecord}
    access(all) var transferWhitelist: {Address: Bool}

    access(all) resource Vault: FungibleToken.Vault {
        // transfer() override: whitelist kontrolü
    }

    // Vesting işlemleri
    access(all) fun startVesting(account: Address, amount: UFix64)
    access(all) fun claimVested(account: Address): UFix64  // PANTA miktarı
    access(all) fun cancelVesting(account: Address): UFix64 // iade edilen esPANTA
    access(all) fun getVestingStatus(account: Address): VestingRecord?
}
```

**Tasarım Kararı**: Doğrusal vesting — `vestedAmount = totalAmount * (elapsed / VESTING_DURATION)`. Erken iptal durumunda `totalAmount - vestedAmount` kadar esPANTA iade edilir.

### 4. PriceFeed.cdc

```cadence
access(all) contract PriceFeed {
    access(all) let STALE_PRICE_THRESHOLD: UFix64  // 1800.0 saniye (30 dk)

    access(all) struct PriceData {
        access(all) let minPrice: UFix64
        access(all) let maxPrice: UFix64
        access(all) let timestamp: UFix64
    }

    // IncrementFi oracle interface
    access(all) resource interface IPriceOracle {
        access(all) fun getLatestPrice(symbol: String): UFix64
    }

    // Fiyat sorgulama — stale kontrolü dahil
    access(all) fun getPrice(symbol: String): PriceData
    access(all) fun getPrimaryPrice(symbol: String): PriceData?
    access(all) fun getFallbackPrice(symbol: String): PriceData?
}
```

**Oracle Entegrasyon Stratejisi**:
- Birincil: IncrementFi `PublicPriceOracle` (`0x8232ce4a3aff4e94`) — `import PublicPriceOracle from 0x8232ce4a3aff4e94`
- Yedek: Band Oracle (`0x9fb6606c300b5051`) — birincil başarısız veya stale olduğunda
- Her iki oracle da native Cadence interface üzerinden çağrılır

### 5. Vault.cdc

```cadence
access(all) contract Vault {
    access(all) let SWAP_FEE_BPS: UFix64      // 30.0 (0.3%)
    access(all) let MARGIN_FEE_BPS: UFix64    // 10.0 (0.1%)
    access(all) let MAX_LEVERAGE: UFix64      // 50.0
    access(all) let FUNDING_INTERVAL: UFix64  // 28800.0 saniye (8 saat)
    access(all) let LP_FEE_SHARE: UFix64      // 0.70
    access(all) let TREASURY_FEE_SHARE: UFix64 // 0.30

    access(all) struct TokenPool {
        access(all) var poolAmount: UFix64
        access(all) var reservedAmount: UFix64
        access(all) var feeReserve: UFix64
        access(all) var fundingRate: UFix64
        access(all) var lastFundingTime: UFix64
    }

    access(all) var tokenPools: {String: TokenPool}  // "USDC", "FLOW"
    access(all) var aum: UFix64

    // Likidite işlemleri
    access(all) fun addLiquidity(token: String, amount: UFix64, depositor: Address): UFix64
    access(all) fun removeLiquidity(plpAmount: UFix64, tokenOut: String, redeemer: Address): UFix64

    // Fee hesaplama
    access(all) fun calculateSwapFee(amount: UFix64): UFix64
    access(all) fun calculateMarginFee(size: UFix64): UFix64
    access(all) fun distributeFees(feeAmount: UFix64)

    // Funding rate güncelleme
    access(all) fun updateFundingRate(token: String)
    access(all) fun getAUM(): UFix64
}
```

### 6. PositionManager.cdc

```cadence
access(all) contract PositionManager {
    access(all) let MIN_COLLATERAL_USD: UFix64   // 10.0
    access(all) let LIQUIDATION_FEE_USD: UFix64  // 5.0
    access(all) let LIQUIDATION_FEE_RATE: UFix64 // 0.10

    access(all) struct Position {
        access(all) var size: UFix64           // pozisyon büyüklüğü (USD)
        access(all) var collateral: UFix64     // teminat (USD)
        access(all) var averagePrice: UFix64   // ortalama giriş fiyatı
        access(all) var entryFundingRate: UFix64
        access(all) var isLong: Bool
        access(all) var lastIncreasedTime: UFix64
    }

    // Pozisyon anahtarı: hash(address + collateralToken + indexToken + isLong)
    access(all) var positions: {String: Position}
    access(all) var globalShortSizes: {String: UFix64}
    access(all) var globalShortAveragePrices: {String: UFix64}

    access(all) fun increasePosition(
        account: Address, collateralToken: String, indexToken: String,
        collateralDelta: UFix64, sizeDelta: UFix64, isLong: Bool
    )
    access(all) fun decreasePosition(
        account: Address, collateralToken: String, indexToken: String,
        collateralDelta: UFix64, sizeDelta: UFix64, isLong: Bool, receiver: Address
    ): UFix64
    access(all) fun liquidatePosition(
        account: Address, collateralToken: String, indexToken: String,
        isLong: Bool, feeReceiver: Address
    )
    access(all) fun getPositionKey(
        account: Address, collateralToken: String, indexToken: String, isLong: Bool
    ): String
    access(all) fun isLiquidatable(positionKey: String): Bool
}
```

### 7. StakingRewards.cdc

```cadence
access(all) contract StakingRewards {
    access(all) struct StakeRecord {
        access(all) let stakedAmount: UFix64
        access(all) let startBlock: UInt64
        access(all) var lastClaimBlock: UInt64
        access(all) var pendingRewards: UFix64
    }

    access(all) var pantaStakers: {Address: StakeRecord}
    access(all) var plpStakers: {Address: StakeRecord}
    access(all) var rewardPerBlock: UFix64  // esPANTA/blok

    access(all) fun stakePANTA(account: Address, amount: UFix64)
    access(all) fun stakePLP(account: Address, amount: UFix64)
    access(all) fun unstake(account: Address, tokenType: String): UFix64
    access(all) fun claimRewards(account: Address): UFix64
    access(all) fun calculatePendingRewards(account: Address, tokenType: String): UFix64
}
```

### 8. MockUSDCFaucet.cdc

```cadence
access(all) contract MockUSDCFaucet {
    access(all) let DAILY_LIMIT: UFix64        // 1000.0
    access(all) let COOLDOWN: UFix64           // 86400.0 saniye
    access(all) let LOW_RESERVE_THRESHOLD: UFix64 // 10000.0

    access(all) var lastClaimTime: {Address: UFix64}

    access(all) fun claimTokens(recipient: Address): UFix64
    access(all) fun getReserveBalance(): UFix64
    access(all) fun getRemainingCooldown(account: Address): UFix64

    // Event
    access(all) event LowReserveWarning(currentBalance: UFix64)
}
```

### Frontend Bileşenleri (FCL Entegrasyonu)

```typescript
// frontend/src/lib/config/flow.ts
import * as fcl from "@onflow/fcl"

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "PantaDEX",
  "app.detail.icon": "/panta-logo.png",
  "flow.network": "testnet"
})
```

```typescript
// frontend/src/hooks/useFlowPositions.ts — wagmi yerine FCL
import * as fcl from "@onflow/fcl"
import { useCurrentUser } from "@onflow/fcl"

export function usePositions() {
  const [user] = useCurrentUser()
  return useQuery({
    queryKey: ['positions', user?.addr],
    queryFn: () => fcl.query({
      cadence: GET_POSITION_SCRIPT,
      args: (arg, t) => [arg(user.addr, t.Address)]
    }),
    enabled: !!user?.addr
  })
}
```

### Backend Güncelleme (Flow SDK)

```typescript
// backend/src/config/flow.ts — viem yerine Flow SDK
import * as fcl from "@onflow/fcl"

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "flow.network": "testnet"
})

// Fiyat verisi: IncrementFi oracle Cadence script ile
export async function getFlowPrice(): Promise<number> {
  return fcl.query({
    cadence: `
      import PublicPriceOracle from 0x8232ce4a3aff4e94
      access(all) fun main(): UFix64 {
        return PublicPriceOracle.getLatestPrice(symbol: "FLOW/USD")
      }
    `
  })
}
```

---

## Veri Modelleri

### Cadence Struct Tanımları

```cadence
// Pozisyon verisi
access(all) struct Position {
    access(all) var size: UFix64            // Pozisyon büyüklüğü (USD, 8 ondalık)
    access(all) var collateral: UFix64      // Teminat (USD, 8 ondalık)
    access(all) var averagePrice: UFix64    // Ortalama giriş fiyatı
    access(all) var entryFundingRate: UFix64
    access(all) var reserveAmount: UFix64   // Vault'ta rezerve edilen token
    access(all) var realisedPnl: UFix64
    access(all) var isLong: Bool
    access(all) var lastIncreasedTime: UFix64
    // Invariant: size >= collateral (kaldıraç >= 1x)
}

// Token havuz verisi
access(all) struct TokenPool {
    access(all) var poolAmount: UFix64      // Toplam havuz miktarı
    access(all) var reservedAmount: UFix64  // Açık pozisyonlar için rezerv
    access(all) var feeReserve: UFix64      // Birikmiş fee
    access(all) var fundingRate: UFix64     // Güncel funding rate
    access(all) var lastFundingTime: UFix64 // Son güncelleme zamanı
    // Invariant: reservedAmount <= poolAmount
}

// Vesting kaydı
access(all) struct VestingRecord {
    access(all) let startTime: UFix64       // Vesting başlangıç zamanı
    access(all) let totalAmount: UFix64     // Toplam esPANTA miktarı
    access(all) var vestedAmount: UFix64    // Şimdiye kadar vest edilen
    // Invariant: vestedAmount <= totalAmount
}

// Staking kaydı
access(all) struct StakeRecord {
    access(all) let stakedAmount: UFix64
    access(all) let startBlock: UInt64
    access(all) var lastClaimBlock: UInt64
    access(all) var pendingRewards: UFix64
}

// Oracle fiyat verisi
access(all) struct PriceData {
    access(all) let minPrice: UFix64        // Spread alt sınırı
    access(all) let maxPrice: UFix64        // Spread üst sınırı
    access(all) let timestamp: UFix64       // Unix timestamp
    // Invariant: minPrice <= maxPrice
}
```

### flow.json Konfigürasyonu

```json
{
  "contracts": {
    "MockUSDC": { "source": "./cadence/contracts/MockUSDC.cdc" },
    "PANTAToken": { "source": "./cadence/contracts/PANTAToken.cdc" },
    "PLPToken": { "source": "./cadence/contracts/PLPToken.cdc" },
    "EsPANTAToken": { "source": "./cadence/contracts/EsPANTAToken.cdc" },
    "PriceFeed": { "source": "./cadence/contracts/PriceFeed.cdc" },
    "Vault": { "source": "./cadence/contracts/Vault.cdc" },
    "PositionManager": { "source": "./cadence/contracts/PositionManager.cdc" },
    "MockUSDCFaucet": { "source": "./cadence/contracts/MockUSDCFaucet.cdc" },
    "StakingRewards": { "source": "./cadence/contracts/StakingRewards.cdc" }
  },
  "dependencies": {
    "FungibleToken": {
      "source": "mainnet://f233dcee88fe0abe.FungibleToken",
      "aliases": { "testnet": "9a0766d93b6608b7" }
    },
    "FlowToken": {
      "source": "mainnet://1654653399040a61.FlowToken",
      "aliases": { "testnet": "7e60df042a9c0868" }
    }
  },
  "networks": {
    "testnet": "access.devnet.nodes.onflow.org:9000"
  },
  "accounts": {
    "panta-testnet": {
      "address": "<DEPLOY_ADDRESS>",
      "key": { "type": "file", "location": "panta-testnet.pkey" }
    }
  },
  "deployments": {
    "testnet": {
      "panta-testnet": [
        "MockUSDC", "PANTAToken", "PLPToken", "EsPANTAToken",
        "PriceFeed", "Vault", "PositionManager", "MockUSDCFaucet", "StakingRewards"
      ]
    }
  }
}
```

### Kritik Hesaplama Formülleri

**PLP Mint Miktarı**:
```
plpAmount = (depositUSD / aumUSD) * plpTotalSupply   // arz > 0 ise
plpAmount = depositUSD / 1.0                          // ilk mint (arz = 0)
```

**PLP Fiyatı**:
```
plpPrice = aumUSD / plpTotalSupply   // arz > 0 ise
plpPrice = 1.0                        // arz = 0 ise
```

**Pozisyon Kar/Zarar**:
```
// Long pozisyon
pnl = (currentPrice - averagePrice) / averagePrice * size

// Short pozisyon
pnl = (averagePrice - currentPrice) / averagePrice * size
```

**Tasfiye Eşiği**:
```
liquidationFee = min(5.0, collateral * 0.10)
isLiquidatable = collateral - fundingFee - liquidationFee < collateral * 0.01
```

**Funding Fee**:
```
fundingFee = size * fundingRate * (currentTime - entryFundingRate) / FUNDING_INTERVAL
```

**Ödül Hesaplama (Blok Bazlı)**:
```
pendingRewards = stakedAmount * rewardPerBlock * (currentBlock - lastClaimBlock)
```

---

## Doğruluk Özellikleri

*Bir özellik (property), sistemin tüm geçerli çalışmalarında doğru olması gereken bir karakteristik veya davranıştır — temelde sistemin ne yapması gerektiğine dair formal bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk garantileri arasındaki köprüyü oluşturur.*

### Property 1: Maksimum Arz Invariantı

*Her* mint işlemi için, mint sonrası toplam PANTA arzı hiçbir zaman 10.000.000'ı geçmemelidir. Maksimum arzı aşacak mint işlemleri reddedilmelidir.

**Validates: Requirements 1.2, 1.5**

---

### Property 2: Mint/Burn Round-Trip

*Her* geçerli PANTA miktarı için, belirli bir miktarı mint edip ardından aynı miktarı burn etmek toplam arzı değiştirmemelidir.

**Validates: Requirements 1.6**

---

### Property 3: Minter Erişim Kontrolü

*Her* hesap için, yalnızca `Minter` resource'una sahip hesaplar `mintTokens` çağırabilmelidir; diğer tüm hesapların çağrıları başarısız olmalıdır.

**Validates: Requirements 1.4, 1.7**

---

### Property 4: Vault Bakiye Non-Negativity

*Her* geçerli işlem dizisi için (mint, transfer, burn), herhangi bir hesabın PANTA Vault bakiyesi hiçbir zaman negatif olmamalıdır.

**Validates: Requirements 1.9**

---

### Property 5: PLP Mint Doğruluğu

*Her* geçerli AUM değeri ve PLP toplam arzı için, yatırılan USD değerine karşılık basılan PLP miktarı `depositUSD / plpPrice` formülüne eşit olmalıdır; burada `plpPrice = AUM / totalSupply` (arz > 0 ise) veya `1.0` (arz = 0 ise).

**Validates: Requirements 2.2, 4.2**

---

### Property 6: PLP Redeem Round-Trip

*Her* geçerli PLP miktarı için, likidite ekleyip ardından aynı PLP miktarını redeem etmek (fee hariç) başlangıçtaki USD değerine yakın bir değer döndürmelidir. Özellikle: `redeemedUSD ≈ depositUSD * (1 - swapFeeBPS/10000)`.

**Validates: Requirements 2.3, 4.3**

---

### Property 7: PLP Transfer Whitelist

*Her* hesap için, whitelist dışındaki hesapların PLP transferi başarısız olmalıdır; whitelist'teki hesapların (Vault, StakedPLP) transferleri başarılı olmalıdır.

**Validates: Requirements 2.4**

---

### Property 8: PLP Cooldown Kısıtlaması

*Her* kullanıcı için, PLP mint işleminden sonra 15 dakika (900 saniye) geçmeden redeem işlemi reddedilmelidir; 15 dakika geçtikten sonra redeem başarılı olmalıdır.

**Validates: Requirements 2.5**

---

### Property 9: PLP Fiyat Formülü

*Her* geçerli AUM ve toplam arz değeri çifti için, `getPLPPrice(aum)` fonksiyonu `aum / totalSupply` değerini döndürmelidir (toplam arz > 0 ise).

**Validates: Requirements 2.6**

---

### Property 10: esPANTA Transfer Kısıtlaması

*Her* hesap için, whitelist dışındaki hesapların esPANTA transferi başarısız olmalıdır.

**Validates: Requirements 3.2**

---

### Property 11: Vesting Round-Trip

*Her* geçerli esPANTA miktarı için, 365 günlük vesting tamamlandığında kullanıcının aldığı PANTA miktarı başlangıçta vesting'e koyulan esPANTA miktarına eşit olmalıdır.

**Validates: Requirements 3.4**

---

### Property 12: Erken İptal İade Doğruluğu

*Her* vesting kaydı için, vesting erken iptal edildiğinde iade edilen esPANTA miktarı `totalAmount - vestedAmount` formülüne eşit olmalıdır.

**Validates: Requirements 3.5**

---

### Property 13: Havuz/Rezerv Takibi

*Her* işlem dizisi için (likidite ekleme, pozisyon açma, pozisyon kapatma), `reservedAmount <= poolAmount` invariantı her zaman sağlanmalıdır.

**Validates: Requirements 4.4**

---

### Property 14: Fee Hesaplama Doğruluğu

*Her* geçerli işlem miktarı için, swap fee `amount * 30 / 10000` ve margin fee `size * 10 / 10000` formüllerine eşit olmalıdır.

**Validates: Requirements 4.5, 4.6**

---

### Property 15: Fee Dağılımı

*Her* geçerli fee miktarı için, `distributeFees(feeAmount)` çağrısı sonrası LP havuzuna giden miktar `feeAmount * 0.70` ve hazineye giden miktar `feeAmount * 0.30` olmalıdır.

**Validates: Requirements 4.7**

---

### Property 16: Rezerv Aşımında Pozisyon Engeli

*Her* token havuzu için, `reservedAmount + newReserve > poolAmount` koşulunu sağlayan yeni pozisyon açma işlemi reddedilmelidir.

**Validates: Requirements 4.8**

---

### Property 17: Pozisyon Anahtarı Determinizmi

*Her* `(address, collateralToken, indexToken, isLong)` kombinasyonu için, `getPositionKey` fonksiyonu her çağrıda aynı anahtarı döndürmelidir (deterministik ve çakışmasız).

**Validates: Requirements 5.2**

---

### Property 18: Kar/Zarar Hesaplama Doğruluğu

*Her* geçerli pozisyon ve fiyat değişimi için, `decreasePosition` sonrası kullanıcıya iade edilen miktar `collateral + pnl - fees` formülüne eşit olmalıdır; burada `pnl = (currentPrice - averagePrice) / averagePrice * size` (long için).

**Validates: Requirements 5.3**

---

### Property 19: Minimum Teminat Kısıtlaması

*Her* pozisyon açma işlemi için, teminat USD değeri 10.0'ın altındaysa işlem reddedilmelidir.

**Validates: Requirements 5.4**

---

### Property 20: Tasfiye Koşulu

*Her* pozisyon için, teminat oranı tasfiye eşiğinin altına düştüğünde `isLiquidatable` true döndürmeli ve `liquidatePosition` başarılı olmalıdır; eşiğin üzerindeyken `liquidatePosition` başarısız olmalıdır.

**Validates: Requirements 5.5**

---

### Property 21: Tasfiye Ücreti Hesaplama

*Her* geçerli teminat miktarı için, tasfiye ücreti `min(5.0, collateral * 0.10)` formülüne eşit olmalıdır.

**Validates: Requirements 5.6**

---

### Property 22: Spread Koruması

*Her* fiyat aralığı `(minPrice, maxPrice)` için, long pozisyon açılırken `maxPrice` kullanılmalı, short pozisyon açılırken `minPrice` kullanılmalıdır.

**Validates: Requirements 5.8**

---

### Property 23: Maksimum Kaldıraç Invariantı

*Her* pozisyon için, `size / collateral > 50.0` koşulunu sağlayan pozisyon artırma işlemi reddedilmelidir.

**Validates: Requirements 4.9, 5.10**

---

### Property 24: Global Short İstatistikleri

*Her* short pozisyon açma/kapama işlemi için, `globalShortSizes[indexToken]` ve `globalShortAveragePrices[indexToken]` değerleri tüm açık short pozisyonların toplamını ve ağırlıklı ortalama fiyatını doğru yansıtmalıdır.

**Validates: Requirements 5.11**

---

### Property 25: Oracle Fiyat Aralığı

*Her* fiyat sorgusu için, `PriceData.minPrice <= PriceData.maxPrice` koşulu sağlanmalıdır.

**Validates: Requirements 6.3**

---

### Property 26: Oracle Fallback

*Her* birincil oracle başarısızlığı veya stale fiyat durumu için, `getPrice` fonksiyonu yedek oracle'dan geçerli bir fiyat döndürmelidir.

**Validates: Requirements 6.6**

---

### Property 27: Faucet Rate Limiting

*Her* hesap için, son talepten 86400 saniye geçmeden yapılan faucet talebi reddedilmelidir; 86400 saniye geçtikten sonra talep başarılı olmalı ve tam 1000 MockUSDC gönderilmelidir.

**Validates: Requirements 7.2, 7.3, 7.4**

---

### Property 28: Stake Ödül Hesaplama

*Her* stake kaydı için, `calculatePendingRewards` fonksiyonu `stakedAmount * rewardPerBlock * (currentBlock - lastClaimBlock)` formülüne eşit bir değer döndürmelidir.

**Validates: Requirements 8.1, 8.2, 8.4**

---

### Property 29: Stake Round-Trip

*Her* geçerli stake miktarı için, stake edip ardından unstake etmek orijinal token miktarını ve birikmiş ödülleri kullanıcıya iade etmelidir.

**Validates: Requirements 8.3, 8.5, 8.6**

---

### Property 30: Admin Erişim Kontrolü

*Her* hesap için, `Admin` resource'una sahip olmayan hesapların admin fonksiyonlarını (parametre değiştirme, whitelist güncelleme, Minter oluşturma) çağırması başarısız olmalıdır.

**Validates: Requirements 12.1, 12.3, 12.4**

---

### Property 31: Pozisyon Size >= Collateral Invariantı

*Her* geçerli pozisyon için, `position.size >= position.collateral` koşulu her zaman sağlanmalıdır (kaldıraç her zaman >= 1x).

**Validates: Requirements 13.3**

---

## Hata Yönetimi

### Cadence Hata Stratejisi

Cadence'ta hata yönetimi `panic()` ve `assert()` ile yapılır — transaction başarısız olursa tüm state değişiklikleri geri alınır (atomik).

```cadence
// Örnek: PANTAToken mint hata yönetimi
access(all) fun mintTokens(amount: UFix64): @Vault {
    assert(amount > 0.0, message: "Mint miktarı sıfırdan büyük olmalı")
    assert(
        PANTAToken.totalSupply + amount <= PANTAToken.maxSupply,
        message: "Maksimum arz aşılamaz: mevcut=".concat(PANTAToken.totalSupply.toString())
            .concat(" talep=").concat(amount.toString())
            .concat(" max=").concat(PANTAToken.maxSupply.toString())
    )
    PANTAToken.totalSupply = PANTAToken.totalSupply + amount
    emit TokensMinted(amount: amount)
    return <- create Vault(balance: amount)
}
```

### Hata Kategorileri ve Mesajları

| Kategori | Hata Mesajı | Tetikleyen Koşul |
|---|---|---|
| Arz Limiti | `"Max supply exceeded"` | mint > maxSupply |
| Yetersiz Bakiye | `"Insufficient balance"` | withdraw > balance |
| Yetkisiz Erişim | `"Unauthorized: Admin resource required"` | Admin olmayan çağrı |
| Stale Fiyat | `"Stale price: oracle data too old"` | timestamp > 30 dk |
| Cooldown | `"Cooldown active: X seconds remaining"` | 24 saat geçmemiş |
| Min Teminat | `"Collateral below minimum: 10 USD required"` | collateral < 10 |
| Max Kaldıraç | `"Leverage exceeds maximum: 50x"` | size/collateral > 50 |
| Rezerv Aşımı | `"Insufficient pool liquidity"` | reserve > pool |
| PLP Cooldown | `"PLP cooldown active: 15 minutes required"` | 15 dk geçmemiş |
| Tasfiye Yok | `"Position not liquidatable"` | eşik üzerinde |

### Frontend Hata Yönetimi (FCL)

```typescript
// FCL transaction hata yakalama
try {
  const txId = await fcl.mutate({
    cadence: INCREASE_POSITION_TRANSACTION,
    args: (arg, t) => [...]
  })
  await fcl.tx(txId).onceSealed()
} catch (error) {
  if (error.message.includes("Max supply exceeded")) {
    toast.error("Maksimum arz limitine ulaşıldı")
  } else if (error.message.includes("Leverage exceeds maximum")) {
    toast.error("Kaldıraç 50x sınırını aşıyor")
  } else {
    toast.error("İşlem başarısız: " + error.message)
  }
}
```

### Yanlış Ağ Uyarısı

```typescript
// frontend/src/hooks/useFlowNetwork.ts
export function useFlowNetwork() {
  const [user] = useCurrentUser()
  const isCorrectNetwork = user?.loggedIn &&
    fcl.config().get("flow.network") === "testnet"

  if (!isCorrectNetwork) {
    return { error: "Flow Testnet'e bağlanın" }
  }
  return { error: null }
}
```

---

## Test Stratejisi

### Çift Test Yaklaşımı

Test stratejisi iki tamamlayıcı katmandan oluşur:

- **Birim testler**: Belirli örnekler, edge case'ler ve hata koşulları
- **Property-based testler**: Tüm girdiler üzerinde evrensel özellikler

### Property-Based Test Kütüphanesi

Cadence için native property-based testing: **Cadence Testing Framework** (`Test` standart kütüphanesi, Flow CLI ile birlikte gelir). Her property testi minimum **100 iterasyon** çalıştırılmalıdır.

Her property testi şu tag formatıyla işaretlenmelidir:
```
// Feature: flow-perpdex, Property N: <property_metni>
```

### Property Test Örnekleri

```cadence
// tests/PANTAToken_test.cdc

import Test

// Feature: flow-perpdex, Property 1: Maksimum Arz Invariantı
access(all) fun testMaxSupplyInvariant() {
    let iterations = 100
    var i = 0
    while i < iterations {
        let randomAmount = UFix64(UInt64.random(in: 1...1_000_000))
        let currentSupply = PANTAToken.getTotalSupply()
        if currentSupply + randomAmount > PANTAToken.getMaxSupply() {
            // Mint reddedilmeli
            Test.expectFailure(fun() {
                let minter = getMinter()
                let vault <- minter.mintTokens(amount: randomAmount)
                destroy vault
            }, errorMessageSubstring: "Max supply exceeded")
        }
        i = i + 1
    }
}

// Feature: flow-perpdex, Property 2: Mint/Burn Round-Trip
access(all) fun testMintBurnRoundTrip() {
    let iterations = 100
    var i = 0
    while i < iterations {
        let amount = UFix64(UInt64.random(in: 1...10_000))
        let supplyBefore = PANTAToken.getTotalSupply()
        let minter = getMinter()
        let vault <- minter.mintTokens(amount: amount)
        // burn
        PANTAToken.burnTokens(from: <- vault)
        let supplyAfter = PANTAToken.getTotalSupply()
        Test.assertEqual(supplyBefore, supplyAfter)
        i = i + 1
    }
}

// Feature: flow-perpdex, Property 23: Maksimum Kaldıraç Invariantı
access(all) fun testMaxLeverageInvariant() {
    let iterations = 100
    var i = 0
    while i < iterations {
        let collateral = UFix64(UInt64.random(in: 10...1_000))
        let size = collateral * (UFix64(UInt64.random(in: 51...200)))
        // 50x üzeri reddedilmeli
        Test.expectFailure(fun() {
            PositionManager.increasePosition(
                account: testAccount,
                collateralToken: "USDC",
                indexToken: "FLOW",
                collateralDelta: collateral,
                sizeDelta: size,
                isLong: true
            )
        }, errorMessageSubstring: "Leverage exceeds maximum")
        i = i + 1
    }
}
```

### Birim Test Örnekleri

```cadence
// tests/Vault_test.cdc

// Edge case: İlk PLP mint (arz = 0)
access(all) fun testFirstPLPMintPrice() {
    // Arz sıfırken fiyat 1.0 USD olmalı
    let plpPrice = PLPToken.getPLPPrice(aum: 0.0)
    Test.assertEqual(plpPrice, 1.0)
}

// Edge case: Stale oracle fiyatı
access(all) fun testStalePriceRejection() {
    Test.expectFailure(fun() {
        PriceFeed.getPrice(symbol: "FLOW/USD")
        // 30 dakikadan eski timestamp simüle edilmiş
    }, errorMessageSubstring: "Stale price")
}

// Entegrasyon: Fee dağılımı
access(all) fun testFeeDistribution() {
    let feeAmount: UFix64 = 100.0
    let lpShare = feeAmount * 0.70  // 70.0
    let treasuryShare = feeAmount * 0.30  // 30.0
    Vault.distributeFees(feeAmount: feeAmount)
    Test.assertEqual(getLPFeeBalance(), lpShare)
    Test.assertEqual(getTreasuryBalance(), treasuryShare)
}
```

### Test Kapsamı Hedefleri

| Bileşen | Birim Test | Property Test |
|---|---|---|
| PANTAToken | Mint, burn, transfer, erişim kontrolü | P1, P2, P3, P4 |
| PLPToken | Mint formülü, redeem, cooldown | P5, P6, P7, P8, P9 |
| EsPANTAToken | Vesting başlatma, claim, iptal | P10, P11, P12 |
| Vault | Likidite ekleme/çıkarma, fee | P13, P14, P15, P16 |
| PositionManager | Pozisyon açma/kapama, tasfiye | P17-P24, P31 |
| PriceFeed | Oracle entegrasyon, fallback | P25, P26 |
| MockUSDCFaucet | Rate limiting, rezerv | P27 |
| StakingRewards | Stake, unstake, ödül | P28, P29 |
| Erişim Kontrolü | Admin resource | P30 |

### Frontend Test Stratejisi

- **FCL mock**: `@onflow/fcl` jest mock'u ile birim testler
- **Wallet bağlantısı**: FCL discovery flow testi
- **Renk teması**: CSS değişken doğrulama testleri
- **Ağ kontrolü**: Yanlış ağ uyarısı testi

### Backend Test Stratejisi

- **Oracle entegrasyon**: IncrementFi/Band oracle mock ile fiyat testi
- **API endpoint**: `/api/prices` Flow Testnet verisi döndürmeli
- **Hata yönetimi**: Oracle başarısızlığında cached fiyat kullanımı
