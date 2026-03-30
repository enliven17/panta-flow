import MockUSDC from 0xa6d1a763be01f1fa
import TradingRouter from 0xa6d1a763be01f1fa

/// seedTradingPool.cdc
/// Admin-only: Mints MockUSDC and deposits it into the TradingRouter pool
/// so the pool can pay out profits to traders.
/// Run whenever pool balance is low (check via poolBalance() view function).
///
/// Parameters:
///   amount: how much USDC to mint and deposit (e.g. 50000.0)
transaction(amount: UFix64) {

    prepare(signer: auth(BorrowValue) &Account) {
        assert(amount > 0.0, message: "Amount must be > 0")

        let minter = signer.storage.borrow<&MockUSDC.Minter>(
            from: MockUSDC.MinterStoragePath
        ) ?? panic("Cannot borrow MockUSDC.Minter — run setupMinters first")

        let tokens <- minter.mintTokens(amount: amount)

        let pool = signer.storage.borrow<&TradingRouter.Pool>(
            from: /storage/tradingRouterPool
        ) ?? panic("Cannot borrow TradingRouter.Pool from deployer storage")

        pool.depositLiquidity(tokens: <-tokens)

        log("Seeded TradingRouter pool with ".concat(amount.toString()).concat(" USDC"))
    }
}
