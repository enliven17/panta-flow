# Initia Testnet PerpDEX (GMX v1 Fork)

GMX v1 kaynak kodlarından Initia EVM Testnet için uyarlanmış perpetual DEX.

## Mimari

```
Vault.sol           ← Ana kontrat: pozisyon, likidite, fiyat
VaultPriceFeed.sol  ← Oracle entegrasyonu (Initia Slinky ile değiştir)
GlpManager.sol      ← Likidite havuzu (GLP = LP token)
Router.sol          ← Kullanıcı girişi
PositionRouter.sol  ← Async pozisyon açma/kapama
OrderBook.sol       ← Limit order sistemi
ShortsTracker.sol   ← Short pozisyon takibi
```

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasına private key ekle: PRIVATE_KEY=0x...
```

## Deploy (Initia Testnet)

```bash
# 1. Temel kontratları deploy et
npx hardhat run scripts/deploy/deployAll.js --network initia_testnet

# 2. Position Router ve OrderBook deploy et
npx hardhat run scripts/deploy/deployPositionRouter.js --network initia_testnet
```

## Initia Testnet Bilgileri

- RPC: https://rpc.evm.testnet.initia.xyz
- Explorer: https://explorer.evm.testnet.initia.xyz
- Faucet: https://faucet.testnet.initia.xyz

## Önemli Notlar

1. **Oracle**: VaultPriceFeed.sol içinde Chainlink yerine Initia'nın
   yerleşik Slinky oracle'ını kullanmak için `setTokenConfig()` çağır
2. **WETH**: Initia testnet'te wrapped native token adresini güncelle
3. **GLP Havuzu**: Test için önce sahte tokenlar ile havuzu doldur
