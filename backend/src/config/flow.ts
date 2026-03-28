// Flow Testnet configuration for PantaDEX backend
// Uses @onflow/fcl for Cadence script execution

// Note: FCL is configured via environment or direct config
export const FLOW_ACCESS_NODE = "https://rest-testnet.onflow.org"
export const FLOW_NETWORK = "testnet"
export const BLOCK_EXPLORER_URL = "https://testnet.flowscan.io"

// Flow Testnet contract addresses (populated after deployment)
export const FLOW_CONTRACT_ADDRESSES = {
  MockUSDC: process.env.FLOW_MOCKUSDC_ADDRESS || "",
  PANTAToken: process.env.FLOW_PANTA_ADDRESS || "",
  PLPToken: process.env.FLOW_PLP_ADDRESS || "",
  EsPANTAToken: process.env.FLOW_ESPANTA_ADDRESS || "",
  PriceFeed: process.env.FLOW_PRICEFEED_ADDRESS || "",
  Vault: process.env.FLOW_VAULT_ADDRESS || "",
  PositionManager: process.env.FLOW_POSITIONMANAGER_ADDRESS || "",
  MockUSDCFaucet: process.env.FLOW_FAUCET_ADDRESS || "",
  StakingRewards: process.env.FLOW_STAKING_ADDRESS || "",
  // Standard Flow contracts
  FungibleToken: "0x9a0766d93b6608b7",
  FlowToken: "0x7e60df042a9c0868",
  IncrementFiOracle: "0x8232ce4a3aff4e94",
  BandOracle: "0x9fb6606c300b5051",
}

// Execute a Cadence script via Flow REST API
export async function executeScript(cadence: string, args: any[] = []): Promise<any> {
  const response = await fetch(`${FLOW_ACCESS_NODE}/v1/scripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: Buffer.from(cadence).toString('base64'),
      arguments: args.map(arg => Buffer.from(JSON.stringify(arg)).toString('base64')),
    }),
  })
  if (!response.ok) {
    throw new Error(`Flow script execution failed: ${response.statusText}`)
  }
  const result: any = await response.json()
  return JSON.parse(Buffer.from(result.value || result, 'base64').toString())
}
