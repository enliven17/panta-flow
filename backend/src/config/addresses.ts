// Flow Testnet contract addresses
import { FLOW_CONTRACT_ADDRESSES } from './flow'

// Returns a Flow Testnet contract address by contract name
export function getFlowAddress(key: string): string {
  const addr = FLOW_CONTRACT_ADDRESSES[key as keyof typeof FLOW_CONTRACT_ADDRESSES]
  return addr || ""
}

export default FLOW_CONTRACT_ADDRESSES
