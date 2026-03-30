import FungibleToken from 0x9a0766d93b6608b7
import EsPANTAToken from 0xPANTA
import StakingRewards from 0xPANTA

/// unstakeForUser.cdc
/// Deployer (backend) claims pending rewards THEN unstakes on behalf of a user.
/// Rewards are minted as esPANTA before the stake record is deleted (otherwise they are lost).
/// Parameters:
///   account:    user's Flow address
///   tokenType:  "PANTA" or "PLP"
transaction(account: Address, tokenType: String) {

    let stakingAdmin: &StakingRewards.Admin
    let esMinter: &EsPANTAToken.Minter

    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingAdmin = signer.storage.borrow<&StakingRewards.Admin>(from: /storage/stakingRewardsAdmin)
            ?? panic("Could not borrow StakingRewards Admin")
        self.esMinter = signer.storage.borrow<&EsPANTAToken.Minter>(from: /storage/esPantaTokenMinter)
            ?? panic("Could not borrow EsPANTAToken Minter — run setupMinters first")
    }

    execute {
        // 1. Claim accumulated rewards before deleting the stake record
        let rewards = self.stakingAdmin.claimRewards(account: account, tokenType: tokenType)
        if rewards > 0.0 {
            let tokens <- self.esMinter.mintTokens(amount: rewards)
            let recipientCap = getAccount(account)
                .capabilities.borrow<&{FungibleToken.Receiver}>(EsPANTAToken.VaultPublicPath)
            if recipientCap != nil {
                recipientCap!.deposit(from: <- tokens)
            } else {
                // User has no esPANTA vault — burn to avoid resource loss
                self.esMinter.burnTokens(vault: <- (tokens as! @EsPANTAToken.Vault))
            }
        }

        // 2. Now remove the stake record
        let _ = self.stakingAdmin.unstake(account: account, tokenType: tokenType)
    }
}
