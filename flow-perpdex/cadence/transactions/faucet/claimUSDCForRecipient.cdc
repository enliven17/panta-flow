import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xPANTA
import MockUSDCFaucet from 0xPANTA

/// claimUSDCForRecipient.cdc
/// Deployer (backend) signs this to mint 1000 MockUSDC and send to a recipient.
/// The recipient must have run setupAccount.cdc first (to create their vault).
/// The faucet enforces a 24-hour cooldown per recipient address.
///
/// Parameters:
///   recipient: Address of the user requesting the faucet
transaction(recipient: Address) {

    let minter: &MockUSDC.Minter
    let recipientVault: &{FungibleToken.Receiver}

    prepare(signer: auth(BorrowValue) &Account) {
        self.minter = signer.storage.borrow<&MockUSDC.Minter>(from: /storage/mockUSDCMinter)
            ?? panic("Could not borrow MockUSDC Minter — run setupMinters first")

        self.recipientVault = getAccount(recipient)
            .capabilities.borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
            ?? panic("Recipient has no MockUSDC vault — they must run setupAccount.cdc first")
    }

    execute {
        // Enforce 24h cooldown and decrement reserve counter
        let amount = MockUSDCFaucet.claimTokens(recipient: recipient)

        // Mint tokens and send directly to recipient's vault
        let tokens <- self.minter.mintTokens(amount: amount)
        self.recipientVault.deposit(from: <- tokens)
    }
}
