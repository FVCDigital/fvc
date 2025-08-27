// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IBonding
 * @notice Interface for FVC Protocol milestone-based private sale bonding contract
 * @dev Defines the core bonding functionality and data structures
 */
interface IBonding {
    // ============ DATA STRUCTURES ============
    
    /**
     * @notice Milestone configuration structure
     * @param usdcThreshold USDC threshold to reach this milestone
     * @param price Price per FVC in USDC (6 decimals)
     * @param fvcAllocation FVC tokens allocated to this milestone
     * @param name Milestone name
     * @param isActive Whether milestone is active
     */
    struct Milestone {
        uint256 usdcThreshold;
        uint256 price;
        uint256 fvcAllocation;
        string name;
        bool isActive;
    }
    
    /**
     * @notice Vesting schedule structure
     * @param amount Total amount of FVC tokens in vesting
     * @param startTime Vesting start timestamp
     * @param endTime Vesting end timestamp
     */
    struct VestingSchedule {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
    }
    
    // ============ EVENTS ============
    
    /// @notice Emitted when private sale starts
    event PrivateSaleStarted(uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when private sale ends
    event PrivateSaleEnded(uint256 totalBonded, uint256 totalFVCSold);
    
    /// @notice Emitted when a milestone is reached
    event MilestoneReached(uint256 milestoneIndex, uint256 usdcThreshold, uint256 price);
    
    /// @notice Emitted when a user bonds USDC
    event Bonded(address indexed user, uint256 usdcAmount, uint256 fvcAmount, uint256 milestoneIndex);
    
    /// @notice Emitted when a vesting schedule is created
    event VestingScheduleCreated(address indexed user, uint256 amount, uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when FVC tokens are allocated to a milestone
    event FVCAllocated(uint256 indexed milestoneIndex, uint256 amount);

    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Bond USDC for FVC tokens
     * @dev Main bonding function with milestone-based pricing
     * @param usdcAmount Amount of USDC to bond (in 6 decimals)
     */
    function bond(uint256 usdcAmount) external;
    
    /**
     * @notice Start the private sale
     * @dev Only bonding manager can start the sale
     * @param duration Duration of the sale in seconds
     */
    function startPrivateSale(uint256 duration) external;
    
    /**
     * @notice End the private sale
     * @dev Only bonding manager can end the sale
     */
    function endPrivateSale() external;

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get current milestone price per FVC
     * @dev Returns price in USDC (6 decimals) per FVC
     * @return Current price per FVC
     */
    function getCurrentPrice() external view returns (uint256);
    
    /**
     * @notice Get current milestone information
     * @dev Returns complete milestone data for current milestone
     * @return Current milestone structure
     */
    function getCurrentMilestone() external view returns (Milestone memory);
    
    /**
     * @notice Get all milestones
     * @dev Returns array of all milestone structures
     * @return Array of milestone structures
     */
    function getAllMilestones() external view returns (Milestone[] memory);
    
    /**
     * @notice Get next milestone information
     * @dev Returns next milestone if available
     * @return Next milestone structure or empty if at last milestone
     */
    function getNextMilestone() external view returns (Milestone memory);
    
    /**
     * @notice Calculate FVC amount for given USDC amount at current price
     * @dev Uses current milestone price
     * @param usdcAmount Amount of USDC (in 6 decimals)
     * @return fvcAmount Amount of FVC tokens (in 18 decimals)
     */
    function calculateFVCAmount(uint256 usdcAmount) external view returns (uint256 fvcAmount);
    
    /**
     * @notice Get remaining FVC tokens available for current milestone
     * @dev Returns remaining FVC for current milestone
     * @return Remaining FVC tokens available
     */
    function getRemainingFVC() external view returns (uint256);

    /**
     * @notice Get vesting schedule for a specific user
     * @dev Returns complete vesting data structure
     * @param user Address of the user
     * @return Vesting schedule structure
     */
    function getVestingSchedule(address user) external view returns (VestingSchedule memory);

    /**
     * @notice Check if user's tokens are locked in vesting
     * @dev Used by FVC token to prevent transfers of locked tokens
     * @param user Address of the user to check
     * @return True if tokens are locked, false if unlocked
     */
    function isLocked(address user) external view returns (bool);

    /**
     * @notice Get vested FVC amount for a user
     * @dev Calculates how many FVC tokens are vested and available
     * @param user Address of the user
     * @return vestedAmount Amount of FVC tokens vested
     * @return totalAmount Total amount of FVC tokens in vesting
     */
    function getVestedAmount(address user) external view returns (uint256 vestedAmount, uint256 totalAmount);
    
    /**
     * @notice Get private sale progress information
     * @dev Returns comprehensive sale progress data
     * @return progress Progress percentage (0-10000 for 4 decimal precision)
     * @return currentMilestoneIndex Current milestone index
     * @return totalBondedAmount Total USDC bonded
     * @return totalFVCSoldAmount Total FVC sold
     */
    function getSaleProgress() external view returns (
        uint256 progress,
        uint256 currentMilestoneIndex,
        uint256 totalBondedAmount,
        uint256 totalFVCSoldAmount
    );

    // ============ STATE VARIABLES ============
    
    /// @notice Whether private sale is active
    function privateSaleActive() external view returns (bool);
    
    /// @notice Current milestone index (0-3)
    function currentMilestone() external view returns (uint256);
    
    /// @notice Total USDC collected in private sale
    function totalBonded() external view returns (uint256);
    
    /// @notice Total FVC tokens sold in private sale
    function totalFVCSold() external view returns (uint256);
    
    /// @notice Mapping of user address to total USDC bonded
    function userBonded(address user) external view returns (uint256);
    
    /// @notice Mapping of user address to vesting schedule
    function vestingSchedules(address user) external view returns (VestingSchedule memory);
} 