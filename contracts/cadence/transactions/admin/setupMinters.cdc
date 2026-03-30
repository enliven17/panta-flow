import MockUSDC from 0xPANTA
import PANTAToken from 0xPANTA
import EsPANTAToken from 0xPANTA
import PLPToken from 0xPANTA

/// setupMinters.cdc
/// One-time admin transaction: creates Minter resources from each token's Admin
/// and stores them in the deployer's storage so other admin transactions can use them.
/// Run once after initial deployment.
transaction {

    prepare(signer: auth(BorrowValue, SaveValue) &Account) {

        // ---- MockUSDC Minter ----
        if signer.storage.borrow<&MockUSDC.Minter>(from: /storage/mockUSDCMinter) == nil {
            let admin = signer.storage.borrow<&MockUSDC.Admin>(from: /storage/mockUSDCAdmin)
                ?? panic("Could not borrow MockUSDC Admin")
            let minter <- admin.createMinter()
            signer.storage.save(<- minter, to: /storage/mockUSDCMinter)
        }

        // ---- PANTAToken Minter ----
        if signer.storage.borrow<&PANTAToken.Minter>(from: /storage/pantaTokenMinter) == nil {
            let admin = signer.storage.borrow<&PANTAToken.Admin>(from: /storage/pantaTokenAdmin)
                ?? panic("Could not borrow PANTAToken Admin")
            let minter <- admin.createMinter()
            signer.storage.save(<- minter, to: /storage/pantaTokenMinter)
        }

        // ---- EsPANTAToken Minter ----
        if signer.storage.borrow<&EsPANTAToken.Minter>(from: /storage/esPantaTokenMinter) == nil {
            let admin = signer.storage.borrow<&EsPANTAToken.Admin>(from: /storage/esPantaTokenAdmin)
                ?? panic("Could not borrow EsPANTAToken Admin")
            let minter <- admin.createMinter()
            signer.storage.save(<- minter, to: /storage/esPantaTokenMinter)
        }

        // ---- PLPToken Minter ----
        if signer.storage.borrow<&PLPToken.Minter>(from: /storage/plpTokenMinter) == nil {
            let admin = signer.storage.borrow<&PLPToken.Admin>(from: /storage/plpTokenAdmin)
                ?? panic("Could not borrow PLPToken Admin")
            let minter <- admin.createMinter()
            signer.storage.save(<- minter, to: /storage/plpTokenMinter)
        }
    }
}
