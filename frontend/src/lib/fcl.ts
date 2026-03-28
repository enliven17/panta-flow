/// FCL (Flow Client Library) configuration for PantaDEX frontend
import * as fcl from "@onflow/fcl"

const PANTA = "0xa6d1a763be01f1fa"

fcl.config({
  "flow.network": "testnet",
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "Panta PerpDEX",
  "app.detail.icon": "https://panta.fi/icon.png",
  "0xFungibleToken": "0x9a0766d93b6608b7",
  "0xFlowToken": "0x7e60df042a9c0868",
  "0xPANTA": PANTA,
})

export { fcl, PANTA }

// ─── Setup Account Transaction (user signs via wallet) ───────────────────────

export const SETUP_ACCOUNT_TX = `
import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import PANTAToken from 0xPANTA

transaction {
    prepare(signer: auth(BorrowValue, SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        if signer.storage.borrow<&MockUSDC.Vault>(from: MockUSDC.VaultStoragePath) == nil {
            signer.storage.save(
                <- MockUSDC.createEmptyVault(vaultType: Type<@MockUSDC.Vault>()),
                to: MockUSDC.VaultStoragePath
            )
            signer.capabilities.publish(
                signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(MockUSDC.VaultStoragePath),
                at: MockUSDC.VaultPublicPath
            )
        }
        if signer.storage.borrow<&PANTAToken.Vault>(from: PANTAToken.VaultStoragePath) == nil {
            signer.storage.save(
                <- PANTAToken.createEmptyVault(vaultType: Type<@PANTAToken.Vault>()),
                to: PANTAToken.VaultStoragePath
            )
            signer.capabilities.publish(
                signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(PANTAToken.VaultStoragePath),
                at: PANTAToken.VaultPublicPath
            )
        }
    }
}
`

export async function setupAccount(): Promise<string> {
  const txId = await fcl.mutate({
    cadence: SETUP_ACCOUNT_TX,
    proposer: fcl.authz,
    payer: fcl.authz,
    authorizations: [fcl.authz],
    limit: 9999,
  })
  await fcl.tx(txId).onceSealed()
  return txId
}

// ─── Query: USDC balance ──────────────────────────────────────────────────────

export async function getUSDCBalance(address: string): Promise<number> {
  try {
    const result = await fcl.query({
      cadence: `
        import FungibleToken from 0xFungibleToken
        import MockUSDC from 0xPANTA
        access(all) fun main(addr: Address): UFix64 {
          let vault = getAccount(addr)
            .capabilities.borrow<&{FungibleToken.Balance}>(MockUSDC.VaultPublicPath)
          return vault?.balance ?? 0.0
        }
      `,
      args: (arg: any, t: any) => [arg(address, t.Address)],
    })
    return parseFloat(result as string)
  } catch {
    return 0
  }
}

export async function getPANTABalance(address: string): Promise<number> {
  try {
    const result = await fcl.query({
      cadence: `
        import FungibleToken from 0xFungibleToken
        import PANTAToken from 0xPANTA
        access(all) fun main(addr: Address): UFix64 {
          let vault = getAccount(addr)
            .capabilities.borrow<&{FungibleToken.Balance}>(PANTAToken.VaultPublicPath)
          return vault?.balance ?? 0.0
        }
      `,
      args: (arg: any, t: any) => [arg(address, t.Address)],
    })
    return parseFloat(result as string)
  } catch {
    return 0
  }
}
