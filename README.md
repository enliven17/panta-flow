# PantaDEX — Perpetual DEX on Flow

Flow Testnet üzerinde çalışan Cadence tabanlı perpetual DEX. GMX v1 mimarisinden ilham alınarak Flow'a native Cadence kontratları ile yeniden yazılmıştır.

## Mimari

```
flow-perpdex/cadence/contracts/
├── Vault.cdc             ← Ana kontrat: pozisyon, likidite, fiyat
├── PositionManager.cdc   ← Pozisyon açma/kapama/likidasyon
├── PriceFeed.cdc         ← Oracle entegrasyonu (IncrementFi)
├── PANTAToken.cdc        ← Governance token
├── PLPToken.cdc          ← Liquidity provider token
├── EsPANTAToken.cdc      ← Escrowed PANTA (staking rewards)
├── StakingRewards.cdc    ← Staking sistemi
├── MockUSDC.cdc          ← Test USDC token
└── MockUSDCFaucet.cdc    ← Test token faucet
```

## Kurulum

```bash
npm install
# Flow CLI kur: https://docs.onflow.org/flow-cli/install/
```

## Deploy (Flow Testnet)

```bash
cd flow-perpdex
# flow.json içindeki <DEPLOY_ADDRESS> ve pkey dosyasını doldur
flow project deploy --network testnet
```

## Flow Testnet Bilgileri

- Access Node: https://rest-testnet.onflow.org
- Explorer: https://testnet.flowscan.io
- Faucet: https://faucet.flow.com/fund-account

## Frontend & Backend

```bash
# Frontend (Next.js + FCL)
cd frontend && npm install && npm run dev

# Backend (Express + Flow REST API)
cd backend && npm install && npm run dev
```
