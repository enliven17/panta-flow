import FungibleToken from 0x9a0766d93b6608b7
import Vault from 0xPANTA
import PLPToken from 0xPANTA

/// seedPool.cdc
/// Admin-only: Seeds the USDC and FLOW pools with initial virtual liquidity so
/// traders can open positions immediately after deployment.
/// No real token transfers occur — Vault tracks amounts numerically.
/// Run once (or whenever pool liquidity needs topping up).
///
/// Parameters:
///   usdcAmount:     USDC seed amount  (e.g. 1000000.0 = 1M USDC)
///   flowAmount:     FLOW seed amount  (e.g. 500000.0)
///   flowPriceUSD:   Current FLOW/USD price (e.g. 0.03)
transaction(usdcAmount: UFix64, flowAmount: UFix64, flowPriceUSD: UFix64) {

    let vaultAdmin: &Vault.Admin
    let plpMinter: &PLPToken.Minter
    let plpReceiver: &{FungibleToken.Receiver}

    prepare(signer: auth(BorrowValue, SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        self.vaultAdmin = signer.storage.borrow<&Vault.Admin>(from: /storage/pantaVaultAdmin)
            ?? panic("Could not borrow Vault.Admin — deploy Vault contract first")

        self.plpMinter = signer.storage.borrow<&PLPToken.Minter>(from: /storage/plpTokenMinter)
            ?? panic("Could not borrow PLPToken.Minter — run setupMinters first")

        if signer.storage.borrow<&PLPToken.Vault>(from: PLPToken.VaultStoragePath) == nil {
            signer.storage.save(
                <- PLPToken.createEmptyVault(vaultType: Type<@PLPToken.Vault>()),
                to: PLPToken.VaultStoragePath
            )
            signer.capabilities.publish(
                signer.capabilities.storage.issue<&PLPToken.Vault>(PLPToken.VaultStoragePath),
                at: PLPToken.VaultPublicPath
            )
        }

        self.plpReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: PLPToken.VaultStoragePath
        ) ?? panic("Could not borrow PLPToken vault")
    }

    execute {
        let deployer = self.plpReceiver.owner!.address

        // ── Seed USDC pool (price = 1.0 USD) ──
        if usdcAmount > 0.0 {
            let usdValue = self.vaultAdmin.addLiquidity(
                token: "USDC",
                amount: usdcAmount,
                depositor: deployer,
                tokenPriceUSD: 1.0
            )
            let plpPrice = PLPToken.getPLPPrice(aum: Vault.getAUM())
            let plp <- self.plpMinter.mintPLP(amount: usdValue / plpPrice, recipient: deployer)
            self.plpReceiver.deposit(from: <- plp)
        }

        // ── Seed FLOW pool ──
        if flowAmount > 0.0 {
            let usdValue = self.vaultAdmin.addLiquidity(
                token: "FLOW",
                amount: flowAmount,
                depositor: deployer,
                tokenPriceUSD: flowPriceUSD
            )
            let plpPrice = PLPToken.getPLPPrice(aum: Vault.getAUM())
            let plp <- self.plpMinter.mintPLP(amount: usdValue / plpPrice, recipient: deployer)
            self.plpReceiver.deposit(from: <- plp)
        }
    }
}
