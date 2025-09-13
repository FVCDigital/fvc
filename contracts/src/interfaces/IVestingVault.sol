// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IVestingVault
 * @notice Interface for FVC vesting vault functionality
 * @dev Vesting vault interface for token custody and vesting schedules
 */
interface IVestingVault {
    /**
     * @notice Vesting schedule structure
     * @dev Contains all vesting parameters for a beneficiary
     * @param beneficiary Address that will receive the vested tokens
     * @param totalAmount Total amount of tokens in the vesting schedule
     * @param claimedAmount Amount of tokens already claimed
     * @param startTime Vesting start timestamp
     * @param cliffTime Cliff end timestamp (when vesting begins)
     * @param endTime Vesting end timestamp (when fully vested)
     * @param isRevocable Whether the schedule can be revoked
     * @param isRevoked Whether the schedule has been revoked
     * @param revoker Address authorized to revoke (if revocable)
     */
    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 cliffTime;
        uint256 endTime;
        bool isRevocable;
        bool isRevoked;
        address revoker;
    }

    /**
     * @notice Create a new vesting schedule
     * @dev Only addresses with SALE_ROLE can create vesting schedules
     * @param beneficiary Address that will receive the vested tokens
     * @param totalAmount Total amount of tokens to vest
     * @param cliffDuration Duration of cliff period in seconds
     * @param vestingDuration Total vesting duration in seconds
     * @param isRevocable Whether the schedule can be revoked
     * @param revoker Address authorized to revoke (if revocable)
     * @return scheduleId Unique identifier for the created schedule
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool isRevocable,
        address revoker
    ) external returns (uint256 scheduleId);

    /**
     * @notice Claim vested tokens from a schedule
     * @dev Beneficiary can claim tokens after cliff period
     * @param scheduleId Vesting schedule identifier
     */
    function claimVestedTokens(uint256 scheduleId) external;

    /**
     * @notice Calculate vested amount for a schedule
     * @dev Returns amount of tokens vested at current time
     * @param scheduleId Vesting schedule identifier
     * @return Vested token amount
     */
    function calculateVestedAmount(uint256 scheduleId) external view returns (uint256);

    /**
     * @notice Calculate claimable amount for a schedule
     * @dev Returns amount of tokens that can be claimed now
     * @param scheduleId Vesting schedule identifier
     * @return Claimable token amount
     */
    function calculateClaimableAmount(uint256 scheduleId) external view returns (uint256);

    /**
     * @notice Get vesting schedule details
     * @dev Returns complete schedule information
     * @param scheduleId Vesting schedule identifier
     * @return Complete vesting schedule struct
     */
    function getVestingSchedule(uint256 scheduleId) external view returns (VestingSchedule memory);

    /**
     * @notice Emitted when a new vesting schedule is created
     * @param scheduleId Unique identifier for the vesting schedule
     * @param beneficiary Address that will receive the tokens
     * @param totalAmount Total amount of tokens in the schedule
     * @param startTime Vesting start timestamp
     * @param cliffTime Cliff end timestamp
     * @param endTime Vesting end timestamp
     * @param isRevocable Whether the schedule can be revoked
     */
    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime,
        bool isRevocable
    );

    /**
     * @notice Emitted when tokens are claimed from vesting
     * @param scheduleId Vesting schedule identifier
     * @param beneficiary Address claiming the tokens
     * @param amount Amount of tokens claimed
     * @param remainingAmount Amount still vesting
     */
    event TokensClaimed(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 remainingAmount
    );
}
