import FungibleToken from 0x9a0766d93b6608b7
import Vault from 0xPANTA
import PLPToken from 0xPANTA

/// addLiquidity.cdc
/// Deposits MockUSDC or FLOW into the Vault and receives PLP tokens in return.
/// Requirements: 4.2, 11.6
///
/// Parameters:
///   token:         "USDC" or "FLOW" — the token being deposited
///   amount:        raw token amount to deposit (UFix64)
///   tokenPriceUSD: current USD price of the deposited token (UFix64)
transaction(token: String, amount: UFix64, tokenPriceUSD: UFix64) {

    /// Vault Admin resource reference (borrowed from deployer storage)
    let vaultAdmin: &Vault.Admin

    /// PLPToken Minter resource reference
    let plpMinter: &PLPToken.Minter

    /// Signer's PLP vault receiver capability
    let plpReceiver: &{FungibleToken.Receiver}

    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the Vault Admin resource
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(
            from: /storage/pantaVaultAdmin
        ) ?? panic("Could not borrow Vault Admin from /storage/pantaVaultAdmin")

        // Borrow the PLPToken Minter resource
        self.plpMinter = signer.storage.borrow<&PLPToken.Minter>(
            from: /storage/plpTokenMinter
        ) ?? panic("Could not borrow PLPToken Minter from /storage/plpTokenMinter")

        // Ensure signer has a PLP vault; create one if not
        if signer.storage.borrow<&PLPToken.Vault>(from: PLPToken.VaultStoragePath) == nil {
            signer.storage.save(
                <- PLPToken.createEmptyVault(vaultType: Type<@PLPToken.Vault>()),
                to: PLPToken.VaultStoragePath
            )
            signer.capabilities.publish(
                signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(PLPToken.VaultStoragePath),
                at: PLPToken.VaultPublicPath
            )
        }

        self.plpReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: PLPToken.VaultStoragePath
        ) ?? panic("Could not borrow signer's PLP vault receiver")
    }

    execute {
        // 1. Call addLiquidity on the Vault Admin — returns depositUSD (after swap fee)
        let depositUSD = self.vaultAdmin.addLiquidity(
            token: token,
            amount: amount,
            depositor: self.plpReceiver.owner!.address,
            tokenPriceUSD: tokenPriceUSD
        )

        // 2. Calculate PLP amount: depositUSD / PLPPrice
        //    PLPPrice = AUM / totalSupply (or 1.0 if supply is zero)
        let plpPrice = PLPToken.getPLPPrice(aum: Vault.getAUM())
        let plpAmount = depositUSD / plpPrice

        // 3. Mint PLP tokens for the signer
        let newPLP <- self.plpMinter.mintPLP(
            amount: plpAmount,
            recipient: self.plpReceiver.owner!.address
        )

        // 4. Deposit PLP into signer's PLP vault
        self.plpReceiver.deposit(from: <- newPLP)
    }
}
