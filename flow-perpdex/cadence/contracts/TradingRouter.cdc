import FungibleToken from 0x9a0766d93b6608b7
import MockUSDC from 0xa6d1a763be01f1fa
import Vault from 0xa6d1a763be01f1fa
import PositionManager from 0xa6d1a763be01f1fa
import PriceFeed from 0xa6d1a763be01f1fa

/// TradingRouter.cdc
/// Non-custodial trading entrypoint for PantaDEX.
///
/// Architecture:
///   User wallet  →  openPosition(collateral: @USDC.Vault, ...)  →  TradingRouter.Pool
///                                                                      ├─ deposit USDC
///                                                                      ├─ VaultAdmin.increaseReserve()
///                                                                      ├─ PriceFeed.getPrice()  (on-chain oracle)
///                                                                      └─ PositionManager.increasePosition()
///
/// The deployer signature is NOT required for user trades.
/// Backend role: price keeper (updatePrice tx) + liquidation bot.
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

    /// Protocol liquidity pool.
    /// Holds actual USDC tokens deposited as collateral.
    /// Stored at /storage/tradingRouterPool (deployer account).
    /// Accessible publicly via /public/tradingRouterPool capability.
    access(all) resource Pool {

        /// Protocol USDC vault — holds all user collateral.
        access(self) var usdcVault: @MockUSDC.Vault

        /// Private capability to the Vault accounting admin.
        access(self) let vaultAdminCap: Capability<&Vault.Admin>

        init(vaultAdminCap: Capability<&Vault.Admin>) {
            self.usdcVault <- MockUSDC.createEmptyVault(
                vaultType: Type<@MockUSDC.Vault>()
            ) as! @MockUSDC.Vault
            self.vaultAdminCap = vaultAdminCap
        }

        // ─── Open Position ────────────────────────────────────────────────────

        /// Open or increase a leveraged long/short position.
        ///
        /// Called by user transaction after withdrawing USDC from their own vault.
        ///
        /// - account:         signer.address (passed from tx, verified by tx context)
        /// - collateral:      USDC withdrawn from user's vault
        /// - indexToken:      "BTC" | "ETH" | "FLOW"
        /// - sizeDelta:       total position size in USD (collateral * leverage)
        /// - isLong:          true = long, false = short
        access(all) fun openPosition(
            account: Address,
            collateral: @MockUSDC.Vault,
            indexToken: String,
            sizeDelta: UFix64,
            isLong: Bool
        ) {
            let collateralDelta = collateral.balance
            assert(collateralDelta > 0.0, message: "Collateral must be > 0")

            // 1. Deposit collateral into protocol vault
            self.usdcVault.deposit(from: <-collateral)

            // 2. Read execution price from on-chain oracle
            //    Long uses maxPrice (spread protection), short uses minPrice
            let priceData = PriceFeed.getPrice(symbol: indexToken.concat("/USD"))
            let execPrice = isLong ? priceData.maxPrice : priceData.minPrice

            // 3. Update Vault reserve accounting
            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            admin.increaseReserve(token: "USDC", amount: collateralDelta)

            // 4. Record position in PositionManager
            //    Enforces min collateral, max leverage, size >= collateral
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

        // ─── Close Position ───────────────────────────────────────────────────

        /// Close or decrease a leveraged position.
        ///
        /// Calculates PnL, releases reserve, and sends USDC payout to user.
        ///
        /// - account:         position owner
        /// - indexToken:      "BTC" | "ETH" | "FLOW"
        /// - collateralDelta: collateral to withdraw (pass full collateral to fully close)
        /// - sizeDelta:       position size to close (pass full size to fully close)
        /// - isLong:          true = long, false = short
        /// - receiver:        user's FungibleToken.Receiver (their USDC vault)
        access(all) fun closePosition(
            account: Address,
            indexToken: String,
            collateralDelta: UFix64,
            sizeDelta: UFix64,
            isLong: Bool,
            receiver: &{FungibleToken.Receiver}
        ) {
            assert(sizeDelta > 0.0, message: "sizeDelta must be > 0")

            // 1. Read execution price
            //    Closing long uses minPrice, closing short uses maxPrice
            let priceData = PriceFeed.getPrice(symbol: indexToken.concat("/USD"))
            let execPrice = isLong ? priceData.minPrice : priceData.maxPrice

            // 2. Update PositionManager — returns USDC payout amount
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

            // 3. Release reserve in Vault accounting
            let admin = self.vaultAdminCap.borrow()
                ?? panic("TradingRouter: cannot borrow VaultAdmin")
            if collateralDelta <= Vault.getReservedAmount(token: "USDC") {
                admin.decreaseReserve(token: "USDC", amount: collateralDelta)
            }

            // 4. Send payout to user
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

        /// Returns protocol USDC pool balance (for UI display).
        access(all) view fun poolBalance(): UFix64 {
            return self.usdcVault.balance
        }
    }

    // ─── Contract Init ────────────────────────────────────────────────────────

    init() {
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
