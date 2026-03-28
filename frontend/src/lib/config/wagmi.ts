import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { flowEvmTestnet } from './chains'

export const wagmiConfig = createConfig({
  connectors: [injected()],
  chains: [flowEvmTestnet],
  transports: {
    [flowEvmTestnet.id]: http('https://testnet.evm.nodes.onflow.org'),
  },
})
