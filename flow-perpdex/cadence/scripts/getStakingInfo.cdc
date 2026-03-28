/// getStakingInfo.cdc
/// Returns staked amount and pending rewards for an account.
/// Requirements: 7.5, 11.6
import StakingRewards from 0xPANTA

access(all) fun main(account: Address, tokenType: String): {String: UFix64} {
    let record = StakingRewards.getStakeRecord(account: account, tokenType: tokenType)
    let stakedAmount = record?.stakedAmount ?? 0.0
    let pendingRewards = StakingRewards.calculatePendingRewards(account: account, tokenType: tokenType)

    return {
        "stakedAmount": stakedAmount,
        "pendingRewards": pendingRewards
    }
}
