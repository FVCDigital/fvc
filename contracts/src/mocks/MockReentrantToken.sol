// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Calls `target` with `payload` during every transfer once armed, and bubbles any revert.
contract MockReentrantToken is ERC20 {
    address public target;
    bytes public payload;
    bool public armed;

    constructor() ERC20("Reentrant Token", "REENT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        payload = payload_;
        armed = true;
    }

    function _afterTokenTransfer(address, address, uint256) internal override {
        if (!armed) return;
        armed = false;
        (bool ok, bytes memory reason) = target.call(payload);
        if (!ok) {
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }
}
