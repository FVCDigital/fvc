// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FVCUnlocked
 * @notice FVC Protocol governance token WITHOUT vesting restrictions (TESTNET ONLY)
 * @dev ERC20 token with minting capability - NO VESTING CHECKS
 * @custom:security FOR TESTNET USE ONLY - NO VESTING RESTRICTIONS
 */
contract FVCUnlocked is ERC20, Ownable {
    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @notice Initialize the FVC token contract
     * @dev Sets up token with name, symbol, and ownership
     * @param _name Token name (First Venture Capital)
     * @param _symbol Token symbol (FVC)
     * @param _owner Owner address with minting rights
     * @custom:security Grants ownership to specified address
     */
    constructor(string memory _name, string memory _symbol, address _owner) ERC20(_name, _symbol) Ownable() {
        _transferOwnership(_owner);
    }

    /**
     * @notice Mint new FVC tokens to specified address
     * @dev Only owner can call this function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @custom:security Only owner can mint tokens
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Transfer FVC tokens to another address
     * @dev Standard ERC20 transfer - NO VESTING RESTRICTIONS
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     * @custom:security NO VESTING CHECKS - TOKENS CAN BE TRANSFERRED FREELY
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfer FVC tokens from one address to another
     * @dev Standard ERC20 transferFrom - NO VESTING RESTRICTIONS
     * @param from Address to transfer tokens from
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     * @custom:security NO VESTING CHECKS - TOKENS CAN BE TRANSFERRED FREELY
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Burn tokens from specified address
     * @dev Only owner can call this function with additional validation
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @custom:security Only owner can burn tokens, with zero checks
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Cannot burn zero amount");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        
        emit Transfer(from, address(0), amount); // Explicit burn event
    }
}
