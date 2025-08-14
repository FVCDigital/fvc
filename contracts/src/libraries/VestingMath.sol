// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title VestingMath
 * @notice Mathematical utilities for FVC Protocol vesting calculations
 * @dev Provides pure functions for vesting schedule calculations and time-based logic
 * @custom:security All functions are pure and stateless
 */
library VestingMath {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when vesting duration is zero
    error VestingMath__ZeroVestingDuration();
    
    /// @notice Error when cliff is longer than total duration
    error VestingMath__CliffExceedsDuration();
    
    /// @notice Error when amount is zero
    error VestingMath__ZeroAmount();

    /**
     * @notice Calculate vested amount using linear vesting formula
     * @dev Implements cliff + linear vesting calculation
     * @param totalAmount Total amount of tokens in vesting schedule
     * @param startTime Vesting start timestamp
     * @param cliffTime Cliff end timestamp (when vesting begins)
     * @param endTime Vesting end timestamp (when fully vested)
     * @param currentTime Current timestamp for calculation
     * @return vestedAmount Amount of tokens currently vested
     * @custom:security Validates time parameters to prevent overflow
     */
    function calculateLinearVested(
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime,
        uint256 currentTime
    ) internal pure returns (uint256 vestedAmount) {
        if (totalAmount == 0) revert VestingMath__ZeroAmount();
        if (endTime <= cliffTime) revert VestingMath__ZeroVestingDuration();
        if (cliffTime < startTime) revert VestingMath__CliffExceedsDuration();
        
        // Before cliff: nothing vested
        if (currentTime < cliffTime) {
            return 0;
        }
        
        // After vesting period: fully vested
        if (currentTime >= endTime) {
            return totalAmount;
        }
        
        // During vesting period: linear interpolation
        uint256 vestingDuration = endTime - cliffTime;
        uint256 timeVested = currentTime - cliffTime;
        
        // Use precise calculation to avoid rounding errors
        return (totalAmount * timeVested) / vestingDuration;
    }

    /**
     * @notice Calculate claimable amount from vesting schedule
     * @dev Returns amount that can be claimed (vested - already claimed)
     * @param totalAmount Total amount of tokens in vesting schedule
     * @param startTime Vesting start timestamp
     * @param cliffTime Cliff end timestamp
     * @param endTime Vesting end timestamp
     * @param currentTime Current timestamp
     * @param alreadyClaimed Amount already claimed by beneficiary
     * @return claimableAmount Amount that can be claimed now
     */
    function calculateClaimableAmount(
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime,
        uint256 currentTime,
        uint256 alreadyClaimed
    ) internal pure returns (uint256 claimableAmount) {
        uint256 vestedAmount = calculateLinearVested(
            totalAmount,
            startTime,
            cliffTime,
            endTime,
            currentTime
        );
        
        if (vestedAmount <= alreadyClaimed) {
            return 0;
        }
        
        return vestedAmount - alreadyClaimed;
    }

    /**
     * @notice Calculate remaining vesting time
     * @dev Returns seconds until vesting is complete
     * @param endTime Vesting end timestamp
     * @param currentTime Current timestamp
     * @return remainingTime Seconds until fully vested (0 if already complete)
     */
    function calculateRemainingVestingTime(
        uint256 endTime,
        uint256 currentTime
    ) internal pure returns (uint256 remainingTime) {
        if (currentTime >= endTime) {
            return 0;
        }
        
        return endTime - currentTime;
    }

    /**
     * @notice Calculate time until cliff ends
     * @dev Returns seconds until cliff period ends and vesting begins
     * @param cliffTime Cliff end timestamp
     * @param currentTime Current timestamp
     * @return timeUntilCliff Seconds until cliff ends (0 if cliff already passed)
     */
    function calculateTimeUntilCliff(
        uint256 cliffTime,
        uint256 currentTime
    ) internal pure returns (uint256 timeUntilCliff) {
        if (currentTime >= cliffTime) {
            return 0;
        }
        
        return cliffTime - currentTime;
    }

    /**
     * @notice Check if cliff period has ended
     * @dev Returns true if cliff has passed and vesting can begin
     * @param cliffTime Cliff end timestamp
     * @param currentTime Current timestamp
     * @return True if cliff period has ended
     */
    function isCliffEnded(
        uint256 cliffTime,
        uint256 currentTime
    ) internal pure returns (bool) {
        return currentTime >= cliffTime;
    }

    /**
     * @notice Check if vesting is complete
     * @dev Returns true if vesting period has ended
     * @param endTime Vesting end timestamp
     * @param currentTime Current timestamp
     * @return True if vesting is complete
     */
    function isVestingComplete(
        uint256 endTime,
        uint256 currentTime
    ) internal pure returns (bool) {
        return currentTime >= endTime;
    }

    /**
     * @notice Calculate vesting progress as percentage
     * @dev Returns percentage of vesting completed (0-10000 basis points)
     * @param startTime Vesting start timestamp
     * @param endTime Vesting end timestamp
     * @param currentTime Current timestamp
     * @return progressBasisPoints Progress in basis points (0-10000)
     */
    function calculateVestingProgress(
        uint256 startTime,
        uint256 endTime,
        uint256 currentTime
    ) internal pure returns (uint256 progressBasisPoints) {
        if (endTime <= startTime) revert VestingMath__ZeroVestingDuration();
        
        if (currentTime <= startTime) {
            return 0;
        }
        
        if (currentTime >= endTime) {
            return 10000; // 100% in basis points
        }
        
        uint256 totalDuration = endTime - startTime;
        uint256 elapsed = currentTime - startTime;
        
        return (elapsed * 10000) / totalDuration;
    }

    /**
     * @notice Calculate vesting schedule end time
     * @dev Calculates end time based on start time and duration
     * @param startTime Vesting start timestamp
     * @param vestingDuration Total vesting duration in seconds
     * @return endTime Calculated vesting end timestamp
     */
    function calculateVestingEndTime(
        uint256 startTime,
        uint256 vestingDuration
    ) internal pure returns (uint256 endTime) {
        if (vestingDuration == 0) revert VestingMath__ZeroVestingDuration();
        
        return startTime + vestingDuration;
    }

    /**
     * @notice Calculate cliff end time
     * @dev Calculates cliff end time based on start time and cliff duration
     * @param startTime Vesting start timestamp
     * @param cliffDuration Cliff duration in seconds
     * @return cliffTime Calculated cliff end timestamp
     */
    function calculateCliffEndTime(
        uint256 startTime,
        uint256 cliffDuration
    ) internal pure returns (uint256 cliffTime) {
        return startTime + cliffDuration;
    }

    /**
     * @notice Validate vesting schedule parameters
     * @dev Checks if vesting parameters are valid
     * @param totalAmount Total amount to vest
     * @param startTime Vesting start timestamp
     * @param cliffDuration Cliff duration in seconds
     * @param vestingDuration Total vesting duration in seconds
     * @return isValid True if parameters are valid
     */
    function validateVestingSchedule(
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) internal pure returns (bool isValid) {
        if (totalAmount == 0) return false;
        if (vestingDuration == 0) return false;
        if (cliffDuration > vestingDuration) return false;
        if (startTime == 0) return false;
        
        return true;
    }

    /**
     * @notice Calculate pro-rata vesting amount for partial periods
     * @dev Useful for calculating vesting for custom time periods
     * @param totalAmount Total amount in vesting schedule
     * @param vestingDuration Total vesting duration
     * @param periodDuration Duration of period to calculate
     * @return proRataAmount Pro-rata amount for the period
     */
    function calculateProRataAmount(
        uint256 totalAmount,
        uint256 vestingDuration,
        uint256 periodDuration
    ) internal pure returns (uint256 proRataAmount) {
        if (vestingDuration == 0) revert VestingMath__ZeroVestingDuration();
        if (totalAmount == 0) revert VestingMath__ZeroAmount();
        
        if (periodDuration >= vestingDuration) {
            return totalAmount;
        }
        
        return (totalAmount * periodDuration) / vestingDuration;
    }

    /**
     * @notice Calculate compound vesting with acceleration
     * @dev Implements accelerated vesting based on performance multiplier
     * @param totalAmount Total amount in vesting schedule
     * @param startTime Vesting start timestamp
     * @param endTime Vesting end timestamp
     * @param currentTime Current timestamp
     * @param accelerationMultiplier Acceleration factor (10000 = 1x, 15000 = 1.5x)
     * @return acceleratedVested Amount vested with acceleration applied
     */
    function calculateAcceleratedVesting(
        uint256 totalAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 currentTime,
        uint256 accelerationMultiplier
    ) internal pure returns (uint256 acceleratedVested) {
        if (totalAmount == 0) revert VestingMath__ZeroAmount();
        if (endTime <= startTime) revert VestingMath__ZeroVestingDuration();
        
        // Before vesting starts
        if (currentTime <= startTime) {
            return 0;
        }
        
        // After vesting ends
        if (currentTime >= endTime) {
            return totalAmount;
        }
        
        // Calculate base vesting
        uint256 vestingDuration = endTime - startTime;
        uint256 timeVested = currentTime - startTime;
        uint256 baseVested = (totalAmount * timeVested) / vestingDuration;
        
        // Apply acceleration multiplier (capped at total amount)
        uint256 accelerated = (baseVested * accelerationMultiplier) / 10000;
        
        return accelerated > totalAmount ? totalAmount : accelerated;
    }
}
