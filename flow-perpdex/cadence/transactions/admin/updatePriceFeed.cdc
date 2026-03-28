import PriceFeed from 0xPANTA

/// updatePriceFeed.cdc
/// Called by the price keeper backend every 30 seconds to keep on-chain prices fresh.
/// Parameters:
///   btcPrice:  BTC/USD price (UFix64, e.g. 84321.12345678)
///   ethPrice:  ETH/USD price (UFix64, e.g. 2100.12345678)
///   flowPrice: FLOW/USD price (UFix64, e.g. 0.65432100)
transaction(btcPrice: UFix64, ethPrice: UFix64, flowPrice: UFix64) {

    let admin: &PriceFeed.Admin

    prepare(signer: auth(BorrowValue) &Account) {
        self.admin = signer.storage.borrow<&PriceFeed.Admin>(from: /storage/priceFeedAdmin)
            ?? panic("Could not borrow PriceFeed Admin")
    }

    execute {
        self.admin.updatePrice(symbol: "BTC/USD", price: btcPrice)
        self.admin.updatePrice(symbol: "ETH/USD", price: ethPrice)
        self.admin.updatePrice(symbol: "FLOW/USD", price: flowPrice)
        self.admin.updatePrice(symbol: "USDC/USD", price: 1.0)
    }
}
