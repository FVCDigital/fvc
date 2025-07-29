// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract FVC is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Bonding contract address for vesting checks
    address public bondingContract;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address admin) public initializer {
        __ERC20_init(_name, _symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function setBondingContract(address _bondingContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bondingContract = _bondingContract;
        emit BondingContractSet(_bondingContract);
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _checkVesting(msg.sender);
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        _checkVesting(from);
        return super.transferFrom(from, to, amount);
    }

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

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // FVC-specific events
    event BondingContractSet(address indexed bondingContract);
} 