/// Flow transaction signing service
/// Signs and sends Cadence transactions using the deployer private key (P256)

import * as fcl from "@onflow/fcl"
import { SHA3 } from "sha3"
import elliptic from "elliptic"

const ec = new elliptic.ec("p256")

const DEPLOYER_ADDRESS = (process.env.FLOW_DEPLOYER_ADDRESS || "").replace("0x", "")
const PRIVATE_KEY = process.env.FLOW_PRIVATE_KEY || ""
const PANTA = `0x${DEPLOYER_ADDRESS}`

// Configure FCL once
fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
})

function hashMessage(hex: string): Buffer {
  const sha = new SHA3(256)
  sha.update(Buffer.from(hex, "hex"))
  return Buffer.from(sha.digest())
}

async function signMessage(message: string): Promise<string> {
  const key = ec.keyFromPrivate(Buffer.from(PRIVATE_KEY, "hex"))
  const sig = key.sign(hashMessage(message))
  const n = 32
  const r = sig.r.toArrayLike(Buffer, "be", n)
  const s = sig.s.toArrayLike(Buffer, "be", n)
  return Buffer.concat([r, s]).toString("hex")
}

export const deployerAuthorizer = async (account: any) => ({
  ...account,
  addr: fcl.withPrefix(DEPLOYER_ADDRESS),
  keyId: 0,
  signingFunction: async (signable: any) => ({
    addr: fcl.withPrefix(DEPLOYER_ADDRESS),
    keyId: 0,
    signature: await signMessage(signable.message),
  }),
})

export interface TxArg {
  value: any
  type: any
}

export async function sendTx(cadence: string, args: TxArg[] = []): Promise<string> {
  const txId = await fcl.mutate({
    cadence: cadence.replaceAll("0xPANTA", PANTA),
    args: (arg: any, t: any) => args.map(a => arg(a.value, a.type(t))),
    proposer: deployerAuthorizer,
    payer: deployerAuthorizer,
    authorizations: [deployerAuthorizer],
    limit: 9999,
  })
  await fcl.tx(txId).onceSealed()
  return txId
}

export { fcl, PANTA }
