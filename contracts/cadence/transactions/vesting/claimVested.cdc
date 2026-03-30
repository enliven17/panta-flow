import FungibleToken from 0x9a0766d93b6608b7
import EsPANTAToken from 0xPANTA
import PANTAToken from 0xPANTA

/// claimVested.cdc
/// Claims newly vested PANTA tokens from the signer's vesting schedule.
/// Burns the vested esPANTA and mints equivalent PANTA into the signer's vault.
/// Requirements: 3.4, 11.6
transaction {

    let pantaMinter: &PANTAToken.Minter
    let pantaReceiver: &{FungibleToken.Receiver}
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        self.signerAddress = signer.address

        self.pantaMinter = signer.storage.borrow<&PANTAToken.Minter>(
            from: /storage/pantaTokenMinter
        ) ?? panic("Could not borrow PANTAToken Minter from /storage/pantaTokenMinter")

        // Ensure signer has a PANTA vault; create one if not
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

        self.pantaReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: PANTAToken.VaultStoragePath
        ) ?? panic("Could not borrow signer's PANTA vault receiver")
    }

    execute {
        // Claim vested amount — burns esPANTA internally and returns PANTA amount to mint
        let pantaAmount = EsPANTAToken.claimVested(account: self.signerAddress)

        if pantaAmount > 0.0 {
            let pantaVault <- self.pantaMinter.mintTokens(amount: pantaAmount)
            self.pantaReceiver.deposit(from: <- pantaVault)
        }
    }
}
