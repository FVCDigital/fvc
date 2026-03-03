// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Vesting
 * @notice Per-investor, multi-schedule vesting with cliff support.
 *         Each investor wallet can hold any number of independent schedules,
 *         each with its own amount, cliff, and duration. This supports:
 *           - Standard public-sale vesting (uniform terms, auto-created by Sale.sol)
 *           - Negotiated seed/OTC terms (bespoke cliff/duration per investor)
 *           - Top-up allocations to existing investors without disturbing prior schedules
 * @dev Owner (Gnosis Safe via Sale.sol or directly) creates and manages schedules.
 *      Beneficiaries call release(scheduleId) to claim vested tokens.
 */
contract Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STRUCTS ============

    struct VestingSchedule {
        uint256 totalAmount;  // Total tokens to vest
        uint256 released;     // Tokens already released
        uint256 startTime;    // Vesting start timestamp
        uint256 cliff;        // Cliff duration in seconds (0 = no cliff)
        uint256 duration;     // Total vesting duration in seconds
        bool revoked;
    }

    // ============ STATE VARIABLES ============

    IERC20 public immutable token;

    /// @notice schedules[beneficiary][scheduleId] => VestingSchedule
    mapping(address => mapping(uint256 => VestingSchedule)) public schedules;

    /// @notice Number of schedules created per beneficiary
    mapping(address => uint256) public scheduleCount;

    /// @notice Total tokens committed across all active schedules
    uint256 public totalVesting;

    // ============ EVENTS ============

    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 indexed scheduleId,
        uint256 amount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    );
    event VestingScheduleModified(
        address indexed beneficiary,
        uint256 indexed scheduleId,
        uint256 newAmount,
        uint256 newCliff,
        uint256 newDuration
    );
    event TokensReleased(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 indexed scheduleId, uint256 refunded);

    // ============ ERRORS ============

    error Vesting__ZeroAddress();
    error Vesting__ZeroAmount();
    error Vesting__InvalidDuration();
    error Vesting__NoSchedule();
    error Vesting__NothingToRelease();
    error Vesting__AlreadyRevoked();
    error Vesting__InsufficientBalance();
    error Vesting__ReleasedAlready();

    // ============ CONSTRUCTOR ============

    constructor(address _token) {
        if (_token == address(0)) revert Vesting__ZeroAddress();
        token = IERC20(_token);
    }

    // ============ OWNER FUNCTIONS ============

    /**
     * @notice Create a new vesting schedule for a beneficiary.
     *         Multiple schedules per address are supported — each gets an auto-incremented ID.
     * @param beneficiary  Wallet receiving vested tokens
     * @param amount       Total FVC (18 decimals) to vest
     * @param startTime    Unix timestamp vesting begins (use block.timestamp for immediate)
     * @param cliff        Cliff in seconds; 0% is claimable until cliff elapses
     * @param duration     Total duration in seconds; 100% claimable at startTime + duration
     * @return scheduleId  The ID assigned to this schedule (0-indexed per beneficiary)
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    ) external onlyOwner returns (uint256 scheduleId) {
        if (beneficiary == address(0)) revert Vesting__ZeroAddress();
        if (amount == 0) revert Vesting__ZeroAmount();
        if (duration == 0) revert Vesting__InvalidDuration();
        if (cliff > duration) revert Vesting__InvalidDuration();

        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance < totalVesting + amount) revert Vesting__InsufficientBalance();

        scheduleId = scheduleCount[beneficiary];
        schedules[beneficiary][scheduleId] = VestingSchedule({
            totalAmount: amount,
            released: 0,
            startTime: startTime,
            cliff: cliff,
            duration: duration,
            revoked: false
        });

        scheduleCount[beneficiary] += 1;
        totalVesting += amount;

        emit VestingScheduleCreated(beneficiary, scheduleId, amount, startTime, cliff, duration);
    }

    /**
     * @notice Modify an existing schedule before any tokens have been released.
     */
    function modifyVestingSchedule(
        address beneficiary,
        uint256 scheduleId,
        uint256 newAmount,
        uint256 newCliff,
        uint256 newDuration
    ) external onlyOwner {
        VestingSchedule storage s = _getSchedule(beneficiary, scheduleId);
        if (s.revoked) revert Vesting__AlreadyRevoked();
        if (s.released > 0) revert Vesting__ReleasedAlready();
        if (newDuration == 0) revert Vesting__InvalidDuration();
        if (newCliff > newDuration) revert Vesting__InvalidDuration();

        totalVesting = totalVesting - s.totalAmount + newAmount;
        s.totalAmount = newAmount;
        s.cliff = newCliff;
        s.duration = newDuration;

        emit VestingScheduleModified(beneficiary, scheduleId, newAmount, newCliff, newDuration);
    }

    /**
     * @notice Revoke a schedule; unvested tokens return to owner.
     */
    function revokeVesting(address beneficiary, uint256 scheduleId) external onlyOwner nonReentrant {
        VestingSchedule storage s = _getSchedule(beneficiary, scheduleId);
        if (s.revoked) revert Vesting__AlreadyRevoked();

        uint256 vested = _vestedAmount(s);
        uint256 refund = s.totalAmount - vested;

        s.revoked = true;
        totalVesting -= refund;

        if (refund > 0) {
            token.safeTransfer(owner(), refund);
        }

        emit VestingRevoked(beneficiary, scheduleId, refund);
    }

    /**
     * @notice Withdraw unallocated tokens (contract balance minus totalVesting).
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 available = token.balanceOf(address(this)) - totalVesting;
        require(amount <= available, "Exceeds available balance");
        token.safeTransfer(owner(), amount);
    }

    // ============ BENEFICIARY FUNCTIONS ============

    /**
     * @notice Release vested tokens from a specific schedule.
     * @param scheduleId The schedule index to claim from
     */
    function release(uint256 scheduleId) external nonReentrant {
        VestingSchedule storage s = _getSchedule(msg.sender, scheduleId);
        if (s.revoked) revert Vesting__AlreadyRevoked();

        uint256 releasable = _releasableAmount(s);
        if (releasable == 0) revert Vesting__NothingToRelease();

        s.released += releasable;
        totalVesting -= releasable;

        token.safeTransfer(msg.sender, releasable);

        emit TokensReleased(msg.sender, scheduleId, releasable);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Releasable amount for a specific schedule.
     */
    function releasableAmount(address beneficiary, uint256 scheduleId) external view returns (uint256) {
        return _releasableAmount(schedules[beneficiary][scheduleId]);
    }

    /**
     * @notice Full details for a specific schedule — used by investor dashboard.
     */
    function getVestingSchedule(address beneficiary, uint256 scheduleId)
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
        VestingSchedule memory s = schedules[beneficiary][scheduleId];
        return (
            s.totalAmount,
            s.released,
            s.startTime,
            s.cliff,
            s.duration,
            s.revoked,
            _releasableAmount(s)
        );
    }

    /**
     * @notice All schedules for a beneficiary — used by investor dashboard to enumerate.
     */
    function getAllSchedules(address beneficiary)
        external
        view
        returns (VestingSchedule[] memory)
    {
        uint256 count = scheduleCount[beneficiary];
        VestingSchedule[] memory result = new VestingSchedule[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = schedules[beneficiary][i];
        }
        return result;
    }

    // ============ INTERNAL ============

    function _getSchedule(address beneficiary, uint256 scheduleId)
        internal
        view
        returns (VestingSchedule storage)
    {
        if (scheduleId >= scheduleCount[beneficiary]) revert Vesting__NoSchedule();
        return schedules[beneficiary][scheduleId];
    }

    function _releasableAmount(VestingSchedule memory s) private view returns (uint256) {
        if (s.totalAmount == 0 || s.revoked) return 0;
        return _vestedAmount(s) - s.released;
    }

    /**
     * @dev 0% claimable until cliff elapses.
     *      Linear vesting from cliff end to duration end: 0% → 100%.
     */
    function _vestedAmount(VestingSchedule memory s) private view returns (uint256) {
        if (s.totalAmount == 0) return 0;

        uint256 elapsed = block.timestamp - s.startTime;

        if (elapsed < s.cliff) return 0;
        if (elapsed >= s.duration) return s.totalAmount;

        uint256 vestingWindow = s.duration - s.cliff;
        uint256 elapsedAfterCliff = elapsed - s.cliff;
        return (s.totalAmount * elapsedAfterCliff) / vestingWindow;
    }
}
