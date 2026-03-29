import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xa6d1a763be01f1fa
import TradingRouter from 0xa6d1a763be01f1fa
import PriceFeed from 0xa6d1a763be01f1fa

/// OrderBook.cdc
/// Limit order management for PantaDEX.
///
/// Architecture:
///   User → createOrder(collateral, limitPrice) → OrderManager (escrowed USDC)
///   Keeper → executeOrder(id) when price condition is met
///             → calls TradingRouter.Pool.openPosition() with escrowed USDC
///
/// Trigger rules:
///   Long  limit order: executes when mark price <= limitPrice
///   Short limit order: executes when mark price >= limitPrice
access(all) contract OrderBook {

    // ─── Events ──────────────────────────────────────────────────────────────

    access(all) event OrderCreated(
        id: UInt64,
        account: Address,
        indexToken: String,
        sizeDelta: UFix64,
        isLong: Bool,
        limitPrice: UFix64,
        collateralAmount: UFix64
    )

    access(all) event OrderExecuted(
        id: UInt64,
        account: Address,
        indexToken: String,
        isLong: Bool,
        execPrice: UFix64
    )

    access(all) event OrderCancelled(
        id: UInt64,
        account: Address
    )

    // ─── Struct ───────────────────────────────────────────────────────────────

    access(all) struct LimitOrder {
        access(all) let id: UInt64
        access(all) let account: Address
        access(all) let indexToken: String
        access(all) let sizeDelta: UFix64
        access(all) let isLong: Bool
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

    // ─── OrderManager Resource ────────────────────────────────────────────────

    access(all) resource OrderManager {

        access(self) var orders: {UInt64: LimitOrder}
        access(self) var orderEscrow: @{UInt64: MockUSDC.Vault}
        access(self) var nextId: UInt64

        init() {
            self.orders = {}
            self.orderEscrow <- {}
            self.nextId = 0
        }

        // ─── Create ───────────────────────────────────────────────────────────

        access(all) fun createOrder(
            account: Address,
            collateral: @MockUSDC.Vault,
            indexToken: String,
            sizeDelta: UFix64,
            isLong: Bool,
            limitPrice: UFix64
        ): UInt64 {
            let amount = collateral.balance
            assert(amount > 0.0, message: "Collateral must be > 0")
            assert(limitPrice > 0.0, message: "Limit price must be > 0")

            let id = self.nextId
            self.nextId = id + 1

            self.orders[id] = LimitOrder(
                id: id,
                account: account,
                indexToken: indexToken,
                sizeDelta: sizeDelta,
                isLong: isLong,
                limitPrice: limitPrice,
                collateralAmount: amount
            )
            self.orderEscrow[id] <-! collateral

            emit OrderCreated(
                id: id,
                account: account,
                indexToken: indexToken,
                sizeDelta: sizeDelta,
                isLong: isLong,
                limitPrice: limitPrice,
                collateralAmount: amount
            )
            return id
        }

        // ─── Cancel ───────────────────────────────────────────────────────────

        access(all) fun cancelOrder(account: Address, orderId: UInt64) {
            let order = self.orders[orderId] ?? panic("Order not found")
            assert(order.account == account, message: "Not your order")

            self.orders.remove(key: orderId)
            let escrow <- self.orderEscrow.remove(key: orderId)
                ?? panic("Escrow not found")

            let receiver = getAccount(account)
                .capabilities.borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
                ?? panic("Cannot borrow USDC receiver")
            receiver.deposit(from: <-escrow)

            emit OrderCancelled(id: orderId, account: account)
        }

        // ─── Execute (keeper-called) ──────────────────────────────────────────

        access(all) fun executeOrder(orderId: UInt64) {
            let order = self.orders[orderId] ?? panic("Order not found")

            let priceData = PriceFeed.getPrice(symbol: order.indexToken.concat("/USD"))
            let execPrice = order.isLong ? priceData.maxPrice : priceData.minPrice

            if order.isLong {
                assert(execPrice <= order.limitPrice, message: "Price above limit")
            } else {
                assert(execPrice >= order.limitPrice, message: "Price below limit")
            }

            self.orders.remove(key: orderId)
            let escrow <- self.orderEscrow.remove(key: orderId)
                ?? panic("Escrow not found")

            // Call TradingRouter.Pool.openPosition() with escrowed USDC
            let pantaAddress = OrderBook.account.address
            let pool = getAccount(pantaAddress)
                .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
                ?? panic("Cannot borrow TradingRouter.Pool")

            pool.openPosition(
                account: order.account,
                collateral: <-escrow,
                indexToken: order.indexToken,
                sizeDelta: order.sizeDelta,
                isLong: order.isLong
            )

            emit OrderExecuted(
                id: orderId,
                account: order.account,
                indexToken: order.indexToken,
                isLong: order.isLong,
                execPrice: execPrice
            )
        }

        // ─── View ─────────────────────────────────────────────────────────────

        access(all) view fun getAllOrders(): {UInt64: LimitOrder} {
            return self.orders
        }

        access(all) view fun getOrdersForAccount(account: Address): [LimitOrder] {
            var result: [LimitOrder] = []
            for order in self.orders.values {
                if order.account == account {
                    result.append(order)
                }
            }
            return result
        }
    }

    // ─── Contract Init ────────────────────────────────────────────────────────

    init() {
        let mgr <- create OrderManager()
        self.account.storage.save(<-mgr, to: /storage/pantaOrderBook)

        let mgrCap = self.account.capabilities.storage
            .issue<&OrderManager>(/storage/pantaOrderBook)
        self.account.capabilities.publish(mgrCap, at: /public/pantaOrderBook)
    }
}
