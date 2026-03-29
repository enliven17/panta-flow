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
///   Limit order:  User → createLimitOrder(collateral, limitPrice) → Pool (escrow)
///                 Keeper → executeOrder(id) when price is met
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

    access(all) event LimitOrderCreated(
        id: UInt64,
        account: Address,
        indexToken: String,
        sizeDelta: UFix64,
        isLong: Bool,
        limitPrice: UFix64,
        collateralAmount: UFix64
    )

    access(all) event LimitOrderExecuted(
        id: UInt64,
        account: Address,
        indexToken: String,
        isLong: Bool,
        execPrice: UFix64
    )

    access(all) event LimitOrderCancelled(
        id: UInt64,
        account: Address
    )

    // ─── Limit Order Struct ───────────────────────────────────────────────────

    access(all) struct LimitOrder {
        access(all) let id: UInt64
        access(all) let account: Address
        access(all) let indexToken: String
        access(all) let sizeDelta: UFix64
        access(all) let isLong: Bool
        /// Trigger price:
        ///   Long  → execute when mark price <= limitPrice
        ///   Short → execute when mark price >= limitPrice
        access(all) let limitPrice: UFix64
        access(all) let collateralAmount: UFix64
        access(all) let createdAt: UFix64

        init(
            id: UInt64,
            account: Address,
            indexToken: String,
            sizeDelta: UFix64,
            isLong: Bool,
            limitPrice: UFix64,
            collateralAmount: UFix64
        ) {
            self.id = id
            self.account = account
            self.indexToken = indexToken
            self.sizeDelta = sizeDelta
            self.isLong = isLong
            self.limitPrice = limitPrice
            self.collateralAmount = collateralAmount
            self.createdAt = getCurrentBlock().timestamp
        }
    }

    // ─── Contract-level Order Book ────────────────────────────────────────────

    /// Auto-incrementing order ID
    access(contract) var nextOrderId: UInt64

    /// Pending limit orders (metadata only — collateral stored in orderEscrow)
    access(contract) var limitOrders: {UInt64: LimitOrder}

    /// USDC collateral held in escrow until order executes or is cancelled
    access(contract) var orderEscrow: @{UInt64: MockUSDC.Vault}

    // ─── Pool Resource ────────────────────────────────────────────────────────

    /// Protocol liquidity pool.
    /// Holds actual USDC tokens deposited as collateral.
    /// Stored at /storage/tradingRouterPool (deployer account).
    /// Accessible publicly via /public/tradingRouterPool capability.
    access(all) resource Pool {

        /// Protocol USDC vault — holds all open position collateral.
        access(self) var usdcVault: @MockUSDC.Vault

        /// Private capability to the Vault accounting admin.
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

        // ─── Limit Order: Create ──────────────────────────────────────────────

        /// Place a limit order. USDC collateral is held in contract-level escrow.
        ///
        /// - account:     signer.address (verified by tx)
        /// - collateral:  USDC to deposit as collateral when order executes
        /// - indexToken:  "BTC" | "ETH" | "FLOW"
        /// - sizeDelta:   total position size (collateral * leverage)
        /// - isLong:      true = long, false = short
        /// - limitPrice:  Long executes when price <= limitPrice,
        ///                Short executes when price >= limitPrice
        access(all) fun createLimitOrder(
            account: Address,
            collateral: @MockUSDC.Vault,
            indexToken: String,
            sizeDelta: UFix64,
            isLong: Bool,
            limitPrice: UFix64
        ): UInt64 {
            let collateralAmount = collateral.balance
            assert(collateralAmount > 0.0, message: "Collateral must be > 0")
            assert(limitPrice > 0.0, message: "Limit price must be > 0")

            let id = TradingRouter.nextOrderId
            TradingRouter.nextOrderId = id + 1

            TradingRouter.limitOrders[id] = LimitOrder(
                id: id,
                account: account,
                indexToken: indexToken,
                sizeDelta: sizeDelta,
                isLong: isLong,
                limitPrice: limitPrice,
                collateralAmount: collateralAmount
            )

            TradingRouter.orderEscrow[id] <-! collateral

            emit LimitOrderCreated(
                id: id,
                account: account,
                indexToken: indexToken,
                sizeDelta: sizeDelta,
                isLong: isLong,
                limitPrice: limitPrice,
                collateralAmount: collateralAmount
            )

            return id
        }

        // ─── Limit Order: Cancel ──────────────────────────────────────────────

        /// Cancel a pending limit order and return escrowed USDC to the user.
        /// Only the order owner (verified via account param from signer.address) can cancel.
        access(all) fun cancelOrder(account: Address, orderId: UInt64) {
            let order = TradingRouter.limitOrders[orderId]
                ?? panic("Limit order not found")
            assert(order.account == account, message: "Not your order")

            TradingRouter.limitOrders.remove(key: orderId)
            let escrow <- TradingRouter.orderEscrow.remove(key: orderId)
                ?? panic("Escrow not found for order")

            let receiver = getAccount(account)
                .capabilities.borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
                ?? panic("Cannot borrow USDC receiver")
            receiver.deposit(from: <-escrow)

            emit LimitOrderCancelled(id: orderId, account: account)
        }

        // ─── Limit Order: Execute (keeper-called) ─────────────────────────────

        /// Execute a pending limit order when the price condition is met.
        /// Called by the backend keeper (deployer-signed tx).
        /// Anyone can call — the price assertion is the guard.
        access(all) fun executeOrder(orderId: UInt64) {
            let order = TradingRouter.limitOrders[orderId]
                ?? panic("Limit order not found")

            let priceData = PriceFeed.getPrice(symbol: order.indexToken.concat("/USD"))
            let execPrice = order.isLong ? priceData.maxPrice : priceData.minPrice

            // Verify limit price condition
            if order.isLong {
                assert(
                    execPrice <= order.limitPrice,
                    message: "Price above limit — cannot execute long order"
                )
            } else {
                assert(
                    execPrice >= order.limitPrice,
                    message: "Price below limit — cannot execute short order"
                )
            }

            TradingRouter.limitOrders.remove(key: orderId)
            let escrow <- TradingRouter.orderEscrow.remove(key: orderId)
                ?? panic("Escrow not found for order")

            let collateralAmount = escrow.balance
            self.usdcVault.deposit(from: <-escrow)

            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            admin.increaseReserve(token: "USDC", amount: collateralAmount)

            PositionManager.increasePosition(
                account: order.account,
                collateralToken: "USDC",
                indexToken: order.indexToken,
                collateralDelta: collateralAmount,
                sizeDelta: order.sizeDelta,
                isLong: order.isLong,
                currentPrice: execPrice
            )

            emit LimitOrderExecuted(
                id: orderId,
                account: order.account,
                indexToken: order.indexToken,
                isLong: order.isLong,
                execPrice: execPrice
            )

            emit PositionOpened(
                account: order.account,
                indexToken: order.indexToken,
                collateralDelta: collateralAmount,
                sizeDelta: order.sizeDelta,
                isLong: order.isLong,
                execPrice: execPrice
            )
        }

        // ─── View ─────────────────────────────────────────────────────────────

        access(all) view fun poolBalance(): UFix64 {
            return self.usdcVault.balance
        }

        access(all) view fun getPendingOrders(): {UInt64: LimitOrder} {
            return TradingRouter.limitOrders
        }
    }

    // ─── Contract Init ────────────────────────────────────────────────────────

    init() {
        self.nextOrderId = 0
        self.limitOrders = {}
        self.orderEscrow <- {}

        // Issue private capability to Vault.Admin (same deployer account)
        let vaultAdminCap = self.account.capabilities.storage
            .issue<&Vault.Admin>(/storage/pantaVaultAdmin)

        // Create and store the Pool resource
        let pool <- create Pool(vaultAdminCap: vaultAdminCap)
        self.account.storage.save(<-pool, to: /storage/tradingRouterPool)

        // Publish public Pool capability so user transactions can call it
        let poolCap = self.account.capabilities.storage
            .issue<&Pool>(/storage/tradingRouterPool)
        self.account.capabilities.publish(poolCap, at: /public/tradingRouterPool)
    }
}
