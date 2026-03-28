import StakingRewards from 0xPANTA

/// unstakeForUser.cdc
/// Deployer (backend) unstakes tokens on behalf of a user.
/// Parameters:
///   account:    user's Flow address
///   tokenType:  "PANTA" or "PLP"
transaction(account: Address, tokenType: String) {

    let admin: &StakingRewards.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.admin = signer.storage.borrow<&StakingRewards.Admin>(from: /storage/stakingRewardsAdmin)
            ?? panic("Could not borrow StakingRewards Admin")
    }

    execute {
        let _ = self.admin.unstake(account: account, tokenType: tokenType)
    }
}
