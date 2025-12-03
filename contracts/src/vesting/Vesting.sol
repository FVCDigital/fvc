// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Vesting
 * @notice Vesting contract with cliff support - owner (Gnosis Safe) manually creates schedules
 * @dev Owner can create, modify, and revoke vesting schedules
 */
contract Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STRUCTS ============

    struct VestingSchedule {
        uint256 totalAmount;    // Total tokens to vest
        uint256 released;       // Tokens already released
        uint256 startTime;      // Vesting start timestamp
        uint256 cliff;          // Cliff duration in seconds (e.g., 180 days)
        uint256 duration;       // Total vesting duration in seconds (e.g., 730 days)
        bool revoked;           // Can be revoked by owner
    }

    // ============ STATE VARIABLES ============

    /// @notice Token being vested (FVC)
    IERC20 public immutable token;

    /// @notice Vesting schedules per beneficiary
    mapping(address => VestingSchedule) public schedules;

    /// @notice Total tokens held in vesting
    uint256 public totalVesting;

    // ============ EVENTS ============

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    );
    event VestingScheduleModified(
        address indexed beneficiary,
        uint256 newAmount,
        uint256 newCliff,
        uint256 newDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 refunded);

    // ============ ERRORS ============

    error Vesting__ZeroAddress();
    error Vesting__ZeroAmount();
    error Vesting__InvalidDuration();
    error Vesting__ScheduleExists();
    error Vesting__NoSchedule();
    error Vesting__NothingToRelease();
    error Vesting__BeforeCliff();
    error Vesting__AlreadyRevoked();
    error Vesting__InsufficientBalance();

    // ============ CONSTRUCTOR ============

    /**
     * @param _token Token to vest (FVC)
     */
    constructor(address _token) {
        if (_token == address(0)) revert Vesting__ZeroAddress();
        token = IERC20(_token);
    }

    // ============ OWNER FUNCTIONS (GNOSIS SAFE) ============

    /**
     * @notice Create vesting schedule for beneficiary
     * @param beneficiary Address receiving vested tokens
     * @param amount Total tokens to vest
     * @param startTime Vesting start timestamp (use block.timestamp for immediate)
     * @param cliff Cliff duration in seconds (0 for no cliff)
     * @param duration Total vesting duration in seconds
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    ) external onlyOwner {
        if (beneficiary == address(0)) revert Vesting__ZeroAddress();
        if (amount == 0) revert Vesting__ZeroAmount();
        if (duration == 0) revert Vesting__InvalidDuration();
        if (cliff > duration) revert Vesting__InvalidDuration();
        if (schedules[beneficiary].totalAmount != 0) revert Vesting__ScheduleExists();

        // Ensure contract has enough tokens
        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance < totalVesting + amount) revert Vesting__InsufficientBalance();

        schedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            released: 0,
            startTime: startTime,
            cliff: cliff,
            duration: duration,
            revoked: false
        });

        totalVesting += amount;

        emit VestingScheduleCreated(beneficiary, amount, startTime, cliff, duration);
    }

    /**
     * @notice Modify existing vesting schedule (before any release)
     * @param beneficiary Address to modify
     * @param newAmount New total amount
     * @param newCliff New cliff duration
     * @param newDuration New total duration
     */
    function modifyVestingSchedule(
        address beneficiary,
        uint256 newAmount,
        uint256 newCliff,
        uint256 newDuration
    ) external onlyOwner {
        VestingSchedule storage schedule = schedules[beneficiary];
        if (schedule.totalAmount == 0) revert Vesting__NoSchedule();
        if (schedule.released > 0) revert Vesting__NothingToRelease(); // Can't modify after release started
        if (schedule.revoked) revert Vesting__AlreadyRevoked();
        if (newDuration == 0) revert Vesting__InvalidDuration();
        if (newCliff > newDuration) revert Vesting__InvalidDuration();

        // Adjust totalVesting
        totalVesting = totalVesting - schedule.totalAmount + newAmount;

        schedule.totalAmount = newAmount;
        schedule.cliff = newCliff;
        schedule.duration = newDuration;

        emit VestingScheduleModified(beneficiary, newAmount, newCliff, newDuration);
    }

    /**
     * @notice Revoke vesting schedule and return unvested tokens to owner
     * @param beneficiary Address to revoke
     */
    function revokeVesting(address beneficiary) external onlyOwner nonReentrant {
        VestingSchedule storage schedule = schedules[beneficiary];
        if (schedule.totalAmount == 0) revert Vesting__NoSchedule();
        if (schedule.revoked) revert Vesting__AlreadyRevoked();

        uint256 vested = _vestedAmount(schedule);
        uint256 refund = schedule.totalAmount - vested;

        schedule.revoked = true;
        totalVesting -= refund;

        if (refund > 0) {
            token.safeTransfer(owner(), refund);
        }

        emit VestingRevoked(beneficiary, refund);
    }

    /**
     * @notice Emergency withdraw tokens (only unvested/unallocated tokens)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        uint256 available = contractBalance - totalVesting;
        require(amount <= available, "Exceeds available balance");
        token.safeTransfer(owner(), amount);
    }

    // ============ BENEFICIARY FUNCTIONS ============

    /**
     * @notice Release vested tokens to beneficiary
     */
    function release() external nonReentrant {
        VestingSchedule storage schedule = schedules[msg.sender];
        if (schedule.totalAmount == 0) revert Vesting__NoSchedule();
        if (schedule.revoked) revert Vesting__AlreadyRevoked();

        uint256 releasable = _releasableAmount(schedule);
        if (releasable == 0) revert Vesting__NothingToRelease();

        schedule.released += releasable;
        totalVesting -= releasable;

        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, releasable);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get releasable amount for beneficiary
     */
    function releasableAmount(address beneficiary) external view returns (uint256) {
        return _releasableAmount(schedules[beneficiary]);
    }

    /**
     * @notice Get vesting schedule details
     */
    function getVestingSchedule(address beneficiary)
        external
        view
        returns (
            uint256 totalAmount,
            uint256 released,
            uint256 startTime,
            uint256 cliff,
            uint256 duration,
            bool revoked,
            uint256 releasable
        )
    {
        VestingSchedule memory schedule = schedules[beneficiary];
        return (
            schedule.totalAmount,
            schedule.released,
            schedule.startTime,
            schedule.cliff,
            schedule.duration,
            schedule.revoked,
            _releasableAmount(schedule)
        );
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Calculate releasable amount
     */
    function _releasableAmount(VestingSchedule memory schedule) private view returns (uint256) {
        if (schedule.totalAmount == 0 || schedule.revoked) return 0;

        uint256 vested = _vestedAmount(schedule);
        return vested - schedule.released;
    }

    /**
     * @dev Calculate vested amount
     */
    function _vestedAmount(VestingSchedule memory schedule) private view returns (uint256) {
        if (schedule.totalAmount == 0) return 0;

        uint256 elapsed = block.timestamp - schedule.startTime;

        // Before cliff
        if (elapsed < schedule.cliff) return 0;

        // After full duration
        if (elapsed >= schedule.duration) return schedule.totalAmount;

        // Linear vesting
        return (schedule.totalAmount * elapsed) / schedule.duration;
    }
}
