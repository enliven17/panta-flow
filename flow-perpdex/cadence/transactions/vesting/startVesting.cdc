import FungibleToken from 0x9a0766d93b6608b7
import EsPANTAToken from 0xESPANTADEPLOYER

/// startVesting.cdc
/// Starts a 365-day linear vesting schedule by locking esPANTA tokens.
/// The signer's esPANTA is withdrawn and locked in the vesting contract.
/// Requirements: 3.3, 3.4, 11.6
///
/// Parameters:
///   amount: amount of esPANTA to lock in vesting (UFix64)
transaction(amount: UFix64) {

    let esPantaVault: auth(FungibleToken.Withdraw) &EsPANTAToken.Vault

    prepare(signer: auth(BorrowValue) &Account) {
        self.esPantaVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &EsPANTAToken.Vault>(
            from: EsPANTAToken.VaultStoragePath
        ) ?? panic("Could not borrow signer's esPANTA vault with withdraw entitlement")
    }

    execute {
        // Withdraw esPANTA from signer's vault — tokens are now locked in vesting
        let vestingTokens <- self.esPantaVault.withdraw(amount: amount)

        // Burn the withdrawn vault (esPANTA is locked; vesting record tracks the amount)
        destroy vestingTokens

        // Register the vesting schedule in the EsPANTAToken contract
        EsPANTAToken.startVesting(account: self.esPantaVault.owner!.address, amount: amount)
    }
}
