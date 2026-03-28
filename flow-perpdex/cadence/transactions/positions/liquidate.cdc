import Vault from 0xPANTA
import PositionManager from 0xPANTA

/// liquidate.cdc
/// Liquidates an undercollateralized position.
/// The signer (keeper/liquidator) receives the liquidation fee.
/// Vault reserve is freed after the position is closed.
/// Requirements: 5.5, 11.6
///
/// Parameters:
///   account:         address of the position owner to liquidate
///   collateralToken: "USDC" or "FLOW" — token used as collateral
///   indexToken:      token being traded (e.g. "FLOW")
///   isLong:          true for long, false for short
///   currentPrice:    current mark price used to evaluate liquidatability
transaction(
    account: Address,
    collateralToken: String,
    indexToken: String,
    isLong: Bool,
    currentPrice: UFix64
) {

    /// Vault Admin resource reference
    let vaultAdmin: &Vault.Admin

    /// Signer address captured in prepare (receives the liquidation fee)
    let signerAddress: Address

    prepare(signer: auth(BorrowValue) &Account) {
        // Borrow the Vault Admin resource from deployer storage
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(
            from: /storage/pantaVaultAdmin
        ) ?? panic("Could not borrow Vault Admin from /storage/pantaVaultAdmin")

        self.signerAddress = signer.address
    }

    execute {
        // 1. Liquidate the position — panics if not liquidatable
        //    Liquidation fee = min(5.0, collateral * 0.10) sent to feeReceiver
        //    Emits PositionLiquidated event with fee details
        PositionManager.liquidatePosition(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong,
            currentPrice: currentPrice,
            feeReceiver: self.signerAddress
        )

        // 2. Free the Vault reserve — position is fully closed, reserve amount is 0
        //    Pass 0.0 as amount: the position's reserved collateral is fully released
        self.vaultAdmin.decreaseReserve(token: collateralToken, amount: 0.0)
    }
}
