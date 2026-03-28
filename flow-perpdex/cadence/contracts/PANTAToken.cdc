import FungibleToken from 0x9a0766d93b6608b7

/// PANTAToken — Governance and utility token for PantaDEX on Flow Testnet
/// Implements the FungibleToken standard interface.
/// Maximum supply is capped at 10,000,000 PANTA.
/// Only Admin-created Minters can mint new tokens.
access(all) contract PANTAToken: FungibleToken {

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// Hard cap on total PANTA supply
    access(all) let maxSupply: UFix64

    /// Total number of PANTA tokens currently in existence
    access(all) var totalSupply: UFix64

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event TokensMinted(amount: UFix64)
    access(all) event TokensBurned(amount: UFix64)
    access(all) event TokensWithdrawn(amount: UFix64, from: Address?)
    access(all) event TokensDeposited(amount: UFix64, to: Address?)

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

    /// Each account holds its PANTA balance in a Vault resource.
    /// Balance is always >= 0.0 (UFix64 guarantees non-negativity).
    access(all) resource Vault: FungibleToken.Vault {

        /// Balance of this vault
        access(all) var balance: UFix64

        init(balance: UFix64) {
            self.balance = balance
        }

        /// Withdraw the given amount from this vault.
        /// Panics if the vault does not have sufficient funds.
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

        /// Deposit tokens from another vault into this vault.
        access(all) fun deposit(from: @{FungibleToken.Vault}) {
            let vault <- from as! @PANTAToken.Vault
            let amount = vault.balance
            self.balance = self.balance + amount
            emit TokensDeposited(amount: amount, to: self.owner?.address)
            destroy vault
        }

        /// Returns whether this vault has at least the given amount available.
        access(all) view fun isAvailableToWithdraw(amount: UFix64): Bool {
            return self.balance >= amount
        }

        /// Create an empty vault of the same type.
        access(all) fun createEmptyVault(): @{FungibleToken.Vault} {
            return <- create Vault(balance: 0.0)
        }

        /// Returns the supported vault types (required by FungibleToken.Vault)
        access(all) view fun getSupportedVaultTypes(): {Type: Bool} {
            return {self.getType(): true}
        }

        /// Returns whether this vault supports the given type
        access(all) view fun isSupportedVaultType(type: Type): Bool {
            return type == self.getType()
        }

        /// Returns the balance of this vault
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
    /// Enforces the maxSupply cap on every mint.
    access(all) resource Minter {

        /// Mint the given amount of PANTA tokens.
        /// Panics if the mint would exceed maxSupply.
        access(all) fun mintTokens(amount: UFix64): @Vault {
            pre {
                amount > 0.0: "Mint amount must be greater than zero"
                PANTAToken.totalSupply + amount <= PANTAToken.maxSupply:
                    "Max supply exceeded"
            }
            PANTAToken.totalSupply = PANTAToken.totalSupply + amount
            emit TokensMinted(amount: amount)
            return <- create Vault(balance: amount)
        }
    }

    // -----------------------------------------------------------------------
    // Admin resource
    // -----------------------------------------------------------------------

    /// Admin resource — stored in deployer's storage at contract init.
    /// Controls Minter creation.
    access(all) resource Admin {

        /// Create a new Minter resource.
        access(all) fun createMinter(): @Minter {
            return <- create Minter()
        }
    }

    // -----------------------------------------------------------------------
    // Public contract functions
    // -----------------------------------------------------------------------

    /// Burn callback — called when tokens are destroyed.
    /// Reduces totalSupply by the vault's balance.
    access(all) fun burnCallback(vault: @{FungibleToken.Vault}) {
        let pantaVault <- vault as! @PANTAToken.Vault
        let amount = pantaVault.balance
        PANTAToken.totalSupply = PANTAToken.totalSupply - amount
        emit TokensBurned(amount: amount)
        destroy pantaVault
    }

    /// Create an empty PANTA Vault.
    /// Required by the FungibleToken standard.
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault} {
        return <- create Vault(balance: 0.0)
    }

    /// Returns the maximum supply cap.
    access(all) view fun getMaxSupply(): UFix64 {
        return self.maxSupply
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
        self.maxSupply  = 10_000_000.0
        self.totalSupply = 0.0

        self.VaultStoragePath  = /storage/pantaTokenVault
        self.VaultPublicPath   = /public/pantaTokenVault
        self.AdminStoragePath  = /storage/pantaTokenAdmin
        self.MinterStoragePath = /storage/pantaTokenMinter

        // Store Admin resource in deployer's storage
        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
