import FungibleToken from 0x9a0766d93b6608b7
import MockUSDCFaucet from 0xPANTA
import MockUSDC from 0xPANTA

/// claimUSDC.cdc
/// Claims 1000 MockUSDC from the faucet (24-hour cooldown enforced by contract).
/// Mints MockUSDC tokens and deposits them into the signer's MockUSDC vault.
/// Requirements: 7.3, 11.6
transaction {

    let usdcMinter: &MockUSDC.Minter
    let usdcReceiver: &{FungibleToken.Receiver}
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        self.signerAddress = signer.address

        self.usdcMinter = signer.storage.borrow<&MockUSDC.Minter>(
            from: /storage/mockUSDCMinter
        ) ?? panic("Could not borrow MockUSDC Minter from /storage/mockUSDCMinter")

        // Ensure signer has a MockUSDC vault; create one if not
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

        self.usdcReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: MockUSDC.VaultStoragePath
        ) ?? panic("Could not borrow signer's MockUSDC vault receiver")
    }

    execute {
        // Claim from faucet — enforces 24h cooldown, returns 1000.0
        let claimAmount = MockUSDCFaucet.claimTokens(recipient: self.signerAddress)

        // Mint MockUSDC and deposit into signer's vault
        let usdcVault <- self.usdcMinter.mintTokens(amount: claimAmount)
        self.usdcReceiver.deposit(from: <- usdcVault)
    }
}
