// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFVC
 * @notice Interface for FVC Protocol governance token
 * @dev Defines the core FVC token interface with minting and vesting integration
 */
interface IFVC {
    /**
     * @notice Mint new FVC tokens to specified address
     * @dev Only addresses with MINTER_ROLE can call this function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Set the bonding contract address for vesting checks
     * @dev Only addresses with DEFAULT_ADMIN_ROLE can call this function
     * @param _bondingContract Address of the bonding contract
     */
    function setBondingContract(address _bondingContract) external;
} 