// ─── Flow Testnet Contract Addresses ───────────────────────────────────────
// Update after deploying with: flow project deploy --network testnet

export interface FlowContractAddresses {
  MockUSDC: string
  PANTAToken: string
  PLPToken: string
  EsPANTAToken: string
  PriceFeed: string
  Vault: string
  PositionManager: string
  MockUSDCFaucet: string
  StakingRewards: string
  // Standard Flow contracts
  FungibleToken: string
  FlowToken: string
}

export const FLOW_ADDRESSES: FlowContractAddresses = {
  MockUSDC: "",
  PANTAToken: "",
  PLPToken: "",
  EsPANTAToken: "",
  PriceFeed: "",
  Vault: "",
  PositionManager: "",
  MockUSDCFaucet: "",
  StakingRewards: "",
  FungibleToken: "0x9a0766d93b6608b7",
  FlowToken: "0x7e60df042a9c0868",
}
