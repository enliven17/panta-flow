// SPDX-License-Identifier: MIT
// PLP — PANTA Liquidity Provider Token
// "The river is the same river, yet always different water."
pragma solidity 0.6.12;

import "../tokens/MintableBaseToken.sol";

/**
 * @title PLP
 * @notice PANTA Liquidity Provider Token — represents a share of the PantaDEX vault
 *
 * @dev Minted when users deposit collateral into the PLP pool (via GlpManager).
 *      Burned when users withdraw. Price is calculated from vault AUM.
 *
 * PLP Holders:
 *   - Earn 70% of all trading fees (paid in ETH/USDC)
 *   - Earn esPANTA rewards
 *   - Bear the counterparty risk of traders' P&L
 *
 * Supported collateral assets (configure in Vault):
 *   - USDC  (stablecoin, low risk)
 *   - WETH  (volatile)
 *   - WBTC  (volatile)
 *   + any token whitelisted by governance
 *
 * PLP Price formula:
 *   PLP price = Total AUM (USD) / PLP Total Supply
 *   AUM = sum of all vault assets at mark price ± pending trader P&L
 *
 * Cooldown: 15 minutes after minting before you can redeem.
 * This prevents flash loan attacks on the vault.
 */
contract PLP is MintableBaseToken {

    constructor() public MintableBaseToken("PANTA LP", "PLP", 0) {
        // PLP transfers are restricted — handled by GlpManager / StakedGlp
        inPrivateTransferMode = true;
    }

    function id() external pure returns (string memory) {
        return "PLP";
    }

    function philosophy() external pure returns (string memory) {
        return "Liquidity flows where resistance is lowest. Be the river, not the rock.";
    }
}
