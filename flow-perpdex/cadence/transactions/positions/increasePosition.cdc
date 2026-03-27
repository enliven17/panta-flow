import Vault from 0xVAULTDEPLOYER
import PositionManager from 0xPOSITIONMANAGERDEPLOYER

/// increasePosition.cdc
/// Opens or increases a leveraged long/short position.
/// Reserves collateral in the Vault and records the position in PositionManager.
/// Requirements: 5.1, 5.3, 11.6
///
/// Parameters:
///   collateralToken: "USDC" or "FLOW" — token used as collateral
///   indexToken:      token being traded (e.g. "FLOW")
///   collateralDelta: collateral amount to add in USD (UFix64)
///   sizeDelta:       position size increase in USD (UFix64)
///   isLong:          true for long, false for short
///   currentPrice:    for long use maxPrice, for short use minPrice (spread protection)
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
        // 1. Reserve collateral in the Vault — enforces reservedAmount <= poolAmount invariant
        self.vaultAdmin.increaseReserve(token: collateralToken, amount: collateralDelta)

        // 2. Open or increase the position in PositionManager
        //    Enforces: min collateral (10 USD), max leverage (50x), size >= collateral
        PositionManager.increasePosition(
            account: self.signerAddress,
            collateralToken: collateralToken,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            currentPrice: currentPrice
        )
    }
}
