pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PauseGuardian
 * @notice Emergency circuit breaker with limited guardian powers for FVC Protocol
 * @dev Immutable contract that can pause protocol functions but cannot move funds
 * @custom:security Limited powers - can only pause/unpause, cannot access funds or bypass governance
 */
contract PauseGuardian is AccessControl, Pausable {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when trying to pause already paused contract
    error PauseGuardian__AlreadyPaused();
    
    /// @notice Error when trying to unpause already unpaused contract
    error PauseGuardian__AlreadyUnpaused();
    
    /// @notice Error when pause duration exceeds maximum allowed
    error PauseGuardian__PauseDurationTooLong();
    
    /// @notice Error when contract address is zero
    error PauseGuardian__ZeroAddress();
    
    /// @notice Error when pause has expired
    error PauseGuardian__PauseExpired();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for guardian addresses
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");
    
    /// @notice Role identifier for emergency role (higher privileges)
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Role identifier for governance admin
    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    
    /// @notice Maximum duration for emergency pauses (7 days)
    uint256 public constant MAX_PAUSE_DURATION = 7 days;
    
    /// @notice Cooldown period between emergency pauses (24 hours)
    uint256 public constant PAUSE_COOLDOWN = 24 hours;

    // ============ STATE VARIABLES ============
    
    /// @notice Mapping of contract addresses to their pause status
    mapping(address => bool) public contractPaused;
    
    /// @notice Mapping of contract addresses to pause timestamps
    mapping(address => uint256) public pauseStartTime;
    
    /// @notice Mapping of contract addresses to pause duration
    mapping(address => uint256) public pauseDuration;
    
    /// @notice Last emergency pause timestamp for cooldown tracking
    uint256 public lastEmergencyPause;
    
    /// @notice Array of registered pausable contracts
    address[] public pausableContracts;
    
    /// @notice Mapping to check if contract is registered
    mapping(address => bool) public isRegisteredContract;

    // ============ EVENTS ============

    /// @notice Emitted when a contract is paused
    /// @param contractAddr Address of paused contract
    /// @param guardian Address of guardian who initiated pause
    /// @param duration Duration of pause in seconds
    event ContractPaused(address indexed contractAddr, address indexed guardian, uint256 duration);
    
    /// @notice Emitted when a contract is unpaused
    /// @param contractAddr Address of unpaused contract
    /// @param guardian Address of guardian who lifted pause
    event ContractUnpaused(address indexed contractAddr, address indexed guardian);
    
    /// @notice Emitted when emergency pause is activated
    /// @param guardian Address of guardian who triggered emergency pause
    /// @param affectedContracts Array of contracts paused
    event EmergencyPauseActivated(address indexed guardian, address[] affectedContracts);
    
    /// @notice Emitted when a contract is registered for guardian oversight
    /// @param contractAddr Address of registered contract
    event ContractRegistered(address indexed contractAddr);
    
    /// @notice Emitted when a contract is unregistered
    /// @param contractAddr Address of unregistered contract
    event ContractUnregistered(address indexed contractAddr);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the Pause Guardian contract
     * @dev Sets up roles and registers initial contracts
     * @param guardians Array of guardian addresses
     * @param emergencyAddresses Array of emergency role addresses
     * @param admin Governance admin address
     * @custom:security Constructor sets immutable role configuration
     */
    constructor(
        address[] memory guardians,
        address[] memory emergencyAddresses,
        address admin
    ) {
        if (admin == address(0)) revert PauseGuardian__ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ADMIN_ROLE, admin);
        
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == address(0)) revert PauseGuardian__ZeroAddress();
            _grantRole(GUARDIAN_ROLE, guardians[i]);
        }
        
        for (uint256 i = 0; i < emergencyAddresses.length; i++) {
            if (emergencyAddresses[i] == address(0)) revert PauseGuardian__ZeroAddress();
            _grantRole(EMERGENCY_ROLE, emergencyAddresses[i]);
        }
    }

    // ============ GUARDIAN FUNCTIONS ============

    /**
     * @notice Pause a specific contract
     * @dev Guardians can pause individual contracts during security incidents
     * @param contractAddr Address of contract to pause
     * @param duration Duration of pause in seconds (max 7 days)
     * @custom:security Only GUARDIAN_ROLE can pause individual contracts
     */
    function pauseContract(address contractAddr, uint256 duration) 
        external 
        onlyRole(GUARDIAN_ROLE) 
    {
        if (contractAddr == address(0)) revert PauseGuardian__ZeroAddress();
        if (contractPaused[contractAddr]) revert PauseGuardian__AlreadyPaused();
        if (duration > MAX_PAUSE_DURATION) revert PauseGuardian__PauseDurationTooLong();
        if (!isRegisteredContract[contractAddr]) revert PauseGuardian__ZeroAddress();
        
        contractPaused[contractAddr] = true;
        pauseStartTime[contractAddr] = block.timestamp;
        pauseDuration[contractAddr] = duration;
        
        _callPauseFunction(contractAddr, true);
        
        emit ContractPaused(contractAddr, msg.sender, duration);
    }

    /**
     * @notice Unpause a specific contract
     * @dev Guardians can unpause contracts or pauses can expire naturally
     * @param contractAddr Address of contract to unpause
     * @custom:security Only GUARDIAN_ROLE can manually unpause contracts
     */
    function unpauseContract(address contractAddr) 
        external 
        onlyRole(GUARDIAN_ROLE) 
    {
        if (contractAddr == address(0)) revert PauseGuardian__ZeroAddress();
        if (!contractPaused[contractAddr]) revert PauseGuardian__AlreadyUnpaused();
        
        _unpauseContract(contractAddr);
    }

    /**
     * @notice Emergency pause multiple contracts simultaneously
     * @dev Emergency role can pause all registered contracts in crisis
     * @param contracts Array of contract addresses to pause
     * @custom:security Only EMERGENCY_ROLE can trigger emergency pause
     */
    function emergencyPause(address[] calldata contracts) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        if (block.timestamp < lastEmergencyPause + PAUSE_COOLDOWN) {
            revert PauseGuardian__PauseExpired();
        }
        
        lastEmergencyPause = block.timestamp;
        
        for (uint256 i = 0; i < contracts.length; i++) {
            address contractAddr = contracts[i];
            if (contractAddr != address(0) && isRegisteredContract[contractAddr] && !contractPaused[contractAddr]) {
                contractPaused[contractAddr] = true;
                pauseStartTime[contractAddr] = block.timestamp;
                pauseDuration[contractAddr] = MAX_PAUSE_DURATION;
                
                _callPauseFunction(contractAddr, true);
            }
        }
        
        emit EmergencyPauseActivated(msg.sender, contracts);
    }

    /**
     * @notice Emergency unpause all contracts
     * @dev Emergency role can lift all pauses in recovery situations
     * @custom:security Only EMERGENCY_ROLE can lift emergency pauses
     */
    function emergencyUnpauseAll() external onlyRole(EMERGENCY_ROLE) {
        for (uint256 i = 0; i < pausableContracts.length; i++) {
            address contractAddr = pausableContracts[i];
            if (contractPaused[contractAddr]) {
                _unpauseContract(contractAddr);
            }
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Register a contract for guardian oversight
     * @dev Only governance admin can register new contracts
     * @param contractAddr Address of contract to register
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can register contracts
     */
    function registerContract(address contractAddr) 
        external 
        onlyRole(GOVERNANCE_ADMIN_ROLE) 
    {
        if (contractAddr == address(0)) revert PauseGuardian__ZeroAddress();
        if (isRegisteredContract[contractAddr]) return; // Already registered
        
        isRegisteredContract[contractAddr] = true;
        pausableContracts.push(contractAddr);
        
        emit ContractRegistered(contractAddr);
    }

    /**
     * @notice Unregister a contract from guardian oversight
     * @dev Only governance admin can unregister contracts
     * @param contractAddr Address of contract to unregister
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can unregister contracts
     */
    function unregisterContract(address contractAddr) 
        external 
        onlyRole(GOVERNANCE_ADMIN_ROLE) 
    {
        if (!isRegisteredContract[contractAddr]) return; // Not registered
        
        isRegisteredContract[contractAddr] = false;
        
        for (uint256 i = 0; i < pausableContracts.length; i++) {
            if (pausableContracts[i] == contractAddr) {
                pausableContracts[i] = pausableContracts[pausableContracts.length - 1];
                pausableContracts.pop();
                break;
            }
        }
        
        if (contractPaused[contractAddr]) {
            _unpauseContract(contractAddr);
        }
        
        emit ContractUnregistered(contractAddr);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if a contract is currently paused by guardian
     * @dev External contracts can check their pause status
     * @param contractAddr Address of contract to check
     * @return True if contract is paused and pause hasn't expired
     */
    function isContractPaused(address contractAddr) external view returns (bool) {
        if (!contractPaused[contractAddr]) {
            return false;
        }
        
        if (block.timestamp >= pauseStartTime[contractAddr] + pauseDuration[contractAddr]) {
            return false;
        }
        
        return true;
    }

    /**
     * @notice Get time remaining until pause expires
     * @dev Returns 0 if contract is not paused or pause has expired
     * @param contractAddr Address of contract to check
     * @return Seconds remaining until pause expires
     */
    function getTimeUntilUnpause(address contractAddr) external view returns (uint256) {
        if (!contractPaused[contractAddr]) {
            return 0;
        }
        
        uint256 pauseEnd = pauseStartTime[contractAddr] + pauseDuration[contractAddr];
        if (block.timestamp >= pauseEnd) {
            return 0;
        }
        
        return pauseEnd - block.timestamp;
    }

    /**
     * @notice Get all registered pausable contracts
     * @dev Returns array of all contracts under guardian oversight
     * @return Array of registered contract addresses
     */
    function getRegisteredContracts() external view returns (address[] memory) {
        return pausableContracts;
    }

    /**
     * @notice Check if address has guardian privileges
     * @dev Helper function for external verification
     * @param account Address to check
     * @return True if address has guardian or emergency role
     */
    function isGuardian(address account) external view returns (bool) {
        return hasRole(GUARDIAN_ROLE, account) || hasRole(EMERGENCY_ROLE, account);
    }

    // ============ AUTOMATIC EXPIRY ============

    /**
     * @notice Check and expire pauses that have exceeded their duration
     * @dev Anyone can call this to clean up expired pauses
     * @param contractAddrs Array of contract addresses to check
     */
    function expireOldPauses(address[] calldata contractAddrs) external {
        for (uint256 i = 0; i < contractAddrs.length; i++) {
            address contractAddr = contractAddrs[i];
            if (contractPaused[contractAddr]) {
                uint256 pauseEnd = pauseStartTime[contractAddr] + pauseDuration[contractAddr];
                if (block.timestamp >= pauseEnd) {
                    _unpauseContract(contractAddr);
                }
            }
        }
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Internal function to unpause a contract
     * @dev Resets pause state and calls unpause function
     * @param contractAddr Address of contract to unpause
     */
    function _unpauseContract(address contractAddr) internal {
        contractPaused[contractAddr] = false;
        pauseStartTime[contractAddr] = 0;
        pauseDuration[contractAddr] = 0;
        
        _callPauseFunction(contractAddr, false);
        
        emit ContractUnpaused(contractAddr, msg.sender);
    }

    /**
     * @notice Internal function to call pause/unpause on target contract
     * @dev Attempts to call pause function, fails silently if not implemented
     * @param contractAddr Target contract address
     * @param shouldPause True to pause, false to unpause
     */
    function _callPauseFunction(address contractAddr, bool shouldPause) internal {
        bytes memory data = shouldPause ? 
            abi.encodeWithSignature("pause()") : 
            abi.encodeWithSignature("unpause()");
            
        (bool success, ) = contractAddr.call(data);
    }
}
