// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FVC
 * @notice FVC Protocol governance token with vesting integration
 * @dev ERC20 token with access controls and vesting schedule checks
 * @custom:security Uses OpenZeppelin pattern with role-based access
 */
contract FVC is ERC20, AccessControl {
    /// @notice Role identifier for minting FVC tokens
    /// @dev Only addresses with this role can mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Bonding contract address for vesting checks
    /// @dev Used to verify token transfers against vesting schedules
    address public bondingContract;

    /// @notice Emitted when bonding contract is set
    /// @param bondingContract Address of the bonding contract
    event BondingContractSet(address indexed bondingContract);

    /**
     * @notice Initialize the FVC token contract
     * @dev Sets up token with name, symbol, and admin role
     * @param _name Token name (First Venture Capital)
     * @param _symbol Token symbol (FVC)
     * @param admin Admin address with DEFAULT_ADMIN_ROLE and MINTER_ROLE
     * @custom:security Grants admin role to specified address
     */
    constructor(string memory _name, string memory _symbol, address admin) ERC20(_name, _symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Mint new FVC tokens to specified address
     * @dev Only addresses with MINTER_ROLE can call this function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @custom:security Only MINTER_ROLE can mint tokens
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Set the bonding contract address for vesting checks
     * @dev Only addresses with DEFAULT_ADMIN_ROLE can call this function
     * @param _bondingContract Address of the bonding contract
     * @custom:security Only DEFAULT_ADMIN_ROLE can set bonding contract
     */
    function setBondingContract(address _bondingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bondingContract = _bondingContract;
        emit BondingContractSet(_bondingContract);
    }

    /**
     * @notice Transfer FVC tokens to another address
     * @dev Overrides ERC20 transfer to check vesting schedules
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     * @custom:security Reverts if sender's tokens are locked in vesting
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _checkVesting(msg.sender);
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfer FVC tokens from one address to another
     * @dev Overrides ERC20 transferFrom to check vesting schedules
     * @param from Address to transfer tokens from
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     * @custom:security Reverts if from address tokens are locked in vesting
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        _checkVesting(from);
        return super.transferFrom(from, to, amount);
    }

    /**
     * @notice Check if an address has locked tokens in vesting
     * @dev Calls bonding contract to verify vesting status
     * @param from Address to check for locked tokens
     * @custom:security Reverts if tokens are locked in vesting
     */
    function _checkVesting(address from) internal view {
        if (bondingContract != address(0)) {
            (bool success, bytes memory data) = bondingContract.staticcall(
                abi.encodeWithSignature("isLocked(address)", from)
            );
            if (success && abi.decode(data, (bool))) {
                revert("FVC: tokens locked in vesting");
            }
        }
    }
} 