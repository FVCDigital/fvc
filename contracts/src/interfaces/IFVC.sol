// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFVC
 * @notice Interface for FVC governance token
 * @dev FVC token interface with minting and vesting integration
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

    /**
     * @notice Get the MINTER_ROLE identifier
     * @dev Returns the bytes32 identifier for the minter role
     * @return The MINTER_ROLE bytes32 identifier
     */
    function getMinterRole() external pure returns (bytes32);

    /**
     * @notice Transfer FVC tokens to another address
     * @dev Overrides ERC20 transfer to check vesting schedules
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Transfer FVC tokens from one address to another
     * @dev Overrides ERC20 transferFrom to check vesting schedules
     * @param from Address to transfer tokens from
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Emitted when bonding contract is set
     * @param bondingContract Address of the bonding contract
     */
    event BondingContractSet(address indexed bondingContract);
    
    /**
     * @notice Emitted when tokens are minted
     * @param to Address receiving the tokens
     * @param amount Amount minted
     */
    event TokensMinted(address indexed to, uint256 amount);
    
    /**
     * @notice Emitted when tokens are burned
     * @param from Address tokens are burned from
     * @param amount Amount burned
     */
    event TokensBurned(address indexed from, uint256 amount);
} 