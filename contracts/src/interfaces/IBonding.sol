// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBonding {
    function bond(uint256 amount) external;
    event Bonded(address indexed user, uint256 amount);
} 