import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

/// openPosition.cdc
/// Non-custodial: ONLY the user signs this transaction.
/// User withdraws USDC from their own vault and passes it to TradingRouter.Pool.
/// Price is read from the on-chain PriceFeed oracle — not passed as a parameter.
///
/// Parameters:
///   indexToken:       "BTC" | "ETH" | "FLOW"
///   collateralAmount: USDC to deposit as collateral (UFix64, 8 decimals)
///   sizeDelta:        total position size in USD (collateralAmount * leverage)
///   isLong:           true = long, false = short
transaction(
    indexToken: String,
    collateralAmount: UFix64,
    sizeDelta: UFix64,
    isLong: Bool
) {
    prepare(signer: auth(BorrowValue) &Account) {
        // 1. Borrow user's USDC vault with Withdraw entitlement
        let userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &MockUSDC.Vault>(
            from: MockUSDC.VaultStoragePath
        ) ?? panic("USDC vault not found. Please call setupAccount first.")

        // 2. Withdraw collateral from user's vault
        let collateral <- userVault.withdraw(amount: collateralAmount) as! @MockUSDC.Vault

        // 3. Borrow TradingRouter.Pool via public capability
        //    0xPANTA is replaced by FCL to the deployer address
        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool — is it deployed?")

        // 4. Open position — price is fetched on-chain from PriceFeed
        pool.openPosition(
            account: signer.address,
            collateral: <-collateral,
            indexToken: indexToken,
            sizeDelta: sizeDelta,
            isLong: isLong
        )
    }
}
