// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Reverts any transfer to or from a blacklisted address, like a USDC or USDT freeze.
contract MockBlacklistToken is ERC20 {
    mapping(address => bool) public blacklisted;

    constructor() ERC20("Blacklist Token", "BLOCK") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlacklisted(address account, bool value) external {
        blacklisted[account] = value;
    }

    function _beforeTokenTransfer(address from, address to, uint256) internal override {
        require(!blacklisted[from] && !blacklisted[to], "Blacklisted");
    }
}
