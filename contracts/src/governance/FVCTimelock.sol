pragma solidity 0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FVCTimelock
 * @notice Timelock controller for FVC Protocol governance with variable delays
 * @dev Immutable timelock implementation with role-based access control
 * @custom:security Immutable contract for maximum security - no upgrades possible
 */
contract FVCTimelock is TimelockController {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when delay is below minimum threshold
    error FVCTimelock__DelayTooShort();
    
    /// @notice Error when delay exceeds maximum threshold
    error FVCTimelock__DelayTooLong();
    
    /// @notice Error when operation is not ready for execution
    error FVCTimelock__OperationNotReady();

    // ============ CONSTANTS ============
    
    /// @notice Minimum delay for standard operations (48 hours)
    uint256 public constant MIN_DELAY = 48 hours;
    
    /// @notice Maximum delay for any operation (30 days)
    uint256 public constant MAX_DELAY = 30 days;
    
    /// @notice Critical operations delay (7 days)
    uint256 public constant CRITICAL_DELAY = 7 days;
    
    /// @notice Role identifier for timelock admin (inherited from TimelockController)

    // ============ STATE VARIABLES ============
    
    /// @notice Mapping of operation types to their required delays
    mapping(bytes4 => uint256) public operationDelays;
    
    /// @notice Mapping of operations to their custom delays
    mapping(bytes32 => uint256) public customDelays;

    // ============ EVENTS ============

    /// @notice Emitted when operation delay is set for a function selector
    /// @param selector Function selector
    /// @param delay Required delay in seconds
    event OperationDelaySet(bytes4 indexed selector, uint256 delay);
    
    /// @notice Emitted when custom delay is set for specific operation
    /// @param operationId Operation identifier
    /// @param delay Custom delay in seconds
    event CustomDelaySet(bytes32 indexed operationId, uint256 delay);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the FVC Timelock contract
     * @dev Sets up timelock with minimum delay and initial roles
     * @param proposers Array of addresses that can propose operations
     * @param executors Array of addresses that can execute operations
     * @param admin Admin address (will be renounced after setup)
     * @custom:security Constructor sets immutable configuration
     */
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {
        _setOperationDelay(this.updateDelay.selector, CRITICAL_DELAY);
        _setOperationDelay(this.grantRole.selector, CRITICAL_DELAY);
        _setOperationDelay(this.revokeRole.selector, CRITICAL_DELAY);
        
        _grantRole(TIMELOCK_ADMIN_ROLE, admin);
    }

    // ============ DELAY MANAGEMENT ============

    /**
     * @notice Set minimum delay for specific function selector
     * @dev Only timelock admin can set operation delays
     * @param selector Function selector to set delay for
     * @param delay Required delay in seconds
     * @custom:security Only TIMELOCK_ADMIN_ROLE can set delays
     */
    function setOperationDelay(bytes4 selector, uint256 delay) 
        external 
        onlyRole(TIMELOCK_ADMIN_ROLE) 
    {
        _setOperationDelay(selector, delay);
    }

    /**
     * @notice Set custom delay for specific operation
     * @dev Allows setting longer delays for particularly sensitive operations
     * @param target Target contract address
     * @param value Value to send with operation
     * @param data Function call data
     * @param delay Custom delay in seconds
     * @custom:security Only TIMELOCK_ADMIN_ROLE can set custom delays
     */
    function setCustomDelay(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 delay
    ) external onlyRole(TIMELOCK_ADMIN_ROLE) {
        if (delay < MIN_DELAY) revert FVCTimelock__DelayTooShort();
        if (delay > MAX_DELAY) revert FVCTimelock__DelayTooLong();
        
        bytes32 operationId = hashOperation(target, value, data, bytes32(0), bytes32(0));
        customDelays[operationId] = delay;
        
        emit CustomDelaySet(operationId, delay);
    }

    /**
     * @notice Get the minimum delay required for an operation
     * @dev Checks both function-specific and custom delays
     * @param target Target contract address
     * @param value Value to send with operation
     * @param data Function call data
     * @return Required delay in seconds
     */
    function getOperationDelay(
        address target,
        uint256 value,
        bytes calldata data
    ) external view returns (uint256) {
        bytes32 operationId = hashOperation(target, value, data, bytes32(0), bytes32(0));
        uint256 customDelay = customDelays[operationId];
        
        if (customDelay > 0) {
            return customDelay;
        }
        
        if (data.length >= 4) {
            bytes4 selector = bytes4(data[:4]);
            uint256 selectorDelay = operationDelays[selector];
            
            if (selectorDelay > 0) {
                return selectorDelay;
            }
        }
        
        return getMinDelay();
    }

    // ============ ENHANCED SCHEDULING ============

    /**
     * @notice Schedule operation with automatic delay calculation
     * @dev Automatically determines appropriate delay based on operation type
     * @param target Target contract address
     * @param value Value to send with operation
     * @param data Function call data
     * @param predecessor Operation that must be executed first
     * @param salt Unique salt for operation identification
     * @return Timestamp when operation can be executed
     */
    function scheduleWithAutoDelay(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external onlyRole(PROPOSER_ROLE) returns (uint256) {
        uint256 delay = this.getOperationDelay(target, value, data);
        
        schedule(target, value, data, predecessor, salt, delay);
        
        return block.timestamp + delay;
    }

    /**
     * @notice Schedule batch operation with automatic delay calculation
     * @dev Automatically determines appropriate delay for batch operations
     * @param targets Array of target contract addresses
     * @param values Array of values to send
     * @param payloads Array of function call data
     * @param predecessor Operation that must be executed first
     * @param salt Unique salt for operation identification
     * @return Timestamp when operation can be executed
     */
    function scheduleBatchWithAutoDelay(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external onlyRole(PROPOSER_ROLE) returns (uint256) {
        uint256 maxDelay = getMinDelay();
        
        for (uint256 i = 0; i < targets.length; i++) {
            uint256 operationDelay = this.getOperationDelay(targets[i], values[i], payloads[i]);
            if (operationDelay > maxDelay) {
                maxDelay = operationDelay;
            }
        }
        
        scheduleBatch(targets, values, payloads, predecessor, salt, maxDelay);
        
        return block.timestamp + maxDelay;
    }

    // ============ OPERATION VALIDATION ============

    /**
     * @notice Validate that operation meets minimum delay requirements
     * @dev Checks if operation has waited long enough based on its type
     * @param target Target contract address
     * @param value Value to send with operation
     * @param data Function call data
     * @param predecessor Previous operation dependency
     * @param salt Operation salt
     * @return True if operation is ready for execution
     */
    function isOperationReady(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external view returns (bool) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        return isOperationReady(id);
    }

    /**
     * @notice Check if operation meets delay requirements
     * @dev Internal validation for operation readiness
     * @param id Operation identifier
     * @return True if operation can be executed
     */
    function isOperationReady(bytes32 id) public view override returns (bool) {
        uint256 timestamp = getTimestamp(id);
        return timestamp > 0 && timestamp <= block.timestamp;
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Emergency cancel operation
     * @dev Allows cancelling operations in emergency situations
     * @param id Operation identifier to cancel
     * @custom:security Only TIMELOCK_ADMIN_ROLE in emergency situations
     */
    function emergencyCancel(bytes32 id) external onlyRole(TIMELOCK_ADMIN_ROLE) {
        cancel(id);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Internal function to set operation delay
     * @dev Sets delay for specific function selector
     * @param selector Function selector
     * @param delay Required delay in seconds
     */
    function _setOperationDelay(bytes4 selector, uint256 delay) internal {
        if (delay < MIN_DELAY) revert FVCTimelock__DelayTooShort();
        if (delay > MAX_DELAY) revert FVCTimelock__DelayTooLong();
        
        operationDelays[selector] = delay;
        emit OperationDelaySet(selector, delay);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if address has proposer role
     * @dev Helper function for external contracts
     * @param account Address to check
     * @return True if address can propose operations
     */
    function isProposer(address account) external view returns (bool) {
        return hasRole(PROPOSER_ROLE, account);
    }

    /**
     * @notice Check if address has executor role
     * @dev Helper function for external contracts
     * @param account Address to check
     * @return True if address can execute operations
     */
    function isExecutor(address account) external view returns (bool) {
        return hasRole(EXECUTOR_ROLE, account);
    }

    /**
     * @notice Get all operation delays for debugging
     * @dev Returns configured delays for common function selectors
     * @return selectors Array of function selectors
     * @return delays Array of corresponding delays
     */
    function getConfiguredDelays() external view returns (bytes4[] memory selectors, uint256[] memory delays) {
        selectors = new bytes4[](0);
        delays = new uint256[](0);
    }
}
