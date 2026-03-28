import Vault from 0xPANTA
import PositionManager from 0xPANTA

/// decreasePositionForUser.cdc
/// Deployer (backend) signs this to partially or fully close a user's position.
/// Parameters:
///   account:          user's Flow address
///   collateralToken:  "USDC" or "FLOW"
///   indexToken:       "BTC" or "ETH"
///   collateralDelta:  collateral to remove in USD (0 to keep same collateral)
///   sizeDelta:        position size to close in USD (equals full size to close entirely)
///   isLong:           true = long, false = short
///   currentPrice:     execution price — use minPrice for longs, maxPrice for shorts
transaction(
    account: Address,
    collateralToken: String,
    indexToken: String,
    collateralDelta: UFix64,
    sizeDelta: UFix64,
    isLong: Bool,
    currentPrice: UFix64
) {
    let vaultAdmin: &Vault.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(from: /storage/pantaVaultAdmin)
            ?? panic("Could not borrow Vault Admin")
    }

    execute {
        // Release reserved collateral back to pool
        if collateralDelta > 0.0 {
            self.vaultAdmin.decreaseReserve(token: collateralToken, amount: collateralDelta)
        }

        // Decrease / close the position
        PositionManager.decreasePosition(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            currentPrice: currentPrice
        )
    }
}
