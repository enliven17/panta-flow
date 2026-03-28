import FungibleToken from 0x9a0766d93b6608b7
import PANTAToken from 0xPANTA

/// mintPANTAForUser.cdc
/// Mock "buy PANTA" — deployer mints PANTA to a user's vault.
/// Rate: 100 USDC = 1 PANTA (enforced off-chain by backend).
/// Recipient must have a PANTA vault (created via setupAccount.cdc).
/// Parameters:
///   recipient:   user's Flow address
///   amount:      PANTA amount to mint
transaction(recipient: Address, amount: UFix64) {

    let minter: &PANTAToken.Minter
    let recipientVault: &{FungibleToken.Receiver}

    prepare(signer: auth(BorrowValue) &Account) {
        self.minter = signer.storage.borrow<&PANTAToken.Minter>(from: /storage/pantaTokenMinter)
            ?? panic("Could not borrow PANTAToken Minter — run setupMinters first")
        self.recipientVault = getAccount(recipient)
            .capabilities.borrow<&{FungibleToken.Receiver}>(PANTAToken.VaultPublicPath)
            ?? panic("Recipient has no PANTA vault — they must run setupAccount.cdc first")
    }

    execute {
        let tokens <- self.minter.mintTokens(amount: amount)
        self.recipientVault.deposit(from: <- tokens)
    }
}
