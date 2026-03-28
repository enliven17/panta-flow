/// getPLPPrice.cdc
/// Returns the current PLP token price.
/// plpPrice = AUM / totalSupply (or 1.0 if supply is zero)
/// Requirements: 11.6
import PLPToken from 0xPANTA
import Vault from 0xPANTA

access(all) fun main(): UFix64 {
    let aum = Vault.getAUM()
    return PLPToken.getPLPPrice(aum: aum)
}
