// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBonding
 * @notice Interface for FVC Protocol bonding functionality
 * @dev Defines the core bonding contract interface with vesting and round management
 */
interface IBonding {
    /**
     * @notice Vesting schedule structure for bonded tokens
     * @dev Tracks token lock periods for each user
     * @param amount Total FVC tokens in vesting schedule
     * @param startTime Vesting start timestamp
     * @param endTime Vesting end timestamp
     */
    struct VestingSchedule {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
    }
    
    /**
     * @notice Round configuration structure
     * @dev Contains all parameters for a bonding round
     * @param roundId Unique identifier for the round
     * @param initialDiscount Starting discount percentage
     * @param finalDiscount Ending discount percentage
     * @param epochCap Total USDC that can be bonded in this round
     * @param walletCap Maximum USDC per wallet for this round
     * @param vestingPeriod Vesting period in seconds
     * @param fvcAllocated Total FVC tokens allocated to this round
     * @param fvcSold Total FVC tokens sold in this round
     * @param isActive Whether the round is currently active
     * @param totalBonded Total USDC bonded in this round
     */
    struct RoundConfig {
        uint256 roundId;
        uint256 initialDiscount;
        uint256 finalDiscount;
        uint256 epochCap;
        uint256 walletCap;
        uint256 vestingPeriod;
        uint256 fvcAllocated;  // Total FVC allocated to this round
        uint256 fvcSold;       // Total FVC sold in this round
        bool isActive;
        uint256 totalBonded;
    }
    
    /**
     * @notice Bond USDC for FVC tokens
     * @dev Main bonding function with dynamic discount pricing
     * @param fvcAmount Amount of FVC tokens to purchase
     */
    function bond(uint256 fvcAmount) external;

    /**
     * @notice Allocate FVC tokens to the current bonding round
     * @dev Only owner can allocate FVC tokens for bonding
     * @param fvcAmount Amount of FVC tokens to allocate
     */
    function allocateFVC(uint256 fvcAmount) external;

    /**
     * @notice Get remaining FVC tokens available for bonding
     * @dev Returns the difference between allocated and sold FVC
     * @return Remaining FVC tokens available
     */
    function getRemainingFVC() external view returns (uint256);

    /**
     * @notice Calculate USDC amount needed for a given FVC amount
     * @dev Uses current discount to calculate USDC required
     * @param fvcAmount Amount of FVC tokens desired
     * @return usdcAmount Amount of USDC needed
     */
    function calculateUSDCAmount(uint256 fvcAmount) external view returns (uint256 usdcAmount);

    /**
     * @notice Get current discount based on bonding progress
     * @dev Calculates dynamic discount using total bonded amount
     * @return Current discount percentage (0-100)
     */
    function getCurrentDiscount() external view returns (uint256);

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
     * @notice Get current round configuration
     * @dev Returns complete round data structure
     * @return Current round configuration
     */
    function getCurrentRound() external view returns (RoundConfig memory);

    /**
     * @notice Start a new bonding round with custom parameters
     * @dev Allows owner to manually start rounds with specific parameters
     * @param _initialDiscount Initial discount for the round (0-100)
     * @param _finalDiscount Final discount for the round (0-100)
     * @param _epochCap Total tokens that can be bonded in this round
     * @param _walletCap Max tokens per wallet for this round
     * @param _vestingPeriod Vesting period for this round in seconds
     */
    function startNewRound(
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) external;
    
    /**
     * @notice Emitted when a user bonds USDC
     * @param user Address of the bonding user
     * @param amount Amount of USDC bonded
     */
    event Bonded(address indexed user, uint256 amount);

    /**
     * @notice Emitted when a vesting schedule is created
     * @param user Address of the user with vesting schedule
     * @param amount Amount of FVC tokens in vesting
     * @param startTime Vesting start timestamp
     * @param endTime Vesting end timestamp
     */
    event VestingScheduleCreated(address indexed user, uint256 amount, uint256 startTime, uint256 endTime);

    /**
     * @notice Emitted when a new round starts
     * @param roundId Unique identifier for the round
     * @param initialDiscount Starting discount percentage
     * @param finalDiscount Ending discount percentage
     * @param epochCap Total tokens that can be bonded in this round
     */
    event RoundStarted(uint256 indexed roundId, uint256 initialDiscount, uint256 finalDiscount, uint256 epochCap);

    /**
     * @notice Emitted when a round is completed
     * @param roundId Unique identifier for the completed round
     * @param totalBonded Total USDC bonded in the completed round
     */
    event RoundCompleted(uint256 indexed roundId, uint256 totalBonded);

    /**
     * @notice Emitted when FVC tokens are allocated to the current round
     * @param roundId The round ID
     * @param fvcAmount The amount of FVC tokens allocated
     */
    event FVCAllocated(uint256 roundId, uint256 fvcAmount);
} 