import FungibleToken from 0x9a0766d93b6608b7

/// MockUSDC — Test USDC token for Flow Testnet
/// Implements the FungibleToken standard interface.
/// No max supply limit; Admin controls Minter creation.
access(all) contract MockUSDC: FungibleToken {

    // -----------------------------------------------------------------------
    // Contract-level state
    // -----------------------------------------------------------------------

    /// Total number of MockUSDC tokens in existence
    access(all) var totalSupply: UFix64

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    access(all) event TokensMinted(amount: UFix64)
    access(all) event TokensBurned(amount: UFix64)
    access(all) event TokensWithdrawn(amount: UFix64, from: Address?)
    access(all) event TokensDeposited(amount: UFix64, to: Address?)

    // FungibleToken standard events (required by interface)
    access(all) event Transfer(amount: UFix64, from: Address?, to: Address?)

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

    /// Each account holds its MockUSDC balance in a Vault resource.
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
                self.balance >= amount: "Insufficient balance: available=".concat(self.balance.toString()).concat(" requested=".concat(amount.toString()))
            }
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <- create Vault(balance: amount)
        }

        /// Deposit tokens from another vault into this vault.
        access(all) fun deposit(from: @{FungibleToken.Vault}) {
            let vault <- from as! @MockUSDC.Vault
            let amount = vault.balance
            vault.balance = 0.0
            self.balance = self.balance + amount
            emit TokensDeposited(amount: amount, to: self.owner?.address)
            destroy vault
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
    }

    // -----------------------------------------------------------------------
    // Minter resource
    // -----------------------------------------------------------------------

    /// Minter resource — only Admin can create one.
    /// Allows minting new MockUSDC tokens and burning existing ones.
    access(all) resource Minter {

        /// Mint the given amount of MockUSDC tokens.
        access(all) fun mintTokens(amount: UFix64): @Vault {
            pre {
                amount > 0.0: "Mint amount must be greater than zero"
            }
            MockUSDC.totalSupply = MockUSDC.totalSupply + amount
            emit TokensMinted(amount: amount)
            return <- create Vault(balance: amount)
        }

        /// Burn the tokens in the given vault, reducing total supply.
        access(all) fun burnTokens(vault: @Vault) {
            let amount = vault.balance
            MockUSDC.totalSupply = MockUSDC.totalSupply - amount
            emit TokensBurned(amount: amount)
            destroy vault
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

    /// Create an empty MockUSDC Vault.
    /// Required by the FungibleToken standard.
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault} {
        return <- create Vault(balance: 0.0)
    }

    // -----------------------------------------------------------------------
    // Contract initializer
    // -----------------------------------------------------------------------

    init() {
        self.totalSupply = 0.0

        self.VaultStoragePath  = /storage/mockUSDCVault
        self.VaultPublicPath   = /public/mockUSDCVault
        self.AdminStoragePath  = /storage/mockUSDCAdmin
        self.MinterStoragePath = /storage/mockUSDCMinter

        // Store Admin resource in deployer's storage
        self.account.storage.save(<- create Admin(), to: self.AdminStoragePath)
    }
}
