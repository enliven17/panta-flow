/// getVaultStats.cdc
/// Returns AUM, pool amounts, and fee reserves for USDC and FLOW.
/// Requirements: 11.6
import Vault from 0xPANTA

access(all) struct VaultStats {
    access(all) let aum: UFix64
    access(all) let usdcPool: Vault.TokenPool?
    access(all) let flowPool: Vault.TokenPool?

    init(aum: UFix64, usdcPool: Vault.TokenPool?, flowPool: Vault.TokenPool?) {
        self.aum = aum
        self.usdcPool = usdcPool
        self.flowPool = flowPool
    }
}

access(all) fun main(): VaultStats {
    let aum = Vault.getAUM()
    let usdcPool = Vault.getTokenPool(token: "USDC")
    let flowPool = Vault.getTokenPool(token: "FLOW")

    return VaultStats(aum: aum, usdcPool: usdcPool, flowPool: flowPool)
}
