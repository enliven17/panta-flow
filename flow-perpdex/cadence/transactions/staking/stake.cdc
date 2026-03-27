import StakingRewards from 0xSTAKINGDEPLOYER

/// stake.cdc
/// Stakes PANTA or PLP tokens for the signer to earn esPANTA rewards.
/// Requirements: 8.3, 8.5, 11.6
///
/// Parameters:
///   tokenType: "PANTA" or "PLP" — the token type to stake
///   amount:    amount to stake (UFix64)
transaction(tokenType: String, amount: UFix64) {

    let stakingAdmin: &StakingRewards.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingAdmin = signer.storage.borrow<&StakingRewards.Admin>(
            from: /storage/stakingRewardsAdmin
        ) ?? panic("Could not borrow StakingRewards Admin from /storage/stakingRewardsAdmin")
    }

    execute {
        if tokenType == "PANTA" {
            self.stakingAdmin.stakePANTA(account: self.stakingAdmin.owner!.address, amount: amount)
        } else if tokenType == "PLP" {
            self.stakingAdmin.stakePLP(account: self.stakingAdmin.owner!.address, amount: amount)
        } else {
            panic("Invalid tokenType: must be PANTA or PLP")
        }
    }
}
