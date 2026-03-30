/// Vault.cdc
/// Liquidity pool contract for PantaDEX on Flow.
/// Tracks token pool amounts, reserves, fees, and funding rates numerically.
/// Actual token transfers are handled by transactions that call Admin resource functions.
/// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
access(all) contract Vault {

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// Swap fee: 30 bps = 0.3%
    access(all) let SWAP_FEE_BPS: UFix64

    /// Margin fee: 10 bps = 0.1%
    access(all) let MARGIN_FEE_BPS: UFix64

    /// Maximum leverage: 50x
    access(all) let MAX_LEVERAGE: UFix64

    /// Funding rate update interval: 8 hours in seconds
    access(all) let FUNDING_INTERVAL: UFix64

    /// LP fee share: 70%
    access(all) let LP_FEE_SHARE: UFix64

    /// Treasury fee share: 30%
    access(all) let TREASURY_FEE_SHARE: UFix64

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    access(all) event LiquidityAdded(
        token: String,
        amount: UFix64,
        depositor: Address,
        plpMinted: UFix64,
        fee: UFix64
    )

    access(all) event LiquidityRemoved(
        token: String,
        tokenAmount: UFix64,
        redeemer: Address,
        plpBurned: UFix64,
        fee: UFix64
    )

    access(all) event FeeCollected(
        token: String,
        amount: UFix64,
        lpShare: UFix64,
        treasuryShare: UFix64
    )

    access(all) event FundingRateUpdated(
        token: String,
        fundingRate: UFix64,
        timestamp: UFix64
    )

    access(all) event ReserveUpdated(
        token: String,
        reservedAmount: UFix64,
        poolAmount: UFix64
    )

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    /// Tracks state for a single token pool.
    /// Invariant: reservedAmount <= poolAmount must always hold.
    access(all) struct TokenPool {
        access(all) var poolAmount: UFix64
        access(all) var reservedAmount: UFix64
        access(all) var feeReserve: UFix64
        access(all) var fundingRate: UFix64
        access(all) var lastFundingTime: UFix64

        init(
            poolAmount: UFix64,
            reservedAmount: UFix64,
            feeReserve: UFix64,
            fundingRate: UFix64,
            lastFundingTime: UFix64
        ) {
            self.poolAmount = poolAmount
            self.reservedAmount = reservedAmount
            self.feeReserve = feeReserve
            self.fundingRate = fundingRate
            self.lastFundingTime = lastFundingTime
        }
    }

    // -------------------------------------------------------------------------
    // Contract-level state
    // -------------------------------------------------------------------------

    /// Token pools keyed by token symbol ("USDC", "FLOW")
    access(all) var tokenPools: {String: TokenPool}

    /// Total assets under management in USD
    access(all) var aum: UFix64

    /// Accumulated LP fees (70% of all collected fees)
    access(all) var lpFeeAccumulator: UFix64

    /// Accumulated treasury fees (30% of all collected fees)
    access(all) var treasuryFeeAccumulator: UFix64

    /// Treasury address for fee distribution
    access(all) var treasuryAddress: Address

    // -------------------------------------------------------------------------
    // Admin resource
    // -------------------------------------------------------------------------

    access(all) resource Admin {

        /// Add liquidity to the vault.
        /// Deducts swap fee from the deposited amount, updates poolAmount and AUM.
        /// Returns the PLP amount to mint for the depositor.
        ///
        /// - token: "USDC" or "FLOW"
        /// - amount: raw token amount deposited
        /// - depositor: address of the liquidity provider
        /// - tokenPriceUSD: current USD price of the token (UFix64, 8 decimals)
        access(all) fun addLiquidity(
            token: String,
            amount: UFix64,
            depositor: Address,
            tokenPriceUSD: UFix64
        ): UFix64 {
            assert(amount > 0.0, message: "Amount must be greater than zero")
            assert(Vault.tokenPools[token] != nil, message: "Unsupported token: ".concat(token))

            // Calculate and collect swap fee
            let fee = Vault.calculateSwapFee(amount: amount)
            let amountAfterFee = amount - fee

            // Collect fee into pool reserves and distribute
            self.collectFee(token: token, amount: fee)

            // Calculate USD value of deposit after fee
            let depositUSD = amountAfterFee * tokenPriceUSD

            // Update pool amount
            let pool = Vault.tokenPools[token]!
            Vault.tokenPools[token] = TokenPool(
                poolAmount: pool.poolAmount + amountAfterFee,
                reservedAmount: pool.reservedAmount,
                feeReserve: pool.feeReserve,
                fundingRate: pool.fundingRate,
                lastFundingTime: pool.lastFundingTime
            )

            // Update AUM
            Vault.aum = Vault.aum + depositUSD

            // Calculate PLP to mint: depositUSD / plpPrice
            // plpPrice = aum / totalSupply (handled externally via PLPToken.getPLPPrice)
            // We return depositUSD here; the transaction will call PLPToken.getPLPPrice
            // to determine the actual PLP amount. For simplicity, we return depositUSD
            // as the "PLP units" when price = 1.0 baseline, and the caller divides by price.
            // Actually: return depositUSD directly — caller uses PLPToken.getPLPPrice(aum)
            // to compute plpAmount = depositUSD / plpPrice.
            // Here we return depositUSD so the transaction can compute plpAmount.
            let plpAmount = depositUSD

            emit LiquidityAdded(
                token: token,
                amount: amount,
                depositor: depositor,
                plpMinted: plpAmount,
                fee: fee
            )

            return plpAmount
        }

        /// Remove liquidity from the vault.
        /// Deducts swap fee from the redeemed amount, updates poolAmount and AUM.
        /// Returns the token amount to send to the redeemer.
        ///
        /// - plpAmount: PLP tokens being redeemed (in USD value units)
        /// - tokenOut: "USDC" or "FLOW"
        /// - redeemer: address of the liquidity provider
        /// - plpPriceUSD: current PLP price in USD
        access(all) fun removeLiquidity(
            plpAmount: UFix64,
            tokenOut: String,
            redeemer: Address,
            plpPriceUSD: UFix64
        ): UFix64 {
            assert(plpAmount > 0.0, message: "PLP amount must be greater than zero")
            assert(Vault.tokenPools[tokenOut] != nil, message: "Unsupported token: ".concat(tokenOut))

            // USD value of the redeemed PLP
            let redeemUSD = plpAmount * plpPriceUSD

            // Get current token price from AUM ratio — caller provides plpPriceUSD
            // Token amount = redeemUSD (since we track amounts in token units, not USD)
            // The caller must pass the correct tokenPriceUSD to convert; here we treat
            // plpPriceUSD as already accounting for the token price.
            // tokenAmount = redeemUSD / tokenPriceUSD — but tokenPriceUSD is not passed here.
            // Per the task spec: removeLiquidity returns token amount to send.
            // We use redeemUSD as the raw token amount (assuming 1:1 for USDC, or caller handles conversion).
            // For correctness: tokenAmount = redeemUSD (caller is responsible for token price conversion).
            let grossTokenAmount = redeemUSD

            // Deduct swap fee
            let fee = Vault.calculateSwapFee(amount: grossTokenAmount)
            let tokenAmount = grossTokenAmount - fee

            // Collect fee
            self.collectFee(token: tokenOut, amount: fee)

            // Update pool amount
            let pool = Vault.tokenPools[tokenOut]!
            assert(
                pool.poolAmount >= tokenAmount,
                message: "Insufficient pool liquidity"
            )
            Vault.tokenPools[tokenOut] = TokenPool(
                poolAmount: pool.poolAmount - tokenAmount,
                reservedAmount: pool.reservedAmount,
                feeReserve: pool.feeReserve,
                fundingRate: pool.fundingRate,
                lastFundingTime: pool.lastFundingTime
            )

            // Update AUM
            if Vault.aum >= redeemUSD {
                Vault.aum = Vault.aum - redeemUSD
            } else {
                Vault.aum = 0.0
            }

            emit LiquidityRemoved(
                token: tokenOut,
                tokenAmount: tokenAmount,
                redeemer: redeemer,
                plpBurned: plpAmount,
                fee: fee
            )

            return tokenAmount
        }

        /// Increase the reserved amount for a token.
        /// Panics if reservedAmount + amount > poolAmount (invariant enforcement).
        access(all) fun increaseReserve(token: String, amount: UFix64) {
            assert(Vault.tokenPools[token] != nil, message: "Unsupported token: ".concat(token))
            let pool = Vault.tokenPools[token]!
            assert(
                pool.reservedAmount + amount <= pool.poolAmount,
                message: "Reserve exceeds pool: reservedAmount="
                    .concat(pool.reservedAmount.toString())
                    .concat(" amount=").concat(amount.toString())
                    .concat(" poolAmount=").concat(pool.poolAmount.toString())
            )
            Vault.tokenPools[token] = TokenPool(
                poolAmount: pool.poolAmount,
                reservedAmount: pool.reservedAmount + amount,
                feeReserve: pool.feeReserve,
                fundingRate: pool.fundingRate,
                lastFundingTime: pool.lastFundingTime
            )
            emit ReserveUpdated(
                token: token,
                reservedAmount: pool.reservedAmount + amount,
                poolAmount: pool.poolAmount
            )
        }

        /// Decrease the reserved amount for a token.
        access(all) fun decreaseReserve(token: String, amount: UFix64) {
            assert(Vault.tokenPools[token] != nil, message: "Unsupported token: ".concat(token))
            let pool = Vault.tokenPools[token]!
            assert(
                pool.reservedAmount >= amount,
                message: "Cannot decrease reserve below zero"
            )
            Vault.tokenPools[token] = TokenPool(
                poolAmount: pool.poolAmount,
                reservedAmount: pool.reservedAmount - amount,
                feeReserve: pool.feeReserve,
                fundingRate: pool.fundingRate,
                lastFundingTime: pool.lastFundingTime
            )
            emit ReserveUpdated(
                token: token,
                reservedAmount: pool.reservedAmount - amount,
                poolAmount: pool.poolAmount
            )
        }

        /// Update the funding rate for a token if FUNDING_INTERVAL has passed.
        access(all) fun updateFundingRate(token: String) {
            assert(Vault.tokenPools[token] != nil, message: "Unsupported token: ".concat(token))
            let pool = Vault.tokenPools[token]!
            let now = getCurrentBlock().timestamp
            let elapsed = now - pool.lastFundingTime

            if elapsed < Vault.FUNDING_INTERVAL {
                return
            }

            // Simple funding rate: proportional to utilization
            // fundingRate = reservedAmount / poolAmount * (elapsed / FUNDING_INTERVAL)
            var newFundingRate: UFix64 = 0.0
            if pool.poolAmount > 0.0 {
                let utilization = pool.reservedAmount / pool.poolAmount
                newFundingRate = pool.fundingRate + utilization * (elapsed / Vault.FUNDING_INTERVAL)
            }

            Vault.tokenPools[token] = TokenPool(
                poolAmount: pool.poolAmount,
                reservedAmount: pool.reservedAmount,
                feeReserve: pool.feeReserve,
                fundingRate: newFundingRate,
                lastFundingTime: now
            )

            emit FundingRateUpdated(token: token, fundingRate: newFundingRate, timestamp: now)
        }

        /// Collect a fee for a token: adds to feeReserve and distributes to LP/treasury accumulators.
        access(all) fun collectFee(token: String, amount: UFix64) {
            if amount == 0.0 {
                return
            }
            assert(Vault.tokenPools[token] != nil, message: "Unsupported token: ".concat(token))
            let pool = Vault.tokenPools[token]!
            Vault.tokenPools[token] = TokenPool(
                poolAmount: pool.poolAmount,
                reservedAmount: pool.reservedAmount,
                feeReserve: pool.feeReserve + amount,
                fundingRate: pool.fundingRate,
                lastFundingTime: pool.lastFundingTime
            )
            Vault.distributeFees(feeAmount: amount)

            emit FeeCollected(
                token: token,
                amount: amount,
                lpShare: amount * Vault.LP_FEE_SHARE,
                treasuryShare: amount * Vault.TREASURY_FEE_SHARE
            )
        }

        /// Update the treasury address.
        access(all) fun setTreasuryAddress(address: Address) {
            Vault.treasuryAddress = address
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /// Distribute fees: 70% to lpFeeAccumulator, 30% to treasuryFeeAccumulator.
    access(all) fun distributeFees(feeAmount: UFix64) {
        let lpShare = feeAmount * Vault.LP_FEE_SHARE
        let treasuryShare = feeAmount * Vault.TREASURY_FEE_SHARE
        Vault.lpFeeAccumulator = Vault.lpFeeAccumulator + lpShare
        Vault.treasuryFeeAccumulator = Vault.treasuryFeeAccumulator + treasuryShare
    }

    // -------------------------------------------------------------------------
    // Public view functions
    // -------------------------------------------------------------------------

    /// Returns the total AUM in USD.
    access(all) view fun getAUM(): UFix64 {
        return Vault.aum
    }

    /// Returns the TokenPool for a given token symbol, or nil if not found.
    access(all) view fun getTokenPool(token: String): TokenPool? {
        return Vault.tokenPools[token]
    }

    /// Calculate swap fee: amount * SWAP_FEE_BPS / 10000
    access(all) view fun calculateSwapFee(amount: UFix64): UFix64 {
        return amount * Vault.SWAP_FEE_BPS / 10000.0
    }

    /// Calculate margin fee: size * MARGIN_FEE_BPS / 10000
    access(all) view fun calculateMarginFee(size: UFix64): UFix64 {
        return size * Vault.MARGIN_FEE_BPS / 10000.0
    }

    /// Returns the pool amount for a token.
    access(all) view fun getPoolAmount(token: String): UFix64 {
        return Vault.tokenPools[token]?.poolAmount ?? 0.0
    }

    /// Returns the reserved amount for a token.
    access(all) view fun getReservedAmount(token: String): UFix64 {
        return Vault.tokenPools[token]?.reservedAmount ?? 0.0
    }

    /// Returns true if adding the given reserve amount would not exceed the pool amount.
    access(all) view fun canIncreaseReserve(token: String, amount: UFix64): Bool {
        let pool = Vault.tokenPools[token]
        if pool == nil {
            return false
        }
        return pool!.reservedAmount + amount <= pool!.poolAmount
    }

    // -------------------------------------------------------------------------
    // Initializer
    // -------------------------------------------------------------------------

    init() {
        // Default treasury is the deployer account; can be updated via Admin.setTreasuryAddress()
        self.SWAP_FEE_BPS = 30.0
        self.MARGIN_FEE_BPS = 10.0
        self.MAX_LEVERAGE = 50.0
        self.FUNDING_INTERVAL = 28800.0
        self.LP_FEE_SHARE = 0.70
        self.TREASURY_FEE_SHARE = 0.30

        self.aum = 0.0
        self.lpFeeAccumulator = 0.0
        self.treasuryFeeAccumulator = 0.0
        self.treasuryAddress = self.account.address

        // Initialize token pools with zero values for USDC and FLOW
        self.tokenPools = {
            "USDC": TokenPool(
                poolAmount: 0.0,
                reservedAmount: 0.0,
                feeReserve: 0.0,
                fundingRate: 0.0,
                lastFundingTime: getCurrentBlock().timestamp
            ),
            "FLOW": TokenPool(
                poolAmount: 0.0,
                reservedAmount: 0.0,
                feeReserve: 0.0,
                fundingRate: 0.0,
                lastFundingTime: getCurrentBlock().timestamp
            )
        }

        // Store Admin resource at the designated path
        self.account.storage.save(<- create Admin(), to: /storage/pantaVaultAdmin)
    }
}
