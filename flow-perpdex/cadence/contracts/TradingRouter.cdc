import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xa6d1a763be01f1fa
import Vault from 0xa6d1a763be01f1fa
import PositionManager from 0xa6d1a763be01f1fa
import PriceFeed from 0xa6d1a763be01f1fa

/// TradingRouter.cdc
/// Non-custodial trading entrypoint for PantaDEX.
///
/// Architecture:
///   Market order: User → openPosition(collateral) → Pool
///   Limit order:  Handled by separate OrderBook.cdc contract
///
/// The deployer signature is NOT required for user trades.
/// Backend role: price keeper (updatePrice tx) + order executor + liquidation bot.
access(all) contract TradingRouter {

    // ─── Events ──────────────────────────────────────────────────────────────

    access(all) event PositionOpened(
        account: Address,
        indexToken: String,
        collateralDelta: UFix64,
        sizeDelta: UFix64,
        isLong: Bool,
        execPrice: UFix64
    )

    access(all) event PositionClosed(
        account: Address,
        indexToken: String,
        collateralDelta: UFix64,
        sizeDelta: UFix64,
        isLong: Bool,
        amountOut: UFix64,
        execPrice: UFix64
    )

    // ─── Pool Resource ────────────────────────────────────────────────────────

    access(all) resource Pool {

        access(self) var usdcVault: @MockUSDC.Vault
        access(self) let vaultAdminCap: Capability<&Vault.Admin>

        init(vaultAdminCap: Capability<&Vault.Admin>) {
            self.usdcVault <- MockUSDC.createEmptyVault(
                vaultType: Type<@MockUSDC.Vault>()
            ) as! @MockUSDC.Vault
            self.vaultAdminCap = vaultAdminCap
        }

        // ─── Market Open ──────────────────────────────────────────────────────

        access(all) fun openPosition(
            account: Address,
            collateral: @MockUSDC.Vault,
            indexToken: String,
            sizeDelta: UFix64,
            isLong: Bool
        ) {
            let collateralDelta = collateral.balance
            assert(collateralDelta > 0.0, message: "Collateral must be > 0")

            self.usdcVault.deposit(from: <-collateral)

            let priceData = PriceFeed.getPrice(symbol: indexToken.concat("/USD"))
            let execPrice = isLong ? priceData.maxPrice : priceData.minPrice

            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            admin.increaseReserve(token: "USDC", amount: collateralDelta)

            PositionManager.increasePosition(
                account: account,
                collateralToken: "USDC",
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                sizeDelta: sizeDelta,
                isLong: isLong,
                currentPrice: execPrice
            )

            emit PositionOpened(
                account: account,
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                sizeDelta: sizeDelta,
                isLong: isLong,
                execPrice: execPrice
            )
        }

        // ─── Market Close ─────────────────────────────────────────────────────

        access(all) fun closePosition(
            account: Address,
            indexToken: String,
            collateralDelta: UFix64,
            sizeDelta: UFix64,
            isLong: Bool,
            receiver: &{FungibleToken.Receiver}
        ) {
            assert(sizeDelta > 0.0, message: "sizeDelta must be > 0")

            let priceData = PriceFeed.getPrice(symbol: indexToken.concat("/USD"))
            let execPrice = isLong ? priceData.minPrice : priceData.maxPrice

            let amountOut = PositionManager.decreasePosition(
                account: account,
                collateralToken: "USDC",
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                sizeDelta: sizeDelta,
                isLong: isLong,
                currentPrice: execPrice,
                receiver: account
            )

            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            if collateralDelta <= Vault.getReservedAmount(token: "USDC") {
                admin.decreaseReserve(token: "USDC", amount: collateralDelta)
            }

            if amountOut > 0.0 {
                let poolBal = self.usdcVault.balance
                let sendAmount = amountOut > poolBal ? poolBal : amountOut
                if sendAmount > 0.0 {
                    let vaultRef = &self.usdcVault as auth(FungibleToken.Withdraw) &MockUSDC.Vault
                    let payout <- vaultRef.withdraw(amount: sendAmount)
                    receiver.deposit(from: <-payout)
                }
            }

            emit PositionClosed(
                account: account,
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                sizeDelta: sizeDelta,
                isLong: isLong,
                amountOut: amountOut,
                execPrice: execPrice
            )
        }

        // ─── Add Collateral ───────────────────────────────────────────────────

        access(all) fun addCollateral(
            account: Address,
            collateral: @MockUSDC.Vault,
            indexToken: String,
            isLong: Bool
        ) {
            let collateralDelta = collateral.balance
            assert(collateralDelta > 0.0, message: "Collateral must be > 0")

            self.usdcVault.deposit(from: <-collateral)

            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            admin.increaseReserve(token: "USDC", amount: collateralDelta)

            PositionManager.addCollateral(
                account: account,
                collateralToken: "USDC",
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                isLong: isLong
            )

            emit PositionOpened(
                account: account,
                indexToken: indexToken,
                collateralDelta: collateralDelta,
                sizeDelta: 0.0,
                isLong: isLong,
                execPrice: 0.0
            )
        }

        /// Deposit liquidity into the pool so it can pay out profits.
        /// Called by the deployer's seedTradingPool transaction.
        access(all) fun depositLiquidity(tokens: @MockUSDC.Vault) {
            assert(tokens.balance > 0.0, message: "Cannot deposit 0")
            self.usdcVault.deposit(from: <-tokens)
        }

        access(all) view fun poolBalance(): UFix64 {
            return self.usdcVault.balance
        }
    }

    // ─── Contract Init ────────────────────────────────────────────────────────

    init() {
        let vaultAdminCap = self.account.capabilities.storage
            .issue<&Vault.Admin>(/storage/pantaVaultAdmin)

        let pool <- create Pool(vaultAdminCap: vaultAdminCap)
        self.account.storage.save(<-pool, to: /storage/tradingRouterPool)

        let poolCap = self.account.capabilities.storage
            .issue<&Pool>(/storage/tradingRouterPool)
        self.account.capabilities.publish(poolCap, at: /public/tradingRouterPool)
    }
}
