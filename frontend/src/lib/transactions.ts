/// Cadence transaction strings for PantaDEX frontend.
/// FCL replaces 0xPANTA, 0xFungibleToken with actual addresses from config.


export const OPEN_POSITION_TX = `
import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

transaction(
    indexToken: String,
    collateralAmount: UFix64,
    sizeDelta: UFix64,
    isLong: Bool
) {
    prepare(signer: auth(BorrowValue) &Account) {
        let userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &MockUSDC.Vault>(
            from: MockUSDC.VaultStoragePath
        ) ?? panic("USDC vault not found. Please call setupAccount first.")

        let collateral <- userVault.withdraw(amount: collateralAmount) as! @MockUSDC.Vault

        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool")

        pool.openPosition(
            account: signer.address,
            collateral: <-collateral,
            indexToken: indexToken,
            sizeDelta: sizeDelta,
            isLong: isLong
        )
    }
}
`

export const CREATE_LIMIT_ORDER_TX = `
import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import OrderBook from 0xPANTA

transaction(
    indexToken: String,
    collateralAmount: UFix64,
    sizeDelta: UFix64,
    isLong: Bool,
    limitPrice: UFix64
) {
    prepare(signer: auth(BorrowValue) &Account) {
        let userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &MockUSDC.Vault>(
            from: MockUSDC.VaultStoragePath
        ) ?? panic("USDC vault not found. Please call setupAccount first.")

        let collateral <- userVault.withdraw(amount: collateralAmount) as! @MockUSDC.Vault

        let mgr = getAccount(0xPANTA)
            .capabilities.borrow<&OrderBook.OrderManager>(/public/pantaOrderBook)
            ?? panic("Cannot borrow OrderBook.OrderManager")

        mgr.createOrder(
            account: signer.address,
            collateral: <-collateral,
            indexToken: indexToken,
            sizeDelta: sizeDelta,
            isLong: isLong,
            limitPrice: limitPrice
        )
    }
}
`

export const CANCEL_LIMIT_ORDER_TX = `
import OrderBook from 0xPANTA

transaction(orderId: UInt64) {
    prepare(signer: auth(BorrowValue) &Account) {
        let mgr = getAccount(0xPANTA)
            .capabilities.borrow<&OrderBook.OrderManager>(/public/pantaOrderBook)
            ?? panic("Cannot borrow OrderBook.OrderManager")

        mgr.cancelOrder(account: signer.address, orderId: orderId)
    }
}
`

export const ADD_COLLATERAL_TX = `
import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

transaction(
    indexToken: String,
    collateralAmount: UFix64,
    isLong: Bool
) {
    prepare(signer: auth(BorrowValue) &Account) {
        let userVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &MockUSDC.Vault>(
            from: MockUSDC.VaultStoragePath
        ) ?? panic("USDC vault not found. Please call setupAccount first.")

        let collateral <- userVault.withdraw(amount: collateralAmount) as! @MockUSDC.Vault

        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool")

        pool.addCollateral(
            account: signer.address,
            collateral: <-collateral,
            indexToken: indexToken,
            isLong: isLong
        )
    }
}
`

export const CLOSE_POSITION_TX = `
import FungibleToken from 0xFungibleToken
import MockUSDC from 0xPANTA
import TradingRouter from 0xPANTA

transaction(
    indexToken: String,
    collateralDelta: UFix64,
    sizeDelta: UFix64,
    isLong: Bool
) {
    prepare(signer: auth(BorrowValue) &Account) {
        let receiver = signer.capabilities
            .borrow<&{FungibleToken.Receiver}>(MockUSDC.VaultPublicPath)
            ?? panic("No USDC receiver. Please call setupAccount first.")

        let pool = getAccount(0xPANTA)
            .capabilities.borrow<&TradingRouter.Pool>(/public/tradingRouterPool)
            ?? panic("Cannot borrow TradingRouter.Pool")

        pool.closePosition(
            account: signer.address,
            indexToken: indexToken,
            collateralDelta: collateralDelta,
            sizeDelta: sizeDelta,
            isLong: isLong,
            receiver: receiver
        )
    }
}
`
