import StakingRewards from 0xPANTA

/// stakeForUser.cdc
/// Deployer (backend) stakes tokens on behalf of a user address.
/// Parameters:
///   account:    user's Flow address
///   tokenType:  "PANTA" or "PLP"
///   amount:     amount to stake
transaction(account: Address, tokenType: String, amount: UFix64) {

    let admin: &StakingRewards.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.admin = signer.storage.borrow<&StakingRewards.Admin>(from: /storage/stakingRewardsAdmin)
            ?? panic("Could not borrow StakingRewards Admin")
    }

    execute {
        if tokenType == "PANTA" {
            self.admin.stakePANTA(account: account, amount: amount)
        } else if tokenType == "PLP" {
            self.admin.stakePLP(account: account, amount: amount)
        } else {
            panic("Invalid tokenType: must be PANTA or PLP")
        }
    }
}
