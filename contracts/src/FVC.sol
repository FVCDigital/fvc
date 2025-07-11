// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract FVC is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    function initialize(address owner) public initializer {
        __ERC20_init("First Venture Capital", "FVC");
        __Ownable_init(owner);
        _mint(owner, 1_000_000_000 ether); // 1B FVC, 18 decimals
        transferOwnership(owner);
    }
} 