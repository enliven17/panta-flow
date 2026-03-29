/// Flow transaction signing service
/// Signs and sends Cadence transactions using the deployer private key (P256)
/// Serializes all transactions via a queue to prevent sequence-number conflicts (Error 1007)

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
  "accessNode.api": "https://access-testnet.onflow.org",
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

// Fetch the current sequence number from chain to avoid stale-seqnum errors
async function getSequenceNumber(): Promise<number> {
  const acct = await (fcl as any).account(fcl.withPrefix(DEPLOYER_ADDRESS))
  return acct.keys[0].sequenceNumber
}

export const deployerAuthorizer = async (account: any) => {
  const sequenceNum = await getSequenceNumber()
  return {
    ...account,
    addr: fcl.withPrefix(DEPLOYER_ADDRESS),
    keyId: 0,
    sequenceNum,
    signingFunction: async (signable: any) => ({
      addr: fcl.withPrefix(DEPLOYER_ADDRESS),
      keyId: 0,
      signature: await signMessage(signable.message),
    }),
  }
}

export interface TxArg {
  value: any
  type: any
}

// Serialize all deployer transactions to prevent concurrent seqnum conflicts
let txQueue: Promise<any> = Promise.resolve()

export async function sendTx(cadence: string, args: TxArg[] = []): Promise<string> {
  const task = () =>
    fcl.mutate({
      cadence: cadence.replaceAll("0xPANTA", PANTA),
      args: (arg: any, t: any) => args.map(a => arg(a.value, a.type(t))),
      proposer: deployerAuthorizer,
      payer: deployerAuthorizer,
      authorizations: [deployerAuthorizer],
      limit: 9999,
    }).then((txId: string) => fcl.tx(txId).onceSealed().then(() => txId))

  // Chain onto the queue — each tx waits for the previous to seal
  const result = txQueue.then(task, task)
  txQueue = result.catch(() => {}) // keep queue moving even on error
  return result
}

export { fcl, PANTA }
