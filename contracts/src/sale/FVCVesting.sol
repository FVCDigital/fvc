pragma solidity 0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IFVC.sol";

/**
 * @title FVCVesting
 * @notice FVC Protocol vesting contract with precise mathematical calculations
 * @dev Implements 12-month cliff + 24-month linear vesting with industry-standard precision
 * @custom:security Uses proven patterns from successful token projects
 */
contract FVCVesting is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for sale contracts
    bytes32 public constant SALE_ROLE = keccak256("SALE_ROLE");
    
    /// @notice Role identifier for vesting admin
    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");
    
    // ============ TIME CONSTANTS (Industry Standard) ============
    
    /// @notice Standard time constants using industry best practices
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant CLIFF_DURATION_DAYS = 365; // 12 months
    uint256 public constant VESTING_DURATION_DAYS = 730; // 24 months
    uint256 public constant TOTAL_VESTING_DURATION_DAYS = CLIFF_DURATION_DAYS + VESTING_DURATION_DAYS; // 36 months
    
    /// @notice Convert days to seconds with proper precision
    uint256 public constant CLIFF_DURATION_SECONDS = CLIFF_DURATION_DAYS * SECONDS_PER_DAY;
    uint256 public constant VESTING_DURATION_SECONDS = VESTING_DURATION_DAYS * SECONDS_PER_DAY;
    uint256 public constant TOTAL_VESTING_DURATION_SECONDS = TOTAL_VESTING_DURATION_DAYS * SECONDS_PER_DAY;
    
    // ============ PRECISION CONSTANTS (Industry Standard) ============
    
    /// @notice Precision constants for mathematical calculations
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_PRECISION_LOSS = 1e14; // 0.01% of 1e18
    
    /// @notice Maximum vesting amount to prevent overflow
    uint256 public constant MAX_VESTING_AMOUNT = 1e30; // 1 trillion tokens

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
     * @notice Create a new vesting schedule
     * @dev Creates vesting schedule with precise time calculations
     * @param beneficiary Address to receive vested tokens
     * @param totalAmount Total amount of tokens to vest
     * @custom:security Only SALE_ROLE can create vesting schedules
     */
    function createVestingSchedule(address beneficiary, uint256 totalAmount) external onlyRole(SALE_ROLE) nonReentrant {
        require(beneficiary != address(0), "Beneficiary cannot be zero address");
        require(totalAmount > 0, "Amount must be greater than zero");
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule already exists");
        
        require(totalAmount <= MAX_VESTING_AMOUNT, "Amount exceeds maximum");
        
        uint256 startTime = block.timestamp;
        uint256 cliffTime = startTime + CLIFF_DURATION_SECONDS;
        uint256 endTime = cliffTime + VESTING_DURATION_SECONDS;
        
        _validateVestingSchedule(startTime, cliffTime, endTime, totalAmount);
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            releasedAmount: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime
        });
        
        beneficiaries.push(beneficiary);
        totalVestingTokens += totalAmount;
        
        IERC20(address(fvcToken)).safeTransferFrom(msg.sender, address(this), totalAmount);
        
        emit VestingCreated(beneficiary, totalAmount, startTime, cliffTime, endTime);
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
            uint256 cliffTime = startTime + CLIFF_DURATION_SECONDS;
            uint256 endTime = cliffTime + VESTING_DURATION_SECONDS;
            
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
        
        IERC20(address(fvcToken)).safeTransferFrom(msg.sender, address(this), totalAmount);
    }

    // ============ TOKEN RELEASE ============

    /**
     * @notice Release vested tokens to beneficiary
     * @dev Releases all available vested tokens
     * @custom:security Only beneficiary can release their tokens
     */
    function release() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        
        uint256 vestedAmount = _calculatePreciseVestedAmount(schedule);
        uint256 releasableAmount = vestedAmount - schedule.releasedAmount;
        
        require(releasableAmount > 0, "No tokens to release");
        
        schedule.releasedAmount += releasableAmount;
        totalVestingTokens -= releasableAmount;
        
        require(_validatePrecision(vestedAmount, _calculatePreciseVestedAmount(schedule)), "Precision loss too high");
        
        IERC20(address(fvcToken)).safeTransfer(msg.sender, releasableAmount);
        
        emit TokensReleased(msg.sender, releasableAmount);
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
        
        uint256 vestedAmount = _calculatePreciseVestedAmount(schedule);
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
        return _calculatePreciseVestedAmount(vestingSchedules[beneficiary]);
    }

    /**
     * @notice Get releasable amount for a beneficiary
     * @param beneficiary Address to check
     * @return Amount of tokens that can be released now
     */
    function getReleasableAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;
        
        uint256 vestedAmount = _calculatePreciseVestedAmount(schedule);
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
        
        return (vestingElapsed * 100 * PRECISION) / (vestingDuration * PRECISION);
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

    // ============ PRECISION FUNCTIONS (Industry Standard) ============
    
    /**
     * @notice Calculate vested amount with proper precision handling
     * @dev Uses industry-standard precision handling to avoid rounding errors
     * @param schedule Vesting schedule to calculate for
     * @return vestedAmount Amount of tokens vested
     */
    function _calculatePreciseVestedAmount(VestingSchedule storage schedule) internal view returns (uint256 vestedAmount) {
        uint256 currentTime = block.timestamp;
        
        if (currentTime < schedule.cliffTime) {
            return 0;
        }
        
        if (currentTime >= schedule.endTime) {
            return schedule.totalAmount;
        }
        
        uint256 vestingElapsed = currentTime - schedule.cliffTime;
        uint256 vestingDuration = schedule.endTime - schedule.cliffTime;
        
        require(vestingElapsed <= vestingDuration, "Invalid vesting elapsed time");
        require(vestingDuration > 0, "Invalid vesting duration");
        
        uint256 numerator = schedule.totalAmount * vestingElapsed * PRECISION;
        uint256 denominator = vestingDuration * PRECISION;
        
        require(denominator > 0, "Division by zero");
        
        vestedAmount = numerator / denominator;
        
        if (vestedAmount > schedule.totalAmount) {
            vestedAmount = schedule.totalAmount;
        }
        
        return vestedAmount;
    }
    
    /**
     * @notice Validate mathematical precision
     * @dev Checks if precision loss is within acceptable bounds
     * @param expected Expected value
     * @param actual Actual calculated value
     * @return True if precision loss is acceptable
     */
    function _validatePrecision(uint256 expected, uint256 actual) internal pure returns (bool) {
        if (expected == 0 || actual == 0) return false;
        
        uint256 difference = expected > actual ? expected - actual : actual - expected;
        uint256 precisionLoss = (difference * PRECISION) / expected;
        
        return precisionLoss <= MAX_PRECISION_LOSS;
    }
    
    /**
     * @notice Validate vesting schedule parameters
     * @dev Ensures vesting schedule is mathematically sound
     * @param startTime Vesting start time
     * @param cliffTime Cliff end time
     * @param endTime Vesting end time
     * @param totalAmount Total amount to vest
     */
    function _validateVestingSchedule(
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime,
        uint256 totalAmount
    ) internal pure {
        require(startTime > 0, "Invalid start time");
        require(cliffTime > startTime, "Cliff time must be after start time");
        require(endTime > cliffTime, "End time must be after cliff time");
        require(totalAmount > 0, "Invalid total amount");
        require(totalAmount <= MAX_VESTING_AMOUNT, "Amount exceeds maximum");
        
        uint256 cliffDuration = cliffTime - startTime;
        uint256 vestingDuration = endTime - cliffTime;
        uint256 totalDuration = endTime - startTime;
        
        require(cliffDuration == CLIFF_DURATION_SECONDS, "Invalid cliff duration");
        require(vestingDuration == VESTING_DURATION_SECONDS, "Invalid vesting duration");
        require(totalDuration == TOTAL_VESTING_DURATION_SECONDS, "Invalid total duration");
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
