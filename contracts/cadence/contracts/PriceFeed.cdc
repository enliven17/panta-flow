/// PriceFeed.cdc
/// Oracle price feed contract for PantaDEX on Flow.
/// Uses a cache pattern: an off-chain keeper (or Admin) updates prices,
/// and getPrice reads from cache with a staleness check.
/// Primary oracle: IncrementFi (0x8232ce4a3aff4e94)
/// Fallback oracle: Band Oracle (0x9fb6606c300b5051)
access(all) contract PriceFeed {

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// 30 minutes in seconds — prices older than this are considered stale
    access(all) let STALE_PRICE_THRESHOLD: UFix64

    /// 0.2% spread applied symmetrically around the mid price
    access(all) let SPREAD_BPS: UFix64

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    access(all) event PriceUpdated(symbol: String, price: UFix64, timestamp: UFix64)
    access(all) event PriceStale(symbol: String)
    access(all) event OracleUpdated(oracleType: String, address: Address)

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    /// Holds the min/max spread-adjusted price and the timestamp it was recorded
    access(all) struct PriceData {
        access(all) let minPrice: UFix64
        access(all) let maxPrice: UFix64
        access(all) let timestamp: UFix64

        init(minPrice: UFix64, maxPrice: UFix64, timestamp: UFix64) {
            self.minPrice = minPrice
            self.maxPrice = maxPrice
            self.timestamp = timestamp
        }
    }

    /// Return type for calculateSpread (Cadence has no tuple types)
    access(all) struct SpreadResult {
        access(all) let minPrice: UFix64
        access(all) let maxPrice: UFix64

        init(minPrice: UFix64, maxPrice: UFix64) {
            self.minPrice = minPrice
            self.maxPrice = maxPrice
        }
    }

    // -------------------------------------------------------------------------
    // Contract-level state
    // -------------------------------------------------------------------------

    /// Cached prices keyed by symbol (e.g. "FLOW/USD", "USDC/USD")
    access(all) var cachedPrices: {String: PriceData}

    /// IncrementFi oracle address on Flow Testnet
    access(all) var primaryOracleAddress: Address

    /// Band Oracle address on Flow Testnet
    access(all) var fallbackOracleAddress: Address

    // -------------------------------------------------------------------------
    // Admin resource
    // -------------------------------------------------------------------------

    access(all) resource Admin {

        /// Manually update a cached price (used by keeper / fallback)
        access(all) fun updatePrice(symbol: String, price: UFix64) {
            assert(price > 0.0, message: "Price must be greater than zero")
            let spread = PriceFeed.calculateSpread(midPrice: price)
            let ts = getCurrentBlock().timestamp
            PriceFeed.cachedPrices[symbol] = PriceData(
                minPrice: spread.minPrice,
                maxPrice: spread.maxPrice,
                timestamp: ts
            )
            emit PriceUpdated(symbol: symbol, price: price, timestamp: ts)
        }

        /// Update the primary oracle address
        access(all) fun setPrimaryOracle(address: Address) {
            PriceFeed.primaryOracleAddress = address
            emit OracleUpdated(oracleType: "primary", address: address)
        }

        /// Update the fallback oracle address
        access(all) fun setFallbackOracle(address: Address) {
            PriceFeed.fallbackOracleAddress = address
            emit OracleUpdated(oracleType: "fallback", address: address)
        }
    }

    // -------------------------------------------------------------------------
    // Public functions
    // -------------------------------------------------------------------------

    /// Returns the cached PriceData for a symbol.
    /// Panics with "Stale price" if the cached price is older than STALE_PRICE_THRESHOLD.
    /// Panics with "Price not available" if no cache entry exists.
    access(all) fun getPrice(symbol: String): PriceData {
        if let data = self.cachedPrices[symbol] {
            let age = getCurrentBlock().timestamp - data.timestamp
            if age >= self.STALE_PRICE_THRESHOLD {
                emit PriceStale(symbol: symbol)
                panic("Stale price")
            }
            return data
        }
        panic("Price not available")
    }

    /// Attempts to return a fresh price from the primary oracle cache.
    /// Returns nil if no entry exists or the price is stale.
    /// In the cache-pattern design the primary oracle keeper writes to cachedPrices;
    /// this function simply validates freshness and returns the cached value.
    access(all) fun getPrimaryPrice(symbol: String): PriceData? {
        if let data = self.cachedPrices[symbol] {
            let age = getCurrentBlock().timestamp - data.timestamp
            if age < self.STALE_PRICE_THRESHOLD {
                return data
            }
        }
        return nil
    }

    /// Fallback oracle price lookup.
    /// In the cache-pattern design the fallback oracle keeper also writes to cachedPrices
    /// under a namespaced key (e.g. "fallback:FLOW/USD").
    /// Returns nil if no fresh fallback entry exists.
    access(all) fun getFallbackPrice(symbol: String): PriceData? {
        let fallbackKey = "fallback:".concat(symbol)
        if let data = self.cachedPrices[fallbackKey] {
            let age = getCurrentBlock().timestamp - data.timestamp
            if age < self.STALE_PRICE_THRESHOLD {
                return data
            }
        }
        return nil
    }

    /// Tries primary oracle first, then fallback.
    /// Updates the main cache entry on success.
    /// Panics with "Price unavailable from all oracles" if both fail.
    access(all) fun updatePriceFromOracle(symbol: String) {
        // Try primary
        if let primary = self.getPrimaryPrice(symbol: symbol) {
            self.cachedPrices[symbol] = primary
            emit PriceUpdated(symbol: symbol, price: primary.minPrice, timestamp: primary.timestamp)
            return
        }
        // Try fallback
        if let fallback = self.getFallbackPrice(symbol: symbol) {
            self.cachedPrices[symbol] = fallback
            emit PriceUpdated(symbol: symbol, price: fallback.minPrice, timestamp: fallback.timestamp)
            return
        }
        panic("Price unavailable from all oracles")
    }

    /// Returns true if the cached price for the symbol is older than STALE_PRICE_THRESHOLD,
    /// or if no cache entry exists.
    access(all) fun isPriceStale(symbol: String): Bool {
        if let data = self.cachedPrices[symbol] {
            let age = getCurrentBlock().timestamp - data.timestamp
            return age >= self.STALE_PRICE_THRESHOLD
        }
        return true
    }

    /// Calculates SpreadResult by applying SPREAD_BPS symmetrically around midPrice.
    /// spread = midPrice * SPREAD_BPS / 10000
    /// minPrice = midPrice - spread
    /// maxPrice = midPrice + spread
    access(all) fun calculateSpread(midPrice: UFix64): SpreadResult {
        let spread = midPrice * self.SPREAD_BPS / 10000.0
        let minP = midPrice - spread
        let maxP = midPrice + spread
        return SpreadResult(minPrice: minP, maxPrice: maxP)
    }

    // -------------------------------------------------------------------------
    // Initializer
    // -------------------------------------------------------------------------

    init() {
        self.STALE_PRICE_THRESHOLD = 1800.0
        self.SPREAD_BPS = 20.0
        self.cachedPrices = {}
        self.primaryOracleAddress = 0x8232ce4a3aff4e94
        self.fallbackOracleAddress = 0x9fb6606c300b5051

        // Store Admin resource in contract deployer's storage
        self.account.storage.save(<- create Admin(), to: /storage/priceFeedAdmin)
    }
}
