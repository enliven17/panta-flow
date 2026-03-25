---
name: panta_frontend_backend
description: Panta PerpDEX frontend (Next.js) and backend (Express) implementation status
type: project
---

Frontend (Next.js 16, App Router) and backend (Express + viem) scaffolding complete.

**Why:** Full-stack PerpDEX UI on top of GMX-fork contracts deployed on Initia EVM Testnet.

**How to apply:** Both projects are implemented. Contracts need deployment before full functionality works.

## Key decisions
- `injected()` wagmi connector (not `metaMask()`) — avoids `@metamask/sdk` peer dep during SSR
- lightweight-charts v4 API: `chart.addCandlestickSeries()` not `addSeries(CandlestickSeries, ...)`
- tsconfig target ES2020 required for BigInt literals in frontend
- Backend uses CommonJS ts-node (not --esm flag)
- `ADDRESSES` in `frontend/src/lib/contracts/addresses.ts` is all placeholder zeros — must be filled after contract deployment

## Status after implementation
- `/` landing page: Hero + Stats + Features + HowItWorks ✓
- `/trade` page: TradingChart + OrderPanel + PositionsTable + OrdersTable ✓
- `/earn` page: PLPCard + TokenComposition ✓
- `/faucet` page: FaucetCard × 2 (WETH + USDC) ✓
- Backend `/health`, `/api/prices`, `/api/prices/history`, `/api/stats`, `/api/positions/:account` ✓
- Frontend build: `next build` passes clean ✓
- Backend TypeScript: `tsc --noEmit` clean ✓
- Backend `/health` endpoint: verified returns `{"ok":true}` ✓

## Next steps
1. Deploy contracts: `npx hardhat run scripts/deploy/deployAll.js --network initia_testnet`
2. Run: `npx hardhat run scripts/deploy/deployPositionRouter.js --network initia_testnet`
3. Run: `npx hardhat run scripts/config/setupVault.js --network initia_testnet`
4. Fill in `frontend/src/lib/contracts/addresses.ts` from `deployed-addresses.json`
5. `cd backend && npm run dev` → starts on port 3001
6. `cd frontend && npm run dev` → starts on port 3000
