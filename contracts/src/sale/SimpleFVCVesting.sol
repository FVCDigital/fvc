// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IFVC.sol";

/**
 * @title SimpleFVCVesting
 * @notice Simple, audited-pattern vesting contract for FVC tokens
 * @dev Based on OpenZeppelin patterns but simplified for production use
 * @custom:security Uses proven patterns from successful token projects
 */
contract SimpleFVCVesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    /// @notice Role for sale contracts that can create vesting schedules
    bytes32 public constant SALE_ROLE = keccak256("SALE_ROLE");
    
    /// @notice Role for vesting admin
    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");
    
    /// @notice Cliff duration (6 months)
    uint256 public constant CLIFF_DURATION = 180 days;
    
    /// @notice Vesting duration after cliff (12 months)
    uint256 public constant VESTING_DURATION = 365 days;

    // ============ STRUCTS ============

    /**
     * @notice Vesting schedule for a beneficiary
     * @param totalAmount Total FVC tokens allocated
     * @param releasedAmount Amount already released
     * @param startTime When vesting starts (cliff begins)
     * @param cliffTime When cliff ends and linear vesting begins
     * @param endTime When vesting is fully complete
     */
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 cliffTime;
        uint256 endTime;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice FVC token contract
    IFVC public immutable fvcToken;
    
    /// @notice Mapping of beneficiary to their vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;
    
    /// @notice Array of all beneficiaries for enumeration
    address[] public beneficiaries;
    
    /// @notice Total tokens currently vesting
    uint256 public totalVestingTokens;

    // ============ EVENTS ============
    
    /// @notice Emitted when a vesting schedule is created
    event VestingCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime
    );
    
    /// @notice Emitted when tokens are released
    event TokensReleased(address indexed beneficiary, uint256 amount);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the vesting contract
     * @param _fvcToken FVC token contract address
     * @param _admin Vesting admin address
     */
    constructor(address _fvcToken, address _admin) {
        fvcToken = IFVC(_fvcToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VESTING_ADMIN_ROLE, _admin);
    }

    // ============ VESTING CREATION ============

    /**
     * @notice Create a vesting schedule for a beneficiary
     * @dev Called by sale contracts during token purchase
     * @param beneficiary Address that will receive vested tokens
     * @param amount Amount of FVC tokens to vest
     * @custom:security Only SALE_ROLE can create vesting schedules
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount
    ) external onlyRole(SALE_ROLE) nonReentrant {
        require(beneficiary != address(0), "Zero beneficiary address");
        require(amount > 0, "Zero vesting amount");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule exists");
        
        uint256 startTime = block.timestamp;
        uint256 cliffTime = startTime + CLIFF_DURATION;
        uint256 endTime = cliffTime + VESTING_DURATION;
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime
        });
        
        beneficiaries.push(beneficiary);
        totalVestingTokens += amount;
        
        // Transfer tokens to this contract
        IERC20(address(fvcToken)).safeTransferFrom(msg.sender, address(this), amount);
        
        emit VestingCreated(beneficiary, amount, startTime, cliffTime, endTime);
    }

    /**
     * @notice Create multiple vesting schedules in batch
     * @dev Gas-efficient batch creation for multiple investors
     * @param _beneficiaries Array of beneficiary addresses
     * @param amounts Array of FVC token amounts
     * @custom:security Only SALE_ROLE can create vesting schedules
     */
    function createVestingSchedulesBatch(
        address[] calldata _beneficiaries,
        uint256[] calldata amounts
    ) external onlyRole(SALE_ROLE) nonReentrant {
        require(_beneficiaries.length == amounts.length, "Array length mismatch");
        require(_beneficiaries.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            address beneficiary = _beneficiaries[i];
            uint256 amount = amounts[i];
            
            require(beneficiary != address(0), "Zero beneficiary address");
            require(amount > 0, "Zero vesting amount");
            require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule exists");
            
            uint256 startTime = block.timestamp;
            uint256 cliffTime = startTime + CLIFF_DURATION;
            uint256 endTime = cliffTime + VESTING_DURATION;
            
            vestingSchedules[beneficiary] = VestingSchedule({
                totalAmount: amount,
                releasedAmount: 0,
                startTime: startTime,
                cliffTime: cliffTime,
                endTime: endTime
            });
            
            beneficiaries.push(beneficiary);
            totalAmount += amount;
            
            emit VestingCreated(beneficiary, amount, startTime, cliffTime, endTime);
        }
        
        totalVestingTokens += totalAmount;
        
        // Transfer total tokens to this contract
        IERC20(address(fvcToken)).safeTransferFrom(msg.sender, address(this), totalAmount);
    }

    // ============ TOKEN RELEASE ============

    /**
     * @notice Release vested tokens to beneficiary
     * @dev Can be called by anyone for any beneficiary
     */
    function release() external nonReentrant {
        _release(msg.sender);
    }

    /**
     * @notice Release vested tokens for a specific beneficiary
     * @dev Can be called by anyone for any beneficiary
     * @param beneficiary Address to release tokens for
     */
    function releaseFor(address beneficiary) external nonReentrant {
        _release(beneficiary);
    }

    /**
     * @notice Internal function to release vested tokens
     * @param beneficiary Address to release tokens for
     */
    function _release(address beneficiary) internal {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        
        uint256 vestedAmount = _calculateVestedAmount(beneficiary);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;
        
        require(releasableAmount > 0, "No tokens to release");
        
        schedule.releasedAmount += releasableAmount;
        totalVestingTokens -= releasableAmount;
        
        IERC20(address(fvcToken)).safeTransfer(beneficiary, releasableAmount);
        
        emit TokensReleased(beneficiary, releasableAmount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Calculate vested amount for a beneficiary
     * @param beneficiary Address to check
     * @return Amount of tokens vested
     */
    function calculateVestedAmount(address beneficiary) external view returns (uint256) {
        return _calculateVestedAmount(beneficiary);
    }

    /**
     * @notice Get releasable amount for a beneficiary
     * @param beneficiary Address to check
     * @return Amount of tokens that can be released now
     */
    function getReleasableAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;
        
        uint256 vestedAmount = _calculateVestedAmount(beneficiary);
        return vestedAmount - schedule.releasedAmount;
    }

    /**
     * @notice Get vesting progress for a beneficiary
     * @param beneficiary Address to check
     * @return Progress percentage (0-100)
     */
    function getVestingProgress(address beneficiary) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;
        
        if (block.timestamp < schedule.cliffTime) return 0;
        if (block.timestamp >= schedule.endTime) return 100;
        
        uint256 vestingElapsed = block.timestamp - schedule.cliffTime;
        uint256 vestingDuration = schedule.endTime - schedule.cliffTime;
        
        return (vestingElapsed * 100) / vestingDuration;
    }

    /**
     * @notice Check if cliff has passed for a beneficiary
     * @param beneficiary Address to check
     * @return True if cliff period is over
     */
    function isCliffPassed(address beneficiary) external view returns (bool) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        return block.timestamp >= schedule.cliffTime;
    }

    /**
     * @notice Get number of beneficiaries
     * @return Total number of beneficiaries
     */
    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    /**
     * @notice Get beneficiary at index
     * @param index Index in beneficiaries array
     * @return Beneficiary address
     */
    function getBeneficiaryAt(uint256 index) external view returns (address) {
        require(index < beneficiaries.length, "Index out of bounds");
        return beneficiaries[index];
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Calculate vested amount using linear vesting formula
     * @param beneficiary Address to calculate for
     * @return Amount of tokens vested
     */
    function _calculateVestedAmount(address beneficiary) internal view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        
        if (block.timestamp < schedule.cliffTime) {
            return 0;
        }
        
        if (block.timestamp >= schedule.endTime) {
            return schedule.totalAmount;
        }
        
        // Linear vesting after cliff
        uint256 vestingElapsed = block.timestamp - schedule.cliffTime;
        uint256 vestingDuration = schedule.endTime - schedule.cliffTime;
        
        return (schedule.totalAmount * vestingElapsed) / vestingDuration;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Grant SALE_ROLE to a contract
     * @param saleContract Address of the sale contract
     * @custom:security Only VESTING_ADMIN_ROLE can grant sale roles
     */
    function grantSaleRole(address saleContract) external onlyRole(VESTING_ADMIN_ROLE) {
        _grantRole(SALE_ROLE, saleContract);
    }

    /**
     * @notice Revoke SALE_ROLE from a contract
     * @param saleContract Address of the sale contract
     * @custom:security Only VESTING_ADMIN_ROLE can revoke sale roles
     */
    function revokeSaleRole(address saleContract) external onlyRole(VESTING_ADMIN_ROLE) {
        _revokeRole(SALE_ROLE, saleContract);
    }
}
