import Vault from 0xVAULTDEPLOYER
import PositionManager from 0xPOSITIONMANAGERDEPLOYER

/// decreasePosition.cdc
/// Decreases or closes a leveraged long/short position.
/// Calculates PnL, releases the Vault reserve, and logs the payout amount.
/// Actual token transfer is handled by the keeper monitoring PositionDecreased events.
/// Requirements: 5.3, 11.6
///
/// Parameters:
///   collateralToken: "USDC" or "FLOW" — token used as collateral
///   indexToken:      token being traded (e.g. "FLOW")
///   collateralDelta: collateral amount to withdraw in USD (UFix64)
///   sizeDelta:       position size to reduce in USD (UFix64)
///   isLong:          true for long, false for short
///   currentPrice:    current mark price
transaction(
    collateralToken: String,
    indexToken: String,
    collateralDelta: UFix64,
    sizeDelta: UFix64,
    isLong: Bool,
    currentPrice: UFix64
) {

    /// Vault Admin resource reference
    let vaultAdmin: &Vault.Admin

    /// Signer address captured in prepare
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the Vault Admin resource from deployer storage
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(
            from: /storage/pantaVaultAdmin
        ) ?? panic("Could not borrow Vault Admin from /storage/pantaVaultAdmin")

        self.signerAddress = signer.address
    }

    execute {
        // 1. Decrease the position — returns USD amount owed to the trader
        //    Calculates PnL: (currentPrice - avgPrice) / avgPrice * sizeDelta (long)
        //    Deducts margin fee and funding fee from the payout
        let amountOut = PositionManager.decreasePosition(
            account: self.signerAddress,
            collateralToken: collateralToken,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            currentPrice: currentPrice,
            receiver: self.signerAddress
        )

        // 2. Release the reserved collateral back to the Vault pool
        self.vaultAdmin.decreaseReserve(token: collateralToken, amount: collateralDelta)

        // 3. Log the payout amount — actual token transfer is handled by the keeper
        //    which monitors PositionDecreased events and executes the payout
        log("Position decreased: amountOut=".concat(amountOut.toString())
            .concat(" ").concat(collateralToken)
            .concat(" for ").concat(self.signerAddress.toString()))
    }
}
