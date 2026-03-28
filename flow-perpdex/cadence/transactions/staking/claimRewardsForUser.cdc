import FungibleToken from 0x9a0766d93b6608b7
import EsPANTAToken from 0xPANTA
import StakingRewards from 0xPANTA

/// claimRewardsForUser.cdc
/// Deployer (backend) claims esPANTA rewards on behalf of a user and mints them to their vault.
/// Recipient must have run setupAccount.cdc (but their esPANTA vault may not exist yet — we create it here).
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
        let rewards = self.stakingAdmin.claimRewards(account: account, tokenType: tokenType)
        if rewards == 0.0 { return }

        let tokens <- self.esMinter.mintTokens(amount: rewards)

        let recipientCap = getAccount(account)
            .capabilities.borrow<&{FungibleToken.Receiver}>(EsPANTAToken.VaultPublicPath)

        if recipientCap != nil {
            recipientCap!.deposit(from: <- tokens)
        } else {
            // If recipient has no esPANTA vault yet, burn the tokens to avoid resource loss
            self.esMinter.burnTokens(vault: <- (tokens as! @EsPANTAToken.Vault))
        }
    }
}
