import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xPANTA
import PANTAToken from 0xPANTA

/// setupAccount.cdc
/// User signs this ONCE via their FCL wallet to create MockUSDC and PANTA vaults
/// and publish public receiver capabilities.
/// Must be executed before the user can receive tokens from the faucet or admin.
transaction {

    prepare(signer: auth(BorrowValue, SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {

        // ---- MockUSDC vault ----
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

        // ---- PANTAToken vault ----
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
