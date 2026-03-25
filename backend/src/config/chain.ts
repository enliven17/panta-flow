import { createPublicClient, http, defineChain } from 'viem'

export const initiaTestnet = defineChain({
  id: 1234,
  name: 'Initia EVM Testnet',
  nativeCurrency: { name: 'INIT', symbol: 'INIT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.evm.testnet.initia.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'Initia Explorer',
      url: 'https://explorer.evm.testnet.initia.xyz',
    },
  },
  testnet: true,
})

export const publicClient = createPublicClient({
  chain: initiaTestnet,
  transport: http('https://rpc.evm.testnet.initia.xyz'),
})
