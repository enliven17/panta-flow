// SPDX-License-Identifier: MIT
// PANTA — "Panta Rhei" (Heraclitus, ~500 BC)
// "Everything flows" — the governing force of PantaDEX on Initia
pragma solidity 0.6.12;

import "../tokens/MintableBaseToken.sol";

/**
 * @title PANTA
 * @notice Governance and utility token of PantaDEX
 * @dev Based on GMX architecture, adapted for Initia EVM Testnet
 *
 * Tokenomics:
 *   - Total Supply : 10,000,000 PANTA
 *   - Decimals     : 18
 *   - Minting      : Controlled by governance (onlyMinter)
 *   - Burning      : Supported
 *
 * Distribution (suggested):
 *   40% — Ecosystem & Trading Rewards (escrowed as esPANTA)
 *   20% — Liquidity Incentives (PLP stakers)
 *   15% — Team (2-year vesting)
 *   15% — Treasury
 *   10% — Initial DEX Offering / Testnet Participants
 */
contract PANTA is MintableBaseToken {

    // 10,000,000 PANTA — "ten million rivers, all flowing"
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18;

    constructor() public MintableBaseToken("PANTA", "PANTA", 0) {
    }

    /**
     * @notice Mint PANTA — only callable by authorized minters (RewardRouter)
     * @dev Enforces MAX_SUPPLY cap
     */
    function mint(address _account, uint256 _amount) external override onlyMinter {
        require(totalSupply.add(_amount) <= MAX_SUPPLY, "PANTA: max supply exceeded");
        _mint(_account, _amount);
    }

    function id() external pure returns (string memory) {
        return "PANTA";
    }

    function philosophy() external pure returns (string memory) {
        return "Panta Rhei — Everything flows. Heraclitus, ~500 BC.";
    }
}
