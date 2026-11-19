// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Returns false from transfer and transferFrom without moving tokens once `failing` is set.
contract MockFalseReturnToken is ERC20 {
    bool public failing;

    constructor() ERC20("False Token", "FALSE") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setFailing(bool failing_) external {
        failing = failing_;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (failing) return false;
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (failing) return false;
        return super.transferFrom(from, to, amount);
    }
}
