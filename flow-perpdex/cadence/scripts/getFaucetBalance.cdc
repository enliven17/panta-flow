/// getFaucetBalance.cdc
/// Returns the current faucet reserve balance.
/// Requirements: 7.5, 11.6
import MockUSDCFaucet from 0xPLACEHOLDER

access(all) fun main(): UFix64 {
    return MockUSDCFaucet.getReserveBalance()
}
