import * as fcl from "@onflow/fcl"
import "dotenv/config"

fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
})

async function test() {
  const PANTA = `0x${process.env.FLOW_DEPLOYER_ADDRESS?.replace("0x","")}`
  const account = "0x2083a55fb16f8f60"
  
  const script = `
    import PositionManager from 0xPANTA
    access(all) fun main(account: Address): [PositionManager.Position?] {
      let tokens = ["BTC", "ETH", "FLOW"]
      var results: [PositionManager.Position?] = []
      for token in tokens {
        let longKey  = PositionManager.getPositionKey(account: account, collateralToken: "USDC", indexToken: token, isLong: true)
        let shortKey = PositionManager.getPositionKey(account: account, collateralToken: "USDC", indexToken: token, isLong: false)
        results.append(PositionManager.positions[longKey])
        results.append(PositionManager.positions[shortKey])
      }
      return results
    }
  `

  try {
    const result = await fcl.query({
      cadence: script.replaceAll("0xPANTA", PANTA),
      args: (arg: any, t: any) => [arg(account, t.Address)],
    })
    console.log("Result:", JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error("Error Message:", err.message)
  }
}

test()
