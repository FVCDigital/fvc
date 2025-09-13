// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IPausable
 * @notice Interface for pausable contracts
 * @dev Standard interface for contracts that can be paused and unpaused
 */
interface IPausable {
    /**
     * @notice Pause the contract
     * @dev Triggers stopped state
     */
    function pause() external;

    /**
     * @notice Unpause the contract  
     * @dev Returns to normal state
     */
    function unpause() external;

    /**
     * @notice Check if contract is paused
     * @return True if contract is paused
     */
    function paused() external view returns (bool);
}
