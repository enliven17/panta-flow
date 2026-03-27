import FungibleToken from 0x9a0766d93b6608b7
import Vault from 0xVAULTDEPLOYER
import PLPToken from 0xPLPDEPLOYER

/// removeLiquidity.cdc
/// Redeems PLP tokens and receives MockUSDC or FLOW in return.
/// Enforces the 15-minute cooldown before allowing redemption.
/// Requirements: 4.3, 11.6
///
/// Parameters:
///   plpAmount:   amount of PLP tokens to redeem (UFix64)
///   tokenOut:    "USDC" or "FLOW" — the token to receive
///   plpPriceUSD: current PLP price in USD (UFix64)
transaction(plpAmount: UFix64, tokenOut: String, plpPriceUSD: UFix64) {

    /// Vault Admin resource reference
    let vaultAdmin: &Vault.Admin

    /// PLPToken Minter resource reference
    let plpMinter: &PLPToken.Minter

    /// Signer's PLP vault (needs withdraw access)
    let plpVaultRef: auth(FungibleToken.Withdraw) &PLPToken.Vault

    /// Signer address (captured in prepare for use in execute)
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the Vault Admin resource
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(
            from: /storage/pantaVaultAdmin
        ) ?? panic("Could not borrow Vault Admin from /storage/pantaVaultAdmin")

        // Borrow the PLPToken Minter resource
        self.plpMinter = signer.storage.borrow<&PLPToken.Minter>(
            from: /storage/plpTokenMinter
        ) ?? panic("Could not borrow PLPToken Minter from /storage/plpTokenMinter")

        // Borrow signer's PLP vault with withdraw entitlement
        self.plpVaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &PLPToken.Vault>(
            from: PLPToken.VaultStoragePath
        ) ?? panic("Could not borrow signer's PLP vault from storage")

        self.signerAddress = signer.address
    }

    execute {
        // 1. Check cooldown: panic if the 15-minute cooldown has not elapsed
        assert(
            PLPToken.canRedeem(account: self.signerAddress),
            message: "PLP cooldown not elapsed: must wait 15 minutes after minting before redeeming"
        )

        // 2. Withdraw PLP tokens from signer's vault
        let plpVault <- self.plpVaultRef.withdraw(amount: plpAmount) as! @PLPToken.Vault

        // 3. Call removeLiquidity on the Vault Admin — returns the token amount to release
        let tokenAmount = self.vaultAdmin.removeLiquidity(
            plpAmount: plpAmount,
            tokenOut: tokenOut,
            redeemer: self.signerAddress,
            plpPriceUSD: plpPriceUSD
        )

        // 4. Burn the redeemed PLP tokens
        self.plpMinter.burnPLP(vault: <- plpVault)

        // 5. Emit that tokenAmount is available for the redeemer.
        //    Actual token transfer (MockUSDC or FLOW) is handled by the keeper/backend
        //    which monitors LiquidityRemoved events and executes the payout.
        log("Liquidity removed: ".concat(tokenAmount.toString())
            .concat(" ").concat(tokenOut)
            .concat(" available for ").concat(self.signerAddress.toString()))
    }
}
