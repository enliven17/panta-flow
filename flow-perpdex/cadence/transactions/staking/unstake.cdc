import StakingRewards from 0xSTAKINGDEPLOYER

/// unstake.cdc
/// Unstakes PANTA or PLP tokens for the signer and returns the staked amount.
/// Requirements: 8.5, 8.6, 11.6
///
/// Parameters:
///   tokenType: "PANTA" or "PLP" — the token type to unstake
transaction(tokenType: String) {

    let stakingAdmin: &StakingRewards.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.stakingAdmin = signer.storage.borrow<&StakingRewards.Admin>(
            from: /storage/stakingRewardsAdmin
        ) ?? panic("Could not borrow StakingRewards Admin from /storage/stakingRewardsAdmin")
    }

    execute {
        let stakedAmount = self.stakingAdmin.unstake(
            account: self.stakingAdmin.owner!.address,
            tokenType: tokenType
        )
        log("Unstaked amount: ".concat(stakedAmount.toString()))
    }
}
