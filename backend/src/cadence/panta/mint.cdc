import FungibleToken from 0x9a0766d93b6608b7
import PANTAToken from 0xPANTA

/// Mint PANTA tokens using the Admin's Minter resource.
/// The signer must have a PANTAToken.Minter stored at /storage/pantaTokenMinter.
/// If the recipient does not have a PANTA vault, one is created and saved.
transaction(amount: UFix64, recipient: Address) {

    let minter: &PANTAToken.Minter

    prepare(signer: auth(BorrowValue, SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        // Load the Minter from signer's storage
        self.minter = signer.storage.borrow<&PANTAToken.Minter>(
            from: PANTAToken.MinterStoragePath
        ) ?? panic("Could not borrow Minter from signer's storage at ".concat(PANTAToken.MinterStoragePath.toString()))

        // Ensure recipient has a PANTA vault; if not, create one
        let recipientAccount = getAccount(recipient)
        if recipientAccount.capabilities.get<&{FungibleToken.Receiver}>(PANTAToken.VaultPublicPath) == nil {
            // We cannot save to another account's storage in a transaction signed only by signer.
            // The recipient must set up their own vault. Panic with a helpful message.
            panic("Recipient does not have a PANTA vault receiver capability at ".concat(PANTAToken.VaultPublicPath.toString()).concat(". Recipient must run setup_account first."))
        }
    }

    execute {
        // Mint the tokens
        let newTokens <- self.minter.mintTokens(amount: amount)

        // Borrow the recipient's PANTA vault receiver
        let recipientVault = getAccount(recipient)
            .capabilities
            .borrow<&{FungibleToken.Receiver}>(PANTAToken.VaultPublicPath)
            ?? panic("Could not borrow PANTA vault receiver from recipient")

        // Deposit the minted tokens into the recipient's vault
        recipientVault.deposit(from: <-newTokens)
    }
}
