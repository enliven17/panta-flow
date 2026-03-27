import FungibleToken from 0x9a0766d93b6608b7
import PANTAToken from 0xPANTADEPLOYER

/// Burn PANTA tokens from the signer's vault.
/// Withdraws the given amount and calls PANTAToken.burnCallback to reduce total supply.
transaction(amount: UFix64) {

    let vault: auth(FungibleToken.Withdraw) &PANTAToken.Vault

    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the signer's PANTA vault with Withdraw entitlement
        self.vault = signer.storage.borrow<auth(FungibleToken.Withdraw) &PANTAToken.Vault>(
            from: PANTAToken.VaultStoragePath
        ) ?? panic("Could not borrow PANTA vault from signer's storage at ".concat(PANTAToken.VaultStoragePath.toString()))
    }

    execute {
        // Withdraw the tokens to burn
        let burnVault <- self.vault.withdraw(amount: amount)

        // Call burnCallback to reduce totalSupply and destroy the vault
        PANTAToken.burnCallback(vault: <-burnVault)
    }
}
