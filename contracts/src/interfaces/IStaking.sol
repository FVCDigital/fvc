// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStaking {
    function stake(uint256 amount) external;
    event Staked(address indexed user, uint256 amount);
} 