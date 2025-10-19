// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FVC
 * @dev Lean ERC20 implementation for staking MVP
 * @custom:security Uses OpenZeppelin pattern with role-based access
 */
contract FVC is ERC20, AccessControl {
    
    // ============ STATE VARIABLES ============
    
    /// @notice Role identifier for minting FVC tokens
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Maximum token supply (1 billion FVC)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialise the FVC token contract
     * @dev Sets up token with hardcoded name/symbol and admin role
     * @param admin Admin address with DEFAULT_ADMIN_ROLE and MINTER_ROLE
     * @custom:security Grants admin role to specified address
     */
    constructor(address admin) ERC20("First Venture Capital", "FVC") {
        require(admin != address(0), "Zero address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Mint new FVC tokens to specified address
     * @dev Only addresses with MINTER_ROLE can call this function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @custom:security Only MINTER_ROLE can mint tokens
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    /**
     * @notice Get the MINTER_ROLE identifier
     * @dev Returns the bytes32 identifier for the minter role
     * @return The MINTER_ROLE bytes32 identifier
     */
    function getMinterRole() external pure returns (bytes32) {
        return MINTER_ROLE;
    }
} 
