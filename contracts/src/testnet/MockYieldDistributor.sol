// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IStakingRewards
 * @notice Interface for StakingRewards contract
 */
interface IStakingRewards {
    function notifyRewardAmount(uint256 reward) external;
}

/**
 * @title MockYieldDistributor
 * @notice Simulates Aave yield distribution for testnet
 * @dev Admin manually triggers weekly USDC distribution to stakers
 */
contract MockYieldDistributor is Ownable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    /// @notice Staking contract receiving rewards
    IStakingRewards public stakingRewards;
    
    /// @notice USDC token
    IERC20 public immutable usdc;
    
    /// @notice Weekly yield amount (default 1000 USDC)
    uint256 public weeklyYield;
    
    /// @notice Last distribution timestamp
    uint256 public lastDistribution;
    
    /// @notice Distribution interval (default 7 days)
    uint256 public distributionInterval = 7 days;

    // ============ EVENTS ============

    event YieldDistributed(uint256 amount, uint256 timestamp);
    event WeeklyYieldUpdated(uint256 oldAmount, uint256 newAmount);
    event StakingRewardsUpdated(address indexed newStakingRewards);
    event DistributionIntervalUpdated(uint256 newInterval);

    // ============ ERRORS ============

    error MockYield__ZeroAddress();
    error MockYield__ZeroAmount();
    error MockYield__TooSoon(uint256 remainingTime);
    error MockYield__InsufficientBalance(uint256 required, uint256 available);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize mock yield distributor
     * @param _usdc USDC token address
     * @param _stakingRewards Staking contract address
     * @param _weeklyYield Initial weekly yield amount
     */
    constructor(
        address _usdc,
        address _stakingRewards,
        uint256 _weeklyYield
    ) {
        if (_usdc == address(0)) revert MockYield__ZeroAddress();
        if (_stakingRewards == address(0)) revert MockYield__ZeroAddress();
        if (_weeklyYield == 0) revert MockYield__ZeroAmount();
        
        usdc = IERC20(_usdc);
        stakingRewards = IStakingRewards(_stakingRewards);
        weeklyYield = _weeklyYield;
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Distribute weekly yield to stakers
     * @dev Can only be called after distribution interval has passed
     */
    function distributeYield() external onlyOwner {
        // Check interval (skip for first distribution)
        if (lastDistribution != 0) {
            uint256 timeSinceLastDistribution = block.timestamp - lastDistribution;
            if (timeSinceLastDistribution < distributionInterval) {
                revert MockYield__TooSoon(distributionInterval - timeSinceLastDistribution);
            }
        }
        
        // Check balance
        uint256 balance = usdc.balanceOf(address(this));
        if (balance < weeklyYield) {
            revert MockYield__InsufficientBalance(weeklyYield, balance);
        }
        
        // Update state
        lastDistribution = block.timestamp;
        
        // Transfer USDC to staking contract
        usdc.safeTransfer(address(stakingRewards), weeklyYield);
        
        // Notify staking contract of new rewards
        stakingRewards.notifyRewardAmount(weeklyYield);
        
        emit YieldDistributed(weeklyYield, block.timestamp);
    }

    /**
     * @notice Distribute custom amount (for testing)
     * @param amount Amount to distribute
     */
    function distributeCustomAmount(uint256 amount) external onlyOwner {
        if (amount == 0) revert MockYield__ZeroAmount();
        
        uint256 balance = usdc.balanceOf(address(this));
        if (balance < amount) {
            revert MockYield__InsufficientBalance(amount, balance);
        }
        
        lastDistribution = block.timestamp;
        
        usdc.safeTransfer(address(stakingRewards), amount);
        stakingRewards.notifyRewardAmount(amount);
        
        emit YieldDistributed(amount, block.timestamp);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update weekly yield amount
     * @param newWeeklyYield New weekly yield
     */
    function setWeeklyYield(uint256 newWeeklyYield) external onlyOwner {
        if (newWeeklyYield == 0) revert MockYield__ZeroAmount();
        
        uint256 oldAmount = weeklyYield;
        weeklyYield = newWeeklyYield;
        
        emit WeeklyYieldUpdated(oldAmount, newWeeklyYield);
    }

    /**
     * @notice Update staking rewards contract
     * @param newStakingRewards New staking contract address
     */
    function setStakingRewards(address newStakingRewards) external onlyOwner {
        if (newStakingRewards == address(0)) revert MockYield__ZeroAddress();
        
        stakingRewards = IStakingRewards(newStakingRewards);
        
        emit StakingRewardsUpdated(newStakingRewards);
    }

    /**
     * @notice Update distribution interval
     * @param newInterval New interval in seconds
     */
    function setDistributionInterval(uint256 newInterval) external onlyOwner {
        if (newInterval == 0) revert MockYield__ZeroAmount();
        
        distributionInterval = newInterval;
        
        emit DistributionIntervalUpdated(newInterval);
    }

    /**
     * @notice Withdraw USDC (emergency)
     * @param amount Amount to withdraw
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        usdc.safeTransfer(owner(), amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if distribution can be triggered
     * @return canDistribute Whether distribution is available
     * @return remainingTime Seconds until next distribution (0 if available)
     */
    function canDistribute() external view returns (
        bool canDistribute,
        uint256 remainingTime
    ) {
        // First distribution always available
        if (lastDistribution == 0) {
            return (true, 0);
        }
        
        uint256 timeSinceLastDistribution = block.timestamp - lastDistribution;
        if (timeSinceLastDistribution >= distributionInterval) {
            return (true, 0);
        }
        
        remainingTime = distributionInterval - timeSinceLastDistribution;
        return (false, remainingTime);
    }

    /**
     * @notice Get contract info
     * @return usdcBalance USDC balance in contract
     * @return nextDistribution Timestamp of next distribution
     * @return currentWeeklyYield Current weekly yield amount
     */
    function getInfo() external view returns (
        uint256 usdcBalance,
        uint256 nextDistribution,
        uint256 currentWeeklyYield
    ) {
        usdcBalance = usdc.balanceOf(address(this));
        nextDistribution = lastDistribution == 0 ? block.timestamp : lastDistribution + distributionInterval;
        currentWeeklyYield = weeklyYield;
    }
}
