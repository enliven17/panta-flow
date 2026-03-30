/// MockUSDCFaucet — Rate-limited test USDC faucet for Flow Testnet
/// Enforces 24-hour cooldown per address and tracks reserve balance.
/// Actual MockUSDC minting is handled by the calling transaction via MockUSDC.Minter.
access(all) contract MockUSDCFaucet {

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// Maximum tokens distributed per claim (1000 USDC)
    access(all) let DAILY_LIMIT: UFix64

    /// Cooldown period in seconds (24 hours)
    access(all) let COOLDOWN: UFix64

    /// Reserve threshold below which a LowReserveWarning event is emitted
    access(all) let LOW_RESERVE_THRESHOLD: UFix64

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// Tracks the last claim timestamp per address
    access(all) var lastClaimTime: {Address: UFix64}

    /// Current faucet reserve balance (tracked numerically)
    access(all) var reserveBalance: UFix64

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event TokensClaimed(recipient: Address, amount: UFix64)
    access(all) event LowReserveWarning(currentBalance: UFix64)
    access(all) event ReserveFilled(amount: UFix64)

    // -----------------------------------------------------------------------
    // Storage paths
    // -----------------------------------------------------------------------

    access(all) let AdminStoragePath: StoragePath

    // -----------------------------------------------------------------------
    // Admin resource
    // -----------------------------------------------------------------------

    /// Admin resource — stored at /storage/mockUSDCFaucetAdmin at init.
    /// Controls reserve management.
    access(all) resource Admin {

        /// Increase the faucet reserve balance (called after minting tokens into faucet)
        access(all) fun refillReserve(amount: UFix64) {
            pre {
                amount > 0.0: "Refill amount must be greater than zero"
            }
            MockUSDCFaucet.reserveBalance = MockUSDCFaucet.reserveBalance + amount
            emit ReserveFilled(amount: amount)
        }

        /// Decrease the faucet reserve balance (for admin withdrawal)
        access(all) fun withdrawReserve(amount: UFix64) {
            pre {
                amount > 0.0: "Withdraw amount must be greater than zero"
                MockUSDCFaucet.reserveBalance >= amount: "Insufficient reserve balance"
            }
            MockUSDCFaucet.reserveBalance = MockUSDCFaucet.reserveBalance - amount
        }
    }

    // -----------------------------------------------------------------------
    // Public functions
    // -----------------------------------------------------------------------

    /// Claim tokens from the faucet.
    /// Checks cooldown and reserve, deducts DAILY_LIMIT from reserveBalance,
    /// updates lastClaimTime, emits events, and returns DAILY_LIMIT.
    /// The calling transaction is responsible for minting and transferring the tokens.
    access(all) fun claimTokens(recipient: Address): UFix64 {
        let currentTime = getCurrentBlock().timestamp

        // Check cooldown
        if let lastClaim = self.lastClaimTime[recipient] {
            let elapsed = currentTime - lastClaim
            if elapsed < self.COOLDOWN {
                let remaining = self.COOLDOWN - elapsed
                panic("Cooldown not expired: ".concat(remaining.toString()).concat(" seconds remaining"))
            }
        }

        // Check reserve
        if self.reserveBalance < self.DAILY_LIMIT {
            panic("Insufficient faucet reserve")
        }

        // Deduct from reserve and update claim time
        self.reserveBalance = self.reserveBalance - self.DAILY_LIMIT
        self.lastClaimTime[recipient] = currentTime

        emit TokensClaimed(recipient: recipient, amount: self.DAILY_LIMIT)

        // Warn if reserve is running low
        if self.reserveBalance < self.LOW_RESERVE_THRESHOLD {
            emit LowReserveWarning(currentBalance: self.reserveBalance)
        }

        return self.DAILY_LIMIT
    }

    /// Returns the current faucet reserve balance.
    access(all) fun getReserveBalance(): UFix64 {
        return self.reserveBalance
    }

    /// Returns the remaining cooldown seconds for the given account.
    /// Returns 0.0 if the cooldown has expired or the account has never claimed.
    access(all) fun getRemainingCooldown(account: Address): UFix64 {
        let currentTime = getCurrentBlock().timestamp
        if let lastClaim = self.lastClaimTime[account] {
            let elapsed = currentTime - lastClaim
            if elapsed < self.COOLDOWN {
                return self.COOLDOWN - elapsed
            }
        }
        return 0.0
    }

    /// Returns true if the account can claim (cooldown expired or never claimed).
    access(all) fun canClaim(account: Address): Bool {
        return self.getRemainingCooldown(account: account) == 0.0
    }

    // -----------------------------------------------------------------------
    // Contract initializer
    // -----------------------------------------------------------------------

    init() {
        self.DAILY_LIMIT = 1000.0
        self.COOLDOWN = 86400.0
        self.LOW_RESERVE_THRESHOLD = 10000.0

        self.lastClaimTime = {}
        self.reserveBalance = 0.0

        self.AdminStoragePath = /storage/mockUSDCFaucetAdmin

        // Store Admin resource in deployer's storage
        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
