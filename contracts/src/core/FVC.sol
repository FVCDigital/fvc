pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IBonding.sol";

/**
 * @title FVC
 * @notice FVC Protocol governance token with vesting integration
 * @dev ERC20 token with access controls and vesting schedule checks
 * @custom:security Uses OpenZeppelin pattern with role-based access
 */
contract FVC is ERC20, AccessControl {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when tokens are locked in vesting
    error TokensLockedInVesting();
    
    /// @notice Error when address is zero
    error ZeroAddress();
    
    /// @notice Error when amount is zero
    error ZeroAmount();

    // ============ STATE VARIABLES ============
    
    /// @notice Role identifier for minting FVC tokens
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Bonding contract address for vesting checks
    address public bondingContract;

    // ============ EVENTS ============

    /// @notice Emitted when bonding contract is set
    event BondingContractSet(address indexed bondingContract);
    
    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /// @notice Emitted when tokens are burned
    event TokensBurned(address indexed from, uint256 amount);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the FVC token contract
     * @dev Sets up token with name, symbol, and admin role
     * @param _name Token name (First Venture Capital)
     * @param _symbol Token symbol (FVC)
     * @param admin Admin address with DEFAULT_ADMIN_ROLE and MINTER_ROLE
     * @custom:security Grants admin role to specified address
     */
    constructor(string memory _name, string memory _symbol, address admin) payable ERC20(_name, _symbol) {
        if (admin == address(0)) revert ZeroAddress();
        
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
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Set the bonding contract address for vesting checks
     * @dev Only addresses with DEFAULT_ADMIN_ROLE can call this function
     * @param _bondingContract Address of the bonding contract
     * @custom:security Only DEFAULT_ADMIN_ROLE can set bonding contract
     */
    function setBondingContract(address _bondingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_bondingContract == address(0)) revert ZeroAddress();
        
        bondingContract = _bondingContract;
        emit BondingContractSet(_bondingContract);
    }

    /**
     * @notice Get the MINTER_ROLE identifier
     * @dev Returns the bytes32 identifier for the minter role
     * @return The MINTER_ROLE bytes32 identifier
     */
    function getMinterRole() external pure returns (bytes32) {
        return MINTER_ROLE;
    }

    // ============ PUBLIC FUNCTIONS ============

    /**
     * @notice Transfer FVC tokens to another address
     * @dev Overrides ERC20 transfer to check vesting schedules
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer is successful
     * @custom:security Reverts if sender's tokens are locked in vesting
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
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
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        _checkVesting(from);
        return super.transferFrom(from, to, amount);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Check if an address has locked tokens in vesting
     * @dev Calls bonding contract to verify vesting status
     * @param from Address to check for locked tokens
     * @custom:security Reverts if tokens are locked in vesting
     */
    function _checkVesting(address from) internal view {
        address _bondingContract = bondingContract; // Cache storage variable
        if (_bondingContract != address(0)) {
            try IBonding(_bondingContract).isLocked(from) returns (bool isLocked) {
                if (isLocked) {
                    revert TokensLockedInVesting();
                }
            } catch {
            }
        }
    }
} 