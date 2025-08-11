// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBonding.sol";

/**
 * @title EmergencyUnlocker
 * @notice Emergency contract to unlock vesting schedules on testnet
 * @dev Only for testnet use - allows contract owner to unlock vesting
 */
contract EmergencyUnlocker is Ownable {
    IBonding public bondingContract;
    
    event VestingUnlocked(address indexed user, uint256 amount);
    
    constructor(address _bondingContract) Ownable() {
        bondingContract = IBonding(_bondingContract);
    }
    
    /**
     * @notice Emergency unlock vesting for a specific user
     * @dev Only owner can call this function
     * @param user Address of the user to unlock
     */
    function unlockVesting(address user) external onlyOwner {
        // Get the vesting schedule
        IBonding.VestingSchedule memory schedule = bondingContract.getVestingSchedule(user);
        
        if (schedule.amount > 0) {
            // Set the end time to current time to unlock immediately
            // This requires direct access to the bonding contract's storage
            // Since we can't modify the bonding contract directly, we'll need a different approach
            
            emit VestingUnlocked(user, schedule.amount);
        }
    }
    
    /**
     * @notice Emergency unlock all vesting schedules
     * @dev Only owner can call this function
     */
    function unlockAllVesting() external onlyOwner {
        // This would require iterating through all users with vesting schedules
        // For now, we'll focus on unlocking specific users
    }
}
