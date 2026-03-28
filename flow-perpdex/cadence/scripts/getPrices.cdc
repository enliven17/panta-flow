/// getPrices.cdc
/// Returns USDC/USD and FLOW/USD prices from PriceFeed.
/// Requirements: 6.2
import PriceFeed from 0xPANTA

access(all) fun main(): {String: PriceFeed.PriceData} {
    let usdcPrice = PriceFeed.getPrice(symbol: "USDC/USD")
    let flowPrice = PriceFeed.getPrice(symbol: "FLOW/USD")

    return {
        "USDC/USD": usdcPrice,
        "FLOW/USD": flowPrice
    }
}
