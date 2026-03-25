import { createConfig, http } from 'wagmi'
import { initiaPrivyWalletConnector } from '@initia/interwovenkit-react'
import { initiaTestnet } from './chains'

export const wagmiConfig = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [initiaTestnet],
  transports: {
    [initiaTestnet.id]: http('https://rpc.evm.testnet.initia.xyz'),
  },
})
