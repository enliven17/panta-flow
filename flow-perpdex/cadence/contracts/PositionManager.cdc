/// PositionManager.cdc
/// Manages leveraged long/short positions for PantaDEX on Flow.
/// Handles position creation, modification, liquidation, and global short tracking.
/// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11
access(all) contract PositionManager {

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// Minimum collateral required to open a position (USD)
    access(all) let MIN_COLLATERAL_USD: UFix64

    /// Fixed liquidation fee cap (USD)
    access(all) let LIQUIDATION_FEE_USD: UFix64

    /// Liquidation fee as a fraction of collateral (10%)
    access(all) let LIQUIDATION_FEE_RATE: UFix64

    /// Position is liquidatable when remaining collateral < 1% of original collateral
    access(all) let LIQUIDATION_THRESHOLD_RATE: UFix64

    /// Maximum leverage: 50x (size / collateral <= 50)
    access(all) let MAX_LEVERAGE: UFix64

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    access(all) event PositionIncreased(
        account: Address,
        collateralToken: String,
        indexToken: String,
        isLong: Bool,
        sizeDelta: UFix64,
        collateralDelta: UFix64,
        averagePrice: UFix64,
        newSize: UFix64,
        newCollateral: UFix64
    )

    access(all) event PositionDecreased(
        account: Address,
        collateralToken: String,
        indexToken: String,
        isLong: Bool,
        sizeDelta: UFix64,
        collateralDelta: UFix64,
        pnl: UFix64,
        isProfit: Bool,
        amountOut: UFix64
    )

    access(all) event PositionLiquidated(
        account: Address,
        collateralToken: String,
        indexToken: String,
        isLong: Bool,
        size: UFix64,
        collateral: UFix64,
        liquidationFee: UFix64,
        feeReceiver: Address
    )

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    /// Represents a single leveraged position.
    /// Invariant: size >= collateral (leverage always >= 1x)
    access(all) struct Position {
        access(all) var size: UFix64            // position size in USD
        access(all) var collateral: UFix64      // collateral in USD
        access(all) var averagePrice: UFix64    // average entry price
        access(all) var entryFundingRate: UFix64
        access(all) var isLong: Bool
        access(all) var lastIncreasedTime: UFix64

        init(
            size: UFix64,
            collateral: UFix64,
            averagePrice: UFix64,
            entryFundingRate: UFix64,
            isLong: Bool,
            lastIncreasedTime: UFix64
        ) {
            self.size = size
            self.collateral = collateral
            self.averagePrice = averagePrice
            self.entryFundingRate = entryFundingRate
            self.isLong = isLong
            self.lastIncreasedTime = lastIncreasedTime
        }
    }

    // -------------------------------------------------------------------------
    // Contract-level state
    // -------------------------------------------------------------------------

    /// All open positions keyed by position key
    access(all) var positions: {String: Position}

    /// Total short size per index token
    access(all) var globalShortSizes: {String: UFix64}

    /// Weighted average short entry price per index token
    access(all) var globalShortAveragePrices: {String: UFix64}

    // -------------------------------------------------------------------------
    // Admin resource
    // -------------------------------------------------------------------------

    access(all) resource Admin {}

    // -------------------------------------------------------------------------
    // Public functions
    // -------------------------------------------------------------------------

    /// Returns a deterministic position key from the given parameters.
    /// Format: "<address>-<collateralToken>-<indexToken>-<long|short>"
    access(all) fun getPositionKey(
        account: Address,
        collateralToken: String,
        indexToken: String,
        isLong: Bool
    ): String {
        return account.toString()
            .concat("-")
            .concat(collateralToken)
            .concat("-")
            .concat(indexToken)
            .concat("-")
            .concat(isLong ? "long" : "short")
    }

    /// Open or increase an existing position.
    ///
    /// - account: trader address
    /// - collateralToken: token used as collateral ("USDC" or "FLOW")
    /// - indexToken: token being traded ("FLOW", etc.)
    /// - collateralDelta: collateral amount added (USD)
    /// - sizeDelta: position size increase (USD)
    /// - isLong: true for long, false for short
    /// - currentPrice: for long use maxPrice, for short use minPrice (spread protection)
    access(all) fun increasePosition(
        account: Address,
        collateralToken: String,
        indexToken: String,
        collateralDelta: UFix64,
        sizeDelta: UFix64,
        isLong: Bool,
        currentPrice: UFix64
    ) {
        assert(collateralDelta >= PositionManager.MIN_COLLATERAL_USD, message: "Collateral below minimum")
        assert(currentPrice > 0.0, message: "Invalid price")

        let key = PositionManager.getPositionKey(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong
        )

        let newAveragePrice: UFix64
        let newSize: UFix64
        let newCollateral: UFix64

        if let existing = PositionManager.positions[key] {
            // Weighted average price for existing position
            // newAvgPrice = (existing.size * existing.averagePrice + sizeDelta * currentPrice)
            //               / (existing.size + sizeDelta)
            let totalSize = existing.size + sizeDelta
            if totalSize > 0.0 {
                newAveragePrice = (existing.size * existing.averagePrice + sizeDelta * currentPrice) / totalSize
            } else {
                newAveragePrice = currentPrice
            }
            newSize = existing.size + sizeDelta
            newCollateral = existing.collateral + collateralDelta
        } else {
            // New position
            newAveragePrice = currentPrice
            newSize = sizeDelta
            newCollateral = collateralDelta
        }

        // Validate max leverage: size / collateral <= MAX_LEVERAGE
        assert(
            newSize <= newCollateral * PositionManager.MAX_LEVERAGE,
            message: "Leverage exceeds maximum"
        )

        // Validate size >= collateral invariant
        assert(newSize >= newCollateral, message: "Size must be >= collateral")

        let now = getCurrentBlock().timestamp

        PositionManager.positions[key] = Position(
            size: newSize,
            collateral: newCollateral,
            averagePrice: newAveragePrice,
            entryFundingRate: 0.0,
            isLong: isLong,
            lastIncreasedTime: now
        )

        // Update global short tracking
        if !isLong {
            let prevShortSize = PositionManager.globalShortSizes[indexToken] ?? 0.0
            let prevAvgPrice = PositionManager.globalShortAveragePrices[indexToken] ?? 0.0
            let newShortSize = prevShortSize + sizeDelta

            // Weighted average short price
            let newAvgShortPrice: UFix64
            if newShortSize > 0.0 {
                newAvgShortPrice = (prevShortSize * prevAvgPrice + sizeDelta * currentPrice) / newShortSize
            } else {
                newAvgShortPrice = currentPrice
            }

            PositionManager.globalShortSizes[indexToken] = newShortSize
            PositionManager.globalShortAveragePrices[indexToken] = newAvgShortPrice
        }

        emit PositionIncreased(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong,
            sizeDelta: sizeDelta,
            collateralDelta: collateralDelta,
            averagePrice: newAveragePrice,
            newSize: newSize,
            newCollateral: newCollateral
        )
    }

    /// Decrease or close an existing position.
    ///
    /// - account: trader address
    /// - collateralToken: token used as collateral
    /// - indexToken: token being traded
    /// - collateralDelta: collateral to withdraw (USD)
    /// - sizeDelta: position size to reduce (USD)
    /// - isLong: true for long, false for short
    /// - currentPrice: current mark price
    /// - receiver: address to receive the payout
    ///
    /// Returns the USD amount to send to the receiver (clamped to >= 0).
    access(all) fun decreasePosition(
        account: Address,
        collateralToken: String,
        indexToken: String,
        collateralDelta: UFix64,
        sizeDelta: UFix64,
        isLong: Bool,
        currentPrice: UFix64,
        receiver: Address
    ): UFix64 {
        let key = PositionManager.getPositionKey(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong
        )

        let position = PositionManager.positions[key] ?? panic("Position not found")

        // Calculate PnL for the portion being closed
        // Long:  pnl = (currentPrice - averagePrice) / averagePrice * sizeDelta
        // Short: pnl = (averagePrice - currentPrice) / averagePrice * sizeDelta
        var pnl: UFix64 = 0.0
        var isProfit: Bool = false

        if position.averagePrice > 0.0 {
            if isLong {
                if currentPrice >= position.averagePrice {
                    pnl = (currentPrice - position.averagePrice) / position.averagePrice * sizeDelta
                    isProfit = true
                } else {
                    pnl = (position.averagePrice - currentPrice) / position.averagePrice * sizeDelta
                    isProfit = false
                }
            } else {
                if position.averagePrice >= currentPrice {
                    pnl = (position.averagePrice - currentPrice) / position.averagePrice * sizeDelta
                    isProfit = true
                } else {
                    pnl = (currentPrice - position.averagePrice) / position.averagePrice * sizeDelta
                    isProfit = false
                }
            }
        }

        // Funding fee: simplified to 0.0 (requires Vault integration)
        let fundingFee: UFix64 = 0.0

        // Margin fee: sizeDelta * 10 / 10000
        let marginFee = sizeDelta * 10.0 / 10000.0

        // Update position
        let newSize = position.size - sizeDelta
        let newCollateral = position.collateral - collateralDelta

        if newSize == 0.0 {
            // Close position entirely
            PositionManager.positions.remove(key: key)
        } else {
            PositionManager.positions[key] = Position(
                size: newSize,
                collateral: newCollateral,
                averagePrice: position.averagePrice,
                entryFundingRate: position.entryFundingRate,
                isLong: isLong,
                lastIncreasedTime: position.lastIncreasedTime
            )
        }

        // Update global short tracking
        if !isLong {
            let prevShortSize = PositionManager.globalShortSizes[indexToken] ?? 0.0
            if prevShortSize >= sizeDelta {
                PositionManager.globalShortSizes[indexToken] = prevShortSize - sizeDelta
            } else {
                PositionManager.globalShortSizes[indexToken] = 0.0
            }
        }

        // Calculate amount out: collateralDelta + pnl - marginFee (clamped to >= 0)
        var amountOut: UFix64 = 0.0
        if isProfit {
            let gross = collateralDelta + pnl
            if gross > marginFee + fundingFee {
                amountOut = gross - marginFee - fundingFee
            } else {
                amountOut = 0.0
            }
        } else {
            // Loss: collateralDelta - pnl - marginFee - fundingFee
            let deductions = pnl + marginFee + fundingFee
            if collateralDelta > deductions {
                amountOut = collateralDelta - deductions
            } else {
                amountOut = 0.0
            }
        }

        emit PositionDecreased(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong,
            sizeDelta: sizeDelta,
            collateralDelta: collateralDelta,
            pnl: pnl,
            isProfit: isProfit,
            amountOut: amountOut
        )

        return amountOut
    }

    /// Liquidate an undercollateralized position.
    ///
    /// - account: position owner
    /// - collateralToken: token used as collateral
    /// - indexToken: token being traded
    /// - isLong: true for long, false for short
    /// - currentPrice: current mark price
    /// - feeReceiver: address to receive the liquidation fee
    access(all) fun liquidatePosition(
        account: Address,
        collateralToken: String,
        indexToken: String,
        isLong: Bool,
        currentPrice: UFix64,
        feeReceiver: Address
    ) {
        let key = PositionManager.getPositionKey(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong
        )

        let position = PositionManager.positions[key] ?? panic("Position not found")

        assert(
            PositionManager.isLiquidatable(positionKey: key, currentPrice: currentPrice),
            message: "Position not liquidatable"
        )

        // Liquidation fee: min(LIQUIDATION_FEE_USD, collateral * LIQUIDATION_FEE_RATE)
        let rateFee = position.collateral * PositionManager.LIQUIDATION_FEE_RATE
        let liquidationFee = rateFee < PositionManager.LIQUIDATION_FEE_USD
            ? rateFee
            : PositionManager.LIQUIDATION_FEE_USD

        let posSize = position.size
        let posCollateral = position.collateral

        // Remove position
        PositionManager.positions.remove(key: key)

        // Update global short tracking
        if !isLong {
            let prevShortSize = PositionManager.globalShortSizes[indexToken] ?? 0.0
            if prevShortSize >= posSize {
                PositionManager.globalShortSizes[indexToken] = prevShortSize - posSize
            } else {
                PositionManager.globalShortSizes[indexToken] = 0.0
            }
        }

        emit PositionLiquidated(
            account: account,
            collateralToken: collateralToken,
            indexToken: indexToken,
            isLong: isLong,
            size: posSize,
            collateral: posCollateral,
            liquidationFee: liquidationFee,
            feeReceiver: feeReceiver
        )
    }

    /// Returns true if the position identified by positionKey is eligible for liquidation.
    ///
    /// A position is liquidatable when:
    ///   remainingCollateral = collateral + pnl - liquidationFee
    ///   remainingCollateral < collateral * LIQUIDATION_THRESHOLD_RATE
    access(all) fun isLiquidatable(positionKey: String, currentPrice: UFix64): Bool {
        guard let position = PositionManager.positions[positionKey] else {
            return false
        }

        // Calculate PnL
        var pnl: UFix64 = 0.0
        var isProfit: Bool = false

        if position.averagePrice > 0.0 {
            if position.isLong {
                if currentPrice >= position.averagePrice {
                    pnl = (currentPrice - position.averagePrice) / position.averagePrice * position.size
                    isProfit = true
                } else {
                    pnl = (position.averagePrice - currentPrice) / position.averagePrice * position.size
                    isProfit = false
                }
            } else {
                if position.averagePrice >= currentPrice {
                    pnl = (position.averagePrice - currentPrice) / position.averagePrice * position.size
                    isProfit = true
                } else {
                    pnl = (currentPrice - position.averagePrice) / position.averagePrice * position.size
                    isProfit = false
                }
            }
        }

        // Liquidation fee for threshold check
        let rateFee = position.collateral * PositionManager.LIQUIDATION_FEE_RATE
        let liquidationFee = rateFee < PositionManager.LIQUIDATION_FEE_USD
            ? rateFee
            : PositionManager.LIQUIDATION_FEE_USD

        // Remaining collateral after PnL and liquidation fee
        var remainingCollateral: UFix64 = 0.0
        if isProfit {
            remainingCollateral = position.collateral + pnl
            if remainingCollateral > liquidationFee {
                remainingCollateral = remainingCollateral - liquidationFee
            } else {
                remainingCollateral = 0.0
            }
        } else {
            if position.collateral > pnl + liquidationFee {
                remainingCollateral = position.collateral - pnl - liquidationFee
            } else {
                remainingCollateral = 0.0
            }
        }

        // Liquidatable if remaining collateral < 1% of original collateral
        let threshold = position.collateral * PositionManager.LIQUIDATION_THRESHOLD_RATE
        return remainingCollateral < threshold
    }

    /// Returns the Position for a given key, or nil if not found.
    access(all) view fun getPosition(positionKey: String): Position? {
        return PositionManager.positions[positionKey]
    }

    /// Returns the global short size for an index token.
    access(all) view fun getGlobalShortSize(indexToken: String): UFix64 {
        return PositionManager.globalShortSizes[indexToken] ?? 0.0
    }

    /// Returns the global short average price for an index token.
    access(all) view fun getGlobalShortAveragePrice(indexToken: String): UFix64 {
        return PositionManager.globalShortAveragePrices[indexToken] ?? 0.0
    }

    // -------------------------------------------------------------------------
    // Initializer
    // -------------------------------------------------------------------------

    init() {
        self.MIN_COLLATERAL_USD = 10.0
        self.LIQUIDATION_FEE_USD = 5.0
        self.LIQUIDATION_FEE_RATE = 0.10
        self.LIQUIDATION_THRESHOLD_RATE = 0.01
        self.MAX_LEVERAGE = 50.0

        self.positions = {}
        self.globalShortSizes = {}
        self.globalShortAveragePrices = {}

        self.account.storage.save(<- create Admin(), to: /storage/positionManagerAdmin)
    }
}
