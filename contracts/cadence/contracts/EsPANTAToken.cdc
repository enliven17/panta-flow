import FungibleToken from 0x9a0766d93b6608b7

/// EsPANTAToken — Escrowed PANTA token for PantaDEX on Flow Testnet
/// Implements the FungibleToken standard interface.
/// Transfers are restricted to whitelisted contracts (RewardTracker, Vester).
/// Supports 365-day linear vesting: esPANTA is burned and PANTA amount is returned.
access(all) contract EsPANTAToken: FungibleToken {

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// 365 days in seconds: 365 * 24 * 3600
    access(all) let VESTING_DURATION: UFix64

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// Total number of esPANTA tokens currently in existence
    access(all) var totalSupply: UFix64

    /// Whitelist of addresses allowed to transfer esPANTA (RewardTracker, Vester)
    access(all) var transferWhitelist: {Address: Bool}

    /// Vesting records per account
    access(all) var vestingRecords: {Address: VestingRecord}

    // -----------------------------------------------------------------------
    // Structs
    // -----------------------------------------------------------------------

    access(all) struct VestingRecord {
        access(all) let startTime: UFix64
        access(all) let totalAmount: UFix64
        access(all) var vestedAmount: UFix64

        init(startTime: UFix64, totalAmount: UFix64, vestedAmount: UFix64) {
            self.startTime = startTime
            self.totalAmount = totalAmount
            self.vestedAmount = vestedAmount
        }
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event TokensMinted(amount: UFix64)
    access(all) event TokensBurned(amount: UFix64)
    access(all) event TokensWithdrawn(amount: UFix64, from: Address?)
    access(all) event TokensDeposited(amount: UFix64, to: Address?)
    access(all) event WhitelistUpdated(address: Address, allowed: Bool)
    access(all) event VestingStarted(account: Address, amount: UFix64, startTime: UFix64)
    access(all) event VestingClaimed(account: Address, vestedAmount: UFix64, pantaAmount: UFix64)
    access(all) event VestingCancelled(account: Address, returnedAmount: UFix64)

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

    /// Each account holds its esPANTA balance in a Vault resource.
    access(all) resource Vault: FungibleToken.Vault {

        access(all) var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        /// Withdraw the given amount from this vault.
        access(FungibleToken.Withdraw) fun withdraw(amount: UFix64): @{FungibleToken.Vault} {
            pre {
                self.balance >= amount: "Insufficient balance: available="
                    .concat(self.balance.toString())
                    .concat(" requested=")
                    .concat(amount.toString())
            }
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <- create Vault(balance: amount)
        }

        /// Deposit tokens — enforces transfer whitelist.
        /// nil owner bypasses the check for internal operations (e.g. minting into a new vault).
        access(all) fun deposit(from: @{FungibleToken.Vault}) {
            let vault <- from as! @EsPANTAToken.Vault
            let amount = vault.balance

            // Whitelist check: if the depositing vault has an owner, that owner must be whitelisted.
            // nil owner means the vault is freshly created (mint path) — allowed.
            if let senderAddress = vault.owner?.address {
                let allowed = EsPANTAToken.transferWhitelist[senderAddress] ?? false
                assert(allowed, message: "esPANTA transfer not allowed")
            }

            self.balance = self.balance + amount
            emit TokensDeposited(amount: amount, to: self.owner?.address)
            destroy vault
        }

        /// Returns whether this vault has at least the given amount available.
        access(all) view fun isAvailableToWithdraw(amount: UFix64): Bool {
            return self.balance >= amount
        }

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

        access(all) view fun getViews(): [Type] { return [] }
        access(all) fun resolveView(_ view: Type): AnyStruct? { return nil }
    }

    // -----------------------------------------------------------------------
    // Minter resource
    // -----------------------------------------------------------------------

    /// Minter resource — only Admin can create one.
    access(all) resource Minter {

        access(all) fun mintTokens(amount: UFix64): @Vault {
            pre {
                amount > 0.0: "Mint amount must be greater than zero"
            }
            EsPANTAToken.totalSupply = EsPANTAToken.totalSupply + amount
            emit TokensMinted(amount: amount)
            return <- create Vault(balance: amount)
        }

        access(all) fun burnTokens(vault: @Vault) {
            let amount = vault.balance
            EsPANTAToken.totalSupply = EsPANTAToken.totalSupply - amount
            emit TokensBurned(amount: amount)
            destroy vault
        }
    }

    // -----------------------------------------------------------------------
    // Admin resource
    // -----------------------------------------------------------------------

    access(all) resource Admin {

        access(all) fun createMinter(): @Minter {
            return <- create Minter()
        }

        access(all) fun addToWhitelist(address: Address) {
            EsPANTAToken.transferWhitelist[address] = true
            emit WhitelistUpdated(address: address, allowed: true)
        }

        access(all) fun removeFromWhitelist(address: Address) {
            EsPANTAToken.transferWhitelist.remove(key: address)
            emit WhitelistUpdated(address: address, allowed: false)
        }
    }

    // -----------------------------------------------------------------------
    // Public vesting functions
    // -----------------------------------------------------------------------

    /// Start a 365-day linear vesting schedule for the given account.
    /// Panics if a vesting record already exists for the account.
    access(all) fun startVesting(account: Address, amount: UFix64) {
        pre {
            amount > 0.0: "Vesting amount must be greater than zero"
            EsPANTAToken.vestingRecords[account] == nil: "Vesting record already exists for this account"
        }
        let startTime = getCurrentBlock().timestamp
        let record = VestingRecord(startTime: startTime, totalAmount: amount, vestedAmount: 0.0)
        EsPANTAToken.vestingRecords[account] = record
        emit VestingStarted(account: account, amount: amount, startTime: startTime)
    }

    /// Claim newly vested PANTA for the given account.
    /// Burns the newly vested esPANTA and returns the PANTA amount to be minted.
    /// The caller (Vester contract or transaction) is responsible for minting PANTA.
    /// Panics if no vesting record exists.
    access(all) fun claimVested(account: Address): UFix64 {
        pre {
            EsPANTAToken.vestingRecords[account] != nil: "No vesting record found for this account"
        }
        let record = EsPANTAToken.vestingRecords[account]!
        let now = getCurrentBlock().timestamp
        let elapsed = now - record.startTime

        // Calculate total vested so far (capped at totalAmount)
        let ratio = elapsed / EsPANTAToken.VESTING_DURATION
        let cappedRatio = ratio < 1.0 ? ratio : 1.0
        let totalVested = record.totalAmount * cappedRatio

        // Newly vested since last claim
        let newlyVested = totalVested - record.vestedAmount
        if newlyVested == 0.0 {
            return 0.0
        }

        // Update the record: rebuild with updated vestedAmount
        let updatedRecord = VestingRecord(
            startTime: record.startTime,
            totalAmount: record.totalAmount,
            vestedAmount: totalVested
        )
        EsPANTAToken.vestingRecords[account] = updatedRecord

        // Burn the newly vested esPANTA from totalSupply
        EsPANTAToken.totalSupply = EsPANTAToken.totalSupply - newlyVested
        emit TokensBurned(amount: newlyVested)
        emit VestingClaimed(account: account, vestedAmount: totalVested, pantaAmount: newlyVested)

        return newlyVested
    }

    /// Cancel vesting for the given account.
    /// Returns the unvested esPANTA amount; the caller must return these tokens to the user.
    /// Panics if no vesting record exists.
    access(all) fun cancelVesting(account: Address): UFix64 {
        pre {
            EsPANTAToken.vestingRecords[account] != nil: "No vesting record found for this account"
        }
        let record = EsPANTAToken.vestingRecords[account]!
        let unvested = record.totalAmount - record.vestedAmount

        // Remove the vesting record
        EsPANTAToken.vestingRecords.remove(key: account)
        emit VestingCancelled(account: account, returnedAmount: unvested)

        return unvested
    }

    /// Returns the vesting record for the given account, or nil if none exists.
    access(all) view fun getVestingStatus(account: Address): VestingRecord? {
        return EsPANTAToken.vestingRecords[account]
    }

    // -----------------------------------------------------------------------
    // Public contract functions
    // -----------------------------------------------------------------------

    /// Create an empty esPANTA Vault.
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault} {
        return <- create Vault(balance: 0.0)
    }

    /// Returns the current total supply.
    access(all) view fun getTotalSupply(): UFix64 {
        return self.totalSupply
    }

    access(all) view fun getContractViews(resourceType: Type?): [Type] { return [] }
    access(all) fun resolveContractView(resourceType: Type?, viewType: Type): AnyStruct? { return nil }

    // -----------------------------------------------------------------------
    // Contract initializer
    // -----------------------------------------------------------------------

    init() {
        self.VESTING_DURATION = 31536000.0  // 365 * 24 * 3600
        self.totalSupply = 0.0
        self.transferWhitelist = {}
        self.vestingRecords = {}

        self.VaultStoragePath  = /storage/esPantaTokenVault
        self.VaultPublicPath   = /public/esPantaTokenVault
        self.AdminStoragePath  = /storage/esPantaTokenAdmin
        self.MinterStoragePath = /storage/esPantaTokenMinter

        // Store Admin resource in deployer's storage
        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
