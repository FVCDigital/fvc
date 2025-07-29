// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFVC {
    // FVC-specific functions only (no ERC20 or AccessControl duplicates)
    function mint(address to, uint256 amount) external;
    function setBondingContract(address _bondingContract) external;
    function bondingContract() external view returns (address);
    
    // FVC-specific events
    event BondingContractSet(address indexed bondingContract);
} 