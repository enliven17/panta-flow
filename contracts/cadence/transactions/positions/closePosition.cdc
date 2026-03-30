import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

/// closePosition.cdc
/// Non-custodial: ONLY the user signs this transaction.
/// Closes or decreases a position; USDC payout is sent back to the user's vault.
/// Price is read from the on-chain PriceFeed oracle.
///
/// Parameters:
///   indexToken:       "BTC" | "ETH" | "FLOW"
///   collateralDelta:  collateral to withdraw (pass full position collateral to fully close)
///   sizeDelta:        position size to close (pass full position size to fully close)
///   isLong:           true = long, false = short
transaction(
    indexToken: String,
    collateralDelta: UFix64,
    sizeDelta: UFix64,
    isLong: Bool
) {
    prepare(signer: auth(BorrowValue) &Account) {
        // 1. Borrow user's USDC receiver capability to receive payout
        let receiver = signer.capabilities
            .borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
            ?? panic("No USDC receiver. Please call setupAccount first.")

        // 2. Borrow TradingRouter.Pool via public capability
        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool — is it deployed?")

        // 3. Close position — PnL calculated on-chain, USDC sent to receiver
        pool.closePosition(
            account: signer.address,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            receiver: receiver
        )
    }
}
