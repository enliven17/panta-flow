import MockUSDC from 0xPANTA
import MockUSDCFaucet from 0xPANTA

/// refillFaucet.cdc
/// Mints MockUSDC and tops up the faucet's numerical reserve.
/// Run by the deployer/backend when faucet reserve runs low.
/// Parameters:
///   amount: amount to add to the faucet reserve (e.g. 10000000.0 for 10M USDC)
transaction(amount: UFix64) {

    let minter: &MockUSDC.Minter
    let faucetAdmin: &MockUSDCFaucet.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.minter = signer.storage.borrow<&MockUSDC.Minter>(from: /storage/mockUSDCMinter)
            ?? panic("Could not borrow MockUSDC Minter — run setupMinters first")
        self.faucetAdmin = signer.storage.borrow<&MockUSDCFaucet.Admin>(from: /storage/mockUSDCFaucetAdmin)
            ?? panic("Could not borrow MockUSDCFaucet Admin")
    }

    execute {
        // Increment the faucet's reserve counter
        // (Actual minting happens per-claim in claimUSDCForRecipient.cdc)
        self.faucetAdmin.refillReserve(amount: amount)
    }
}
