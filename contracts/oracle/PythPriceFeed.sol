// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IPriceFeed.sol";
import "./interfaces/IPyth.sol";
import "./interfaces/PythStructs.sol";
import "../libraries/math/SafeMath.sol";

/**
 * @title PythPriceFeed
 * @notice Pyth Network'ün getPrice(feedId) çağrısını GMX'in IPriceFeed arayüzüne adapte eder.
 *
 * - latestAnswer() Pyth'ten fiyat alır ve 8 decimale normalize eder (Chainlink standardı).
 * - Pyth fiyatları değişken üslüdür (expo). Normalizasyon: price * 10^(8 + expo)
 *   expo < 0 ise: price / 10^(-expo - 8)  (veya price * 10^(8 + expo))
 *   expo >= 0 ise: price * 10^(8 + expo)
 * - priceSampleSpace=1 ile kullanılır (Pyth tarihsel round desteklemiyor).
 * - Constructor: _pyth (Pyth kontrat adresi), _feedId (bytes32 price feed ID), _desc (açıklama)
 */
contract PythPriceFeed is IPriceFeed {
    using SafeMath for uint256;

    IPyth public immutable pyth;
    bytes32 public immutable feedId;
    string private _description;

    constructor(
        address _pyth,
        bytes32 _feedId,
        string memory _desc
    ) public {
        require(_pyth != address(0), "PythPriceFeed: zero pyth address");
        pyth = IPyth(_pyth);
        feedId = _feedId;
        _description = _desc;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    /// @notice Returns address(this) as the aggregator — no separate aggregator contract.
    function aggregator() external view override returns (address) {
        return address(this);
    }

    /**
     * @notice Pyth'ten fiyat alır ve 8 decimale normalize eder.
     * @dev Pyth Price struct: price (int64) * 10^expo
     *      Hedef: 8 decimal (Chainlink standardı)
     *      expo < 0: normalized = price * 10^(8 + expo)
     *                           = price / 10^(-8 - expo)   (expo < -8 durumunda)
     *                           = price * 10^(8 + expo)    (expo >= -8 durumunda)
     *      expo >= 0: normalized = price * 10^(8 + expo)
     */
    function latestAnswer() public view override returns (int256) {
        PythStructs.Price memory p = pyth.getPrice(feedId);
        require(p.price > 0, "PythPriceFeed: non-positive price");

        uint256 price = uint256(p.price);
        int32 expo = p.expo;

        uint256 normalized;
        if (expo < 0) {
            // expo is negative, e.g. -8 means price is already in 8 decimal form
            int32 negExpo = -expo; // positive magnitude
            if (negExpo > 8) {
                // need to divide: normalized = price / 10^(negExpo - 8)
                uint256 divisor = _pow10(uint256(negExpo - 8));
                normalized = price.div(divisor);
            } else if (negExpo < 8) {
                // need to multiply: normalized = price * 10^(8 - negExpo)
                uint256 multiplier = _pow10(uint256(8 - negExpo));
                normalized = price.mul(multiplier);
            } else {
                // negExpo == 8, already 8 decimals
                normalized = price;
            }
        } else {
            // expo >= 0: normalized = price * 10^(8 + expo)
            uint256 multiplier = _pow10(uint256(8).add(uint256(expo)));
            normalized = price.mul(multiplier);
        }

        require(normalized > 0, "PythPriceFeed: normalized price is zero");
        return int256(normalized);
    }

    /**
     * @notice priceSampleSpace=1 ile bu fonksiyon hiç çağrılmaz; stub olarak 1 döner.
     */
    function latestRound() external view override returns (uint80) {
        return uint80(1);
    }

    /**
     * @notice priceSampleSpace=1 ile hiç çağrılmaz; her round için güncel fiyat döner.
     * @dev Pyth tarihsel round desteklemediğinden dummy data döndürülür.
     */
    function getRoundData(uint80 /* roundId */)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        int256 price = latestAnswer();
        return (uint80(1), price, block.timestamp, block.timestamp, uint80(1));
    }

    /// @dev Computes 10^n using SafeMath to avoid overflow.
    function _pow10(uint256 n) internal pure returns (uint256 result) {
        result = 1;
        for (uint256 i = 0; i < n; i++) {
            result = result.mul(10);
        }
    }
}
