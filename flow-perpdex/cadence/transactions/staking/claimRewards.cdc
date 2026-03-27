import FungibleToken from 0x9a0766d93b6608b7
import StakingRewards from 0xSTAKINGDEPLOYER
import EsPANTAToken from 0xESPANTADEPLOYER

/// claimRewards.cdc
/// Claims pending esPANTA staking rewards for the signer.
/// Mints esPANTA tokens and deposits them into the signer's esPANTA vault.
/// Requirements: 8.3, 8.6, 11.6
///
/// Parameters:
///   tokenType: "PANTA" or "PLP" — the staked token type to claim rewards for
transaction(tokenType: String) {

    let stakingAdmin: &StakingRewards.Admin
    let esPantaMinter: &EsPANTAToken.Minter
    let esPantaReceiver: &{FungibleToken.Receiver}

    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingAdmin = signer.storage.borrow<&StakingRewards.Admin>(
            from: /storage/stakingRewardsAdmin
        ) ?? panic("Could not borrow StakingRewards Admin from /storage/stakingRewardsAdmin")

        self.esPantaMinter = signer.storage.borrow<&EsPANTAToken.Minter>(
            from: /storage/esPantaTokenMinter
        ) ?? panic("Could not borrow EsPANTAToken Minter from /storage/esPantaTokenMinter")

        // Ensure signer has an esPANTA vault; create one if not
        if signer.storage.borrow<&EsPANTAToken.Vault>(from: EsPANTAToken.VaultStoragePath) == nil {
            signer.storage.save(
                <- EsPANTAToken.createEmptyVault(vaultType: Type<@EsPANTAToken.Vault>()),
                to: EsPANTAToken.VaultStoragePath
            )
            signer.capabilities.publish(
                signer.capabilities.storage.issue<&{FungibleToken.Receiver}>(EsPANTAToken.VaultStoragePath),
                at: EsPANTAToken.VaultPublicPath
            )
        }

        self.esPantaReceiver = signer.storage.borrow<&{FungibleToken.Receiver}>(
            from: EsPANTAToken.VaultStoragePath
        ) ?? panic("Could not borrow signer's esPANTA vault receiver")
    }

    execute {
        let rewardAmount = self.stakingAdmin.claimRewards(
            account: self.stakingAdmin.owner!.address,
            tokenType: tokenType
        )

        if rewardAmount > 0.0 {
            let rewardVault <- self.esPantaMinter.mintTokens(amount: rewardAmount)
            self.esPantaReceiver.deposit(from: <- rewardVault)
        }
    }
}
