// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MockFVC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Bonding contract address for vesting checks
    address public bondingContract;

    constructor() ERC20("First Venture Capital", "FVC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function setBondingContract(address _bondingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bondingContract = _bondingContract;
        emit BondingContractSet(_bondingContract);
    }
    
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    // FVC-specific events
    event BondingContractSet(address indexed bondingContract);
} 