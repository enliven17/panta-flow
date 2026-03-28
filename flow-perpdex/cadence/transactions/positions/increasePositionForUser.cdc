import Vault from 0xPANTA
import PositionManager from 0xPANTA

/// increasePositionForUser.cdc
/// Deployer (backend) signs this to open or increase a position on behalf of a user.
/// Parameters:
///   account:          user's Flow address
///   collateralToken:  "USDC" or "FLOW"
///   indexToken:       "BTC" or "ETH"
///   collateralDelta:  collateral added in USD (UFix64)
///   sizeDelta:        position size increase in USD (UFix64)
///   isLong:           true = long, false = short
///   currentPrice:     execution price — use maxPrice for longs, minPrice for shorts
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
        // Reserve collateral in the liquidity pool
        self.vaultAdmin.increaseReserve(token: collateralToken, amount: collateralDelta)

        // Open / increase position for the user
        PositionManager.increasePosition(
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
