import FungibleToken from 0x9a0766d93b6608b7

/// PLPToken — PANTA Liquidity Provider token for PantaDEX on Flow Testnet
/// Implements the FungibleToken standard interface.
/// Transfers are restricted to whitelisted contracts (Vault, StakedPLP).
/// A 15-minute cooldown applies between mint and redeem (burn) per user.
access(all) contract PLPToken: FungibleToken {

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// Total number of PLP tokens currently in existence
    access(all) var totalSupply: UFix64

    /// Tracks the last mint timestamp per address for cooldown enforcement
    access(all) var lastMintTime: {Address: UFix64}

    /// Whitelist of addresses allowed to perform PLP transfers (Vault, StakedPLP)
    access(all) var transferWhitelist: {Address: Bool}

    /// Cooldown duration: 15 minutes in seconds
    access(all) let COOLDOWN_DURATION: UFix64

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event TokensMinted(amount: UFix64, recipient: Address)
    access(all) event TokensBurned(amount: UFix64)
    access(all) event TokensWithdrawn(amount: UFix64, from: Address?)
    access(all) event TokensDeposited(amount: UFix64, to: Address?)
    access(all) event Transfer(amount: UFix64, from: Address?, to: Address?)
    access(all) event WhitelistUpdated(address: Address, added: Bool)

    // -----------------------------------------------------------------------
    // Storage paths
    // -----------------------------------------------------------------------

    access(all) let VaultStoragePath: StoragePath
    access(all) let VaultPublicPath: PublicPath
    access(all) let AdminStoragePath: StoragePath
    access(all) let MinterStoragePath: StoragePath

    // -----------------------------------------------------------------------
    // Vault resource
    // -----------------------------------------------------------------------

    /// Each account holds its PLP balance in a Vault resource.
    /// Deposits are restricted: only whitelisted callers may deposit (transfer).
    access(all) resource Vault: FungibleToken.Vault {

        access(all) var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        /// Withdraw the given amount from this vault.
        access(FungibleToken.Withdraw) fun withdraw(amount: UFix64): @{FungibleToken.Vault} {
            pre {
                self.balance >= amount: "Insufficient PLP balance: available="
                    .concat(self.balance.toString())
                    .concat(" requested=")
                    .concat(amount.toString())
            }
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <- create Vault(balance: amount)
        }

        /// Deposit tokens into this vault.
        /// Only whitelisted addresses (Vault contract, StakedPLP) may deposit.
        /// This enforces the PLP transfer restriction.
        access(all) fun deposit(from: @{FungibleToken.Vault}) {
            let vault <- from as! @PLPToken.Vault
            let amount = vault.balance

            // Transfer whitelist check: the depositing owner must be whitelisted
            // or this is an internal mint/burn operation (owner is nil)
            let caller = vault.owner?.address
            if caller != nil {
                let isWhitelisted = PLPToken.transferWhitelist[caller!] ?? false
                if !isWhitelisted {
                    // Destroy the vault before panicking to avoid resource loss
                    vault.balance = 0.0
                    destroy vault
                    panic("PLP transfer not allowed")
                }
            }

            vault.balance = 0.0
            self.balance = self.balance + amount
            emit TokensDeposited(amount: amount, to: self.owner?.address)
            destroy vault
        }

        /// Create an empty vault of the same type.
        access(all) fun createEmptyVault(): @{FungibleToken.Vault} {
            return <- create Vault(balance: 0.0)
        }

        access(all) view fun getSupportedVaultTypes(): {Type: Bool} {
            return {self.getType(): true}
        }

        access(all) view fun isSupportedVaultType(type: Type): Bool {
            return type == self.getType()
        }

        access(all) view fun getBalance(): UFix64 {
            return self.balance
        }
    }

    // -----------------------------------------------------------------------
    // Minter resource
    // -----------------------------------------------------------------------

    /// Minter resource — only Admin can create one.
    /// Handles PLP minting (records cooldown) and burning.
    access(all) resource Minter {

        /// Mint PLP tokens for a recipient.
        /// Records the current block timestamp for cooldown tracking.
        access(all) fun mintPLP(amount: UFix64, recipient: Address): @Vault {
            pre {
                amount > 0.0: "Mint amount must be greater than zero"
            }
            PLPToken.totalSupply = PLPToken.totalSupply + amount
            PLPToken.lastMintTime[recipient] = getCurrentBlock().timestamp
            emit TokensMinted(amount: amount, recipient: recipient)
            return <- create Vault(balance: amount)
        }

        /// Burn PLP tokens, reducing total supply.
        /// The cooldown check (canRedeem) should be enforced by the caller (Vault contract)
        /// before calling burnPLP.
        access(all) fun burnPLP(vault: @Vault) {
            let amount = vault.balance
            PLPToken.totalSupply = PLPToken.totalSupply - amount
            vault.balance = 0.0
            emit TokensBurned(amount: amount)
            destroy vault
        }
    }

    // -----------------------------------------------------------------------
    // Admin resource
    // -----------------------------------------------------------------------

    /// Admin resource — stored in deployer's storage at contract init.
    access(all) resource Admin {

        /// Create a new Minter resource.
        access(all) fun createMinter(): @Minter {
            return <- create Minter()
        }

        /// Add an address to the transfer whitelist.
        access(all) fun addToWhitelist(address: Address) {
            PLPToken.transferWhitelist[address] = true
            emit WhitelistUpdated(address: address, added: true)
        }

        /// Remove an address from the transfer whitelist.
        access(all) fun removeFromWhitelist(address: Address) {
            PLPToken.transferWhitelist.remove(key: address)
            emit WhitelistUpdated(address: address, added: false)
        }
    }

    // -----------------------------------------------------------------------
    // Public contract functions
    // -----------------------------------------------------------------------

    /// Calculate the PLP price given the current AUM.
    /// Returns AUM / totalSupply if supply > 0, otherwise 1.0 (first mint).
    access(all) view fun getPLPPrice(aum: UFix64): UFix64 {
        if PLPToken.totalSupply > 0.0 {
            return aum / PLPToken.totalSupply
        }
        return 1.0
    }

    /// Returns true if the account's cooldown has expired (900 seconds since last mint).
    access(all) view fun canRedeem(account: Address): Bool {
        let lastMint = PLPToken.lastMintTime[account]
        if lastMint == nil {
            return true
        }
        let elapsed = getCurrentBlock().timestamp - lastMint!
        return elapsed >= PLPToken.COOLDOWN_DURATION
    }

    /// Returns the remaining cooldown seconds for an account.
    /// Returns 0.0 if the cooldown has already expired or the account has never minted.
    access(all) view fun getRemainingCooldown(account: Address): UFix64 {
        let lastMint = PLPToken.lastMintTime[account]
        if lastMint == nil {
            return 0.0
        }
        let elapsed = getCurrentBlock().timestamp - lastMint!
        if elapsed >= PLPToken.COOLDOWN_DURATION {
            return 0.0
        }
        return PLPToken.COOLDOWN_DURATION - elapsed
    }

    /// Create an empty PLP Vault.
    /// Required by the FungibleToken standard.
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault} {
        return <- create Vault(balance: 0.0)
    }

    // -----------------------------------------------------------------------
    // Contract initializer
    // -----------------------------------------------------------------------

    init() {
        self.totalSupply = 0.0
        self.lastMintTime = {}
        self.transferWhitelist = {}
        self.COOLDOWN_DURATION = 900.0

        self.VaultStoragePath  = /storage/plpTokenVault
        self.VaultPublicPath   = /public/plpTokenVault
        self.AdminStoragePath  = /storage/plpTokenAdmin
        self.MinterStoragePath = /storage/plpTokenMinter

        // Store Admin resource in deployer's storage
        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
