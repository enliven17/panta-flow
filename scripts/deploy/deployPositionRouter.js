const { ethers } = require("hardhat")
const addresses = require("../../deployed-addresses.json")

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying PositionRouter with:", deployer.address)

  const ShortsTracker = await ethers.getContractFactory("ShortsTracker")
  const shortsTracker = await ShortsTracker.deploy(addresses.Vault)
  await shortsTracker.deployed()
  console.log("ShortsTracker:", shortsTracker.address)

  const WETH_ADDRESS = addresses.WETH   // deployFaucetTokens.js ile deploy edilen FaucetToken
  const DEPOSIT_FEE = 30 // 0.3%
  const MIN_EXECUTION_FEE = ethers.utils.parseEther("0.0001")

  const PositionRouter = await ethers.getContractFactory("PositionRouter")
  const positionRouter = await PositionRouter.deploy(
    addresses.Vault,
    addresses.Router,
    WETH_ADDRESS,
    shortsTracker.address,
    DEPOSIT_FEE,
    MIN_EXECUTION_FEE
  )
  await positionRouter.deployed()
  console.log("PositionRouter:", positionRouter.address)

  const OrderBook = await ethers.getContractFactory("OrderBook")
  const orderBook = await OrderBook.deploy()
  await orderBook.deployed()
  console.log("OrderBook:", orderBook.address)

  await orderBook.initialize(
    addresses.Router,
    addresses.Vault,
    WETH_ADDRESS,
    addresses.USDG,
    MIN_EXECUTION_FEE,
    ethers.utils.parseUnits("10", 30) // minPurchaseTokenAmountUsd = $10
  )
  console.log("OrderBook initialized ✓")

  const newAddresses = {
    ...addresses,
    ShortsTracker: shortsTracker.address,
    PositionRouter: positionRouter.address,
    OrderBook: orderBook.address,
  }
  const fs = require("fs")
  fs.writeFileSync("./deployed-addresses.json", JSON.stringify(newAddresses, null, 2))
  console.log("Adresler güncellendi ✓")
}

main().catch(console.error)
