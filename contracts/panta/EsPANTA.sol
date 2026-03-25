// SPDX-License-Identifier: MIT
// esPANTA — Escrowed PANTA
// Staking rewards vest over time, like rivers carving canyons — slowly, inevitably.
pragma solidity 0.6.12;

import "../tokens/MintableBaseToken.sol";

/**
 * @title esPANTA
 * @notice Escrowed PANTA — earned through staking, vests into PANTA over time
 *
 * @dev esPANTA cannot be freely transferred (inPrivateTransferMode = true by default).
 *      It can only move through whitelisted handlers: RewardTracker, Vester.
 *
 * Flow:
 *   Stake PANTA / PLP
 *       └─► Earn esPANTA rewards (non-transferable)
 *               └─► Vest esPANTA over 1 year
 *                       └─► Receive PANTA 1:1
 *
 * Why escrowed?
 *   Prevents immediate sell pressure. Aligns long-term holders with the protocol.
 *   "You cannot step into the same river twice" — but you can wait for it to reach you.
 */
contract EsPANTA is MintableBaseToken {

    constructor() public MintableBaseToken("Escrowed PANTA", "esPANTA", 0) {
        // Lock transfers by default — only whitelisted handlers can move esPANTA
        inPrivateTransferMode = true;
    }

    function id() external pure returns (string memory) {
        return "esPANTA";
    }

    function philosophy() external pure returns (string memory) {
        return "Patience is the river that carves the canyon. Vest, do not rush.";
    }
}
