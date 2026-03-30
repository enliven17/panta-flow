/// getPosition.cdc
/// Returns a position for the given account and token parameters.
/// Requirements: 11.6
import PositionManager from 0xPANTA

access(all) fun main(
    account: Address,
    collateralToken: String,
    indexToken: String,
    isLong: Bool
): PositionManager.Position? {
    let positionKey = PositionManager.getPositionKey(
        account: account,
        collateralToken: collateralToken,
        indexToken: indexToken,
        isLong: isLong
    )
    return PositionManager.getPosition(positionKey: positionKey)
}
