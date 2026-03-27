# PantaDEX on Flow — Deployment Guide

## Prerequisites
- Flow CLI installed: `brew install flow-cli` or https://docs.onflow.org/flow-cli/install/
- Flow Testnet account with FLOW tokens (get from https://faucet.flow.com/fund-account)

## Setup
1. Create a testnet account and export the private key
2. Update `flow.json` with your account address (replace `<DEPLOY_ADDRESS>`)
3. Save your private key to `panta-testnet.pkey`

## Deploy
```bash
flow project deploy --network testnet
```

## After Deployment

### Updating Contract Addresses

Use the helper script to record each deployed contract address:

```bash
# Make the script executable (first time only)
chmod +x scripts/update-addresses.sh

# Run once per contract
./scripts/update-addresses.sh MockUSDC 0xabcdef1234567890
./scripts/update-addresses.sh PANTAToken 0xabcdef1234567890
./scripts/update-addresses.sh PLPToken 0xabcdef1234567890
./scripts/update-addresses.sh EsPANTAToken 0xabcdef1234567890
./scripts/update-addresses.sh PriceFeed 0xabcdef1234567890
./scripts/update-addresses.sh Vault 0xabcdef1234567890
./scripts/update-addresses.sh PositionManager 0xabcdef1234567890
./scripts/update-addresses.sh MockUSDCFaucet 0xabcdef1234567890
./scripts/update-addresses.sh StakingRewards 0xabcdef1234567890
```

The script updates `deployed-addresses-flow.json` and prints the next steps for frontend and backend config.

### Manual Steps After Running the Script

1. Update `frontend/src/lib/contracts/addresses.ts` — set each `FLOW_ADDRESSES.<ContractName>` to the deployed address
2. Update backend `.env` — set `FLOW_<CONTRACT>_ADDRESS` for each contract (e.g. `FLOW_VAULT_ADDRESS`, `FLOW_PRICEFEED_ADDRESS`)
