import * as fcl from "@onflow/fcl"

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "PantaDEX",
  "app.detail.icon": "/panta-logo.png",
  "flow.network": "testnet"
})

export { fcl }
export const FLOW_NETWORK = "testnet"
export const BLOCK_EXPLORER_URL = "https://testnet.flowscan.io"
export const FLOW_FAUCET_URL = "https://faucet.flow.com/fund-account"
