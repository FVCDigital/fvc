// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IFVC.sol";

contract Bonding is Initializable, OwnableUpgradeable {
    IFVC public fvc;

    event Bonded(address indexed user, uint256 amount);

    function initialize(address _fvc, address owner) public initializer {
        __Ownable_init(owner);
        fvc = IFVC(_fvc);
    }

    function bond(uint256 amount) external {
        require(amount > 0, "Zero amount");
        fvc.transferFrom(msg.sender, address(this), amount);
        emit Bonded(msg.sender, amount);
    }
} 