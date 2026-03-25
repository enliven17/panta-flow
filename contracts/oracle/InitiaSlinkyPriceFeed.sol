// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IPriceFeed.sol";

/**
 * @title InitiaSlinkyPriceFeed
 * @notice Initia ConnectOracle (Slinky) precompile'i GMX-style IPriceFeed interface'ine adapte eder.
 *
 * Precompile adresi: 0x031ECb63480983FD216D17BB6e1d393f3816b72F
 * VaultPriceFeed'de priceSampleSpace=1 olarak ayarlanmalı (Slinky tarihsel round desteklemiyor).
 */

interface IConnectOracle {
    struct Price {
        uint256 price;
        uint256 timestamp;
        uint64 height;
        uint64 nonce;
        uint64 decimal;
        uint64 id;
    }

    function get_price(string calldata pair_id) external view returns (Price memory);
}

contract InitiaSlinkyPriceFeed is IPriceFeed {
    IConnectOracle public immutable connectOracle;
    string public pairId;
    string private _description;

    constructor(
        address _oracle,
        string memory _pairId,
        string memory _desc
    ) public {
        require(_oracle != address(0), "InitiaSlinkyPriceFeed: zero oracle address");
        connectOracle = IConnectOracle(_oracle);
        pairId = _pairId;
        _description = _desc;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function aggregator() external view override returns (address) {
        return address(this);
    }

    /**
     * @notice ConnectOracle'dan fiyat alır ve 8 decimale normalize eder (Chainlink standardı).
     */
    function latestAnswer() public view override returns (int256) {
        IConnectOracle.Price memory p = connectOracle.get_price(pairId);
        require(p.price > 0, "InitiaSlinkyPriceFeed: zero price");

        uint256 normalized;
        if (p.decimal >= 8) {
            normalized = p.price / (10 ** uint256(p.decimal - 8));
        } else {
            normalized = p.price * (10 ** uint256(8 - p.decimal));
        }

        require(normalized > 0, "InitiaSlinkyPriceFeed: normalized price is zero");
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
}
