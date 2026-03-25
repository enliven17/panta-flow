require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")

const { INITIA_TESTNET_RPC_URL, DEPLOYER_PRIVATE_KEY, PRIVATE_KEY } = process.env

module.exports = {
  networks: {
    hardhat: {},
    // Initia EVM Testnet
    initia_testnet: {
      url: INITIA_TESTNET_RPC_URL || "https://rpc.evm.testnet.initia.xyz",
      chainId: 1320,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : (PRIVATE_KEY ? [PRIVATE_KEY] : []),
      gasPrice: "auto",
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
    }
  },
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
      viaIR: true
    }
  },
  etherscan: {
    apiKey: {
      initia_testnet: "no-key-needed"
    },
    customChains: [
      {
        network: "initia_testnet",
        chainId: 1320,
        urls: {
          apiURL: "https://explorer.evm.testnet.initia.xyz/api",
          browserURL: "https://explorer.evm.testnet.initia.xyz"
        }
      }
    ]
  }
}
