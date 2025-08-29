// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IBonding.sol";
import "../interfaces/IFVC.sol";

/**
 * @title Bonding
 * @notice FVC Protocol milestone-based private sale bonding contract
 * @dev Manages USDC bonding for FVC tokens with 4 milestone pricing tiers
 * @custom:security Uses OpenZeppelin access controls, reentrancy protection, and UUPS upgradeability
 */
contract Bonding is IBonding, Initializable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    
    /// @notice Role for managing bonding parameters
    bytes32 public constant BONDING_MANAGER_ROLE = keccak256("BONDING_MANAGER_ROLE");
    
    /// @notice Role for upgrading the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @notice Role for emergency operations
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Maximum wallet cap for private sale (2M USDC)
    uint256 public constant MAX_WALLET_CAP = 2_000_000 * 1e6; // 2M USDC in 6 decimals
    
    /// @notice Total private sale target (20M USDC)
    uint256 public constant TOTAL_SALE_TARGET = 20_000_000 * 1e6; // 20M USDC in 6 decimals
    
    /// @notice Total FVC tokens for private sale (225M FVC)
    uint256 public constant TOTAL_FVC_ALLOCATION = 225_000_000 * 1e18; // 225M FVC in 18 decimals
    
    // ============ TIME CONSTANTS (Industry Standard) ============
    
    /// @notice Standard time constants using industry best practices
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant DAYS_PER_YEAR = 365;
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
    uint256 public constant PRICE_PRECISION = 1e3; // Price stored as 25 = $0.025
    uint256 public constant USDC_PRECISION = 1e6;
    
    /// @notice Maximum precision loss tolerance (0.01%)
    uint256 public constant MAX_PRECISION_LOSS = 1e14; // 0.01% of 1e18

    // ============ CUSTOM ERRORS ============
    
    /// @notice Error thrown when bonding amount is zero
    error Bonding__AmountMustBeGreaterThanZero();
    
    /// @notice Error thrown when private sale is not active
    error Bonding__PrivateSaleNotActive();
    
    /// @notice Error thrown when milestone cap is exceeded
    error Bonding__MilestoneCapExceeded();
    
    /// @notice Error thrown when wallet cap is exceeded
    error Bonding__ExceedsWalletCap();
    
    /// @notice Error thrown when tokens are locked in vesting
    error Bonding__TokensLockedInVesting();
    
    /// @notice Error thrown when address is zero
    error Bonding__ZeroAddress();
    
    /// @notice Error thrown when private sale has ended
    error Bonding__PrivateSaleEnded();
    
    /// @notice Error thrown when milestone is invalid
    error Bonding__InvalidMilestone();
    
    /// @notice Error thrown when circuit breaker is active
    error Bonding__CircuitBreakerActive();
    
    /// @notice Error thrown when emergency shutdown is active
    error Bonding__EmergencyShutdownActive();
    
    /// @notice Error thrown when mathematical calculation fails
    error Bonding__CalculationError();
    
    /// @notice Error thrown when precision loss is too high
    error Bonding__PrecisionLossTooHigh();

    // ============ STATE VARIABLES ============

    /// @notice FVC token contract address
    IFVC public fvc;

    /// @notice USDC token contract address
    IERC20 public usdc;

    /// @notice Treasury address for USDC collection
    address public treasury;
    
    /// @notice Whether private sale is active
    bool public privateSaleActive;
    
    /// @notice Private sale start timestamp
    uint256 public saleStartTime;
    
    /// @notice Private sale end timestamp
    uint256 public saleEndTime;
    
    /// @notice Total USDC collected in private sale
    uint256 public totalBonded;
    
    /// @notice Total FVC tokens sold in private sale
    uint256 public totalFVCSold;
    
    /// @notice Current milestone index (0-3)
    uint256 public currentMilestone;
    
    /// @notice Mapping of user address to total USDC bonded
    mapping(address => uint256) public userBonded;
    
    /// @notice Mapping of user address to vesting schedule
    mapping(address => VestingSchedule) private _vestingSchedules;
    
    // ============ CIRCUIT BREAKER STATE (Industry Standard) ============
    
    /// @notice Circuit breaker active flag
    bool public circuitBreakerActive;
    
    /// @notice Emergency shutdown active flag
    bool public emergencyShutdownActive;
    
    /// @notice Maximum bonding per block (5M USDC for testing)
    uint256 public constant MAX_BONDING_PER_BLOCK = 5_000_000 * 1e6;
    
    /// @notice Current block bonding amount
    uint256 public bondingThisBlock;
    
    /// @notice Last block number for bonding tracking
    uint256 public lastBondingBlock;
    
    /// @notice Emergency withdrawal cooldown (24 hours)
    uint256 public constant EMERGENCY_COOLDOWN = 24 hours;
    
    /// @notice Last emergency operation timestamp
    uint256 public lastEmergencyOperation;
    
    /// @notice Get vesting schedule for a user (public view function)
    function vestingSchedules(address user) external view returns (VestingSchedule memory) {
        return _vestingSchedules[user];
    }

    // ============ MILESTONE STRUCTURE ============
    
    /// @notice Array of milestones (4 total)
    Milestone[] public milestones;
    
    // ============ EVENTS ============

    // Events are now defined in IBonding interface

    // ============ INITIALIZER ============

    /**
     * @notice Initialize the bonding contract
     * @dev Sets up initial state and grants roles
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     * @custom:security Only callable once during deployment
     */
    function initialize(address _fvc, address _usdc, address _treasury) external initializer {
        if (_fvc == address(0)) revert Bonding__ZeroAddress();
        if (_usdc == address(0)) revert Bonding__ZeroAddress();
        if (_treasury == address(0)) revert Bonding__ZeroAddress();
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BONDING_MANAGER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        // Initialize circuit breaker state
        circuitBreakerActive = false;
        emergencyShutdownActive = false;
        bondingThisBlock = 0;
        lastBondingBlock = block.number;
        lastEmergencyOperation = 0;
        
        // Initialize milestones based on Option B structure
        _initializeMilestones();
    }

    // ============ PRIVATE FUNCTIONS ============

    /**
     * @notice Initialize the 4 milestones for private sale
     * @dev Sets up the milestone structure with exact pricing and allocations
     */
    function _initializeMilestones() private {
        // Early Bird: 0-416,667 USDC → 16,666,667 FVC at $0.025
        milestones.push(Milestone({
            usdcThreshold: 416_667 * 1e6,           // 416,667 USDC
            price: 25,                              // $0.025 (25 = 0.025 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Early Bird",
            isActive: true
        }));

        // Early Adopters: 416,667-833,333 USDC → 16,666,667 FVC at $0.05
        milestones.push(Milestone({
            usdcThreshold: 833_333 * 1e6,           // 833,333 USDC
            price: 50,                              // $0.05 (50 = 0.05 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Early Adopters",
            isActive: true
        }));

        // Growth: 833,333-1,250,000 USDC → 16,666,667 FVC at $0.075
        milestones.push(Milestone({
            usdcThreshold: 1_250_000 * 1e6,        // 1,250,000 USDC
            price: 75,                              // $0.075 (75 = 0.075 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Growth",
            isActive: true
        }));

        // Final: 1,250,000-20,000,000 USDC → 175,000,000 FVC at $0.10
        milestones.push(Milestone({
            usdcThreshold: 20_000_000 * 1e6,       // 20,000,000 USDC
            price: 100,                             // $0.10 (100 = 0.10 * 1000)
            fvcAllocation: 175_000_000 * 1e18,     // 175,000,000 FVC
            name: "Final",
            isActive: true
        }));
    }

    /**
     * @notice Update current milestone based on total bonded amount
     * @dev Automatically advances milestone when threshold is reached
     */
    function _updateCurrentMilestone() private {
        uint256 _totalBonded = totalBonded;
        
        for (uint256 i = 0; i < milestones.length; i++) {
            if (_totalBonded < milestones[i].usdcThreshold) {
                if (currentMilestone != i) {
                    currentMilestone = i;
                    emit MilestoneReached(i, milestones[i].usdcThreshold, milestones[i].price);
                }
                break;
            }
        }
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Bond USDC for FVC tokens
     * @dev Main bonding function with milestone-based pricing and circuit breakers
     * @param usdcAmount Amount of USDC to bond (in 6 decimals)
     */
    function bond(uint256 usdcAmount) external nonReentrant whenCircuitBreakerNotActive whenNotEmergencyShutdown trackBondingPerBlock(usdcAmount) {
        // Enhanced input validation
        if (usdcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
        if (block.timestamp > saleEndTime) revert Bonding__PrivateSaleEnded();
        
        // Validate milestone state
        if (milestones.length == 0) revert Bonding__InvalidMilestone();
        if (currentMilestone >= milestones.length) revert Bonding__InvalidMilestone();
        
        // Check wallet cap
        if (userBonded[msg.sender] + usdcAmount > MAX_WALLET_CAP) {
            revert Bonding__ExceedsWalletCap();
        }
        
        // Get current milestone data with validation
        Milestone storage currentMilestoneData = milestones[currentMilestone];
        if (!currentMilestoneData.isActive) revert Bonding__InvalidMilestone();
        if (currentMilestoneData.price == 0) revert Bonding__CalculationError();
        if (currentMilestoneData.fvcAllocation == 0) revert Bonding__CalculationError();
        
        // Check if milestone cap would be exceeded
        uint256 milestoneProgress = totalBonded - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        uint256 milestoneRemaining = currentMilestoneData.usdcThreshold - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        
        if (milestoneProgress + usdcAmount > milestoneRemaining) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        // Calculate FVC amount using precise calculation
        uint256 fvcAmount = _calculatePreciseFVCAmount(usdcAmount, currentMilestoneData.price);
        
        // Validate FVC calculation
        if (fvcAmount == 0) revert Bonding__CalculationError();
        
        // Check if enough FVC is available for this milestone
        uint256 milestoneFVCSold = _getMilestoneFVCSold(currentMilestone);
        if (milestoneFVCSold + fvcAmount > currentMilestoneData.fvcAllocation) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        // Update state BEFORE external calls (reentrancy protection)
        totalBonded = totalBonded + usdcAmount;
        totalFVCSold = totalFVCSold + fvcAmount;
        userBonded[msg.sender] = userBonded[msg.sender] + usdcAmount;
        
        // Create vesting schedule using precise time calculations
        (uint256 cliffDuration, uint256 vestingDuration, uint256 totalDuration) = _calculateVestingDurations();
        uint256 startTime = block.timestamp;
        uint256 cliffEndTime = startTime + cliffDuration;
        uint256 endTime = cliffEndTime + vestingDuration;
        
        // Validate vesting schedule
        require(endTime > startTime, "Invalid vesting schedule");
        require(endTime - startTime == totalDuration, "Vesting duration mismatch");
        
        _vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        // Update current milestone if needed
        _updateCurrentMilestone();
        
        // External calls AFTER state updates (reentrancy protection)
        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount); // USDC goes to treasury
        fvc.mint(msg.sender, fvcAmount);
        
        emit Bonded(msg.sender, usdcAmount, fvcAmount, currentMilestone);
        emit VestingScheduleCreated(msg.sender, fvcAmount, startTime, endTime);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current milestone price per FVC
     * @dev Returns price in USDC (6 decimals) per FVC
     * @return Current price per FVC
     */
    function getCurrentPrice() external view returns (uint256) {
        if (milestones.length == 0) return 0;
        return milestones[currentMilestone].price;
    }

    /**
     * @notice Get current milestone information
     * @dev Returns complete milestone data for current milestone
     * @return Current milestone structure
     */
    function getCurrentMilestone() external view returns (Milestone memory) {
        if (milestones.length == 0) revert Bonding__InvalidMilestone();
        return milestones[currentMilestone];
    }

    /**
     * @notice Get all milestones
     * @dev Returns array of all milestone structures
     * @return Array of milestone structures
     */
    function getAllMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }

    /**
     * @notice Get next milestone information
     * @dev Returns next milestone if available
     * @return Next milestone structure or empty if at last milestone
     */
    function getNextMilestone() external view returns (Milestone memory) {
        if (currentMilestone >= milestones.length - 1) {
            // Return empty milestone if at last milestone
            return Milestone({
                usdcThreshold: 0,
                price: 0,
                fvcAllocation: 0,
                name: "",
                isActive: false
            });
        }
        return milestones[currentMilestone + 1];
    }

    /**
     * @notice Calculate FVC amount for given USDC amount at current price
     * @dev Uses current milestone price
     * @param usdcAmount Amount of USDC (in 6 decimals)
     * @return fvcAmount Amount of FVC tokens (in 18 decimals)
     */
    function calculateFVCAmount(uint256 usdcAmount) external view returns (uint256 fvcAmount) {
        if (milestones.length == 0) return 0;
        uint256 currentPrice = milestones[currentMilestone].price;
        if (currentPrice == 0) return 0;
        
        fvcAmount = _calculatePreciseFVCAmount(usdcAmount, currentPrice);
        return fvcAmount;
    }

    /**
     * @notice Get remaining FVC tokens available for current milestone
     * @dev Returns remaining FVC for current milestone
     * @return Remaining FVC tokens available
     */
    function getRemainingFVC() external view returns (uint256) {
        if (milestones.length == 0) return 0;
        Milestone storage currentMilestoneData = milestones[currentMilestone];
        uint256 milestoneFVCSold = _getMilestoneFVCSold(currentMilestone);
        return currentMilestoneData.fvcAllocation - milestoneFVCSold;
    }

    /**
     * @notice Get vesting schedule for a specific user
     * @dev Returns complete vesting data structure
     * @param user Address of the user
     * @return Vesting schedule structure
     */
    function getVestingSchedule(address user) external view returns (VestingSchedule memory) {
        return _vestingSchedules[user];
    }

    /**
     * @notice Check if user's tokens are locked in vesting
     * @dev Used by FVC token to prevent transfers of locked tokens
     * @param user Address of the user to check
     * @return True if tokens are locked, false if unlocked
     */
    function isLocked(address user) external view returns (bool) {
        VestingSchedule storage schedule = _vestingSchedules[user];
        if (schedule.amount == 0) return false;
        
        uint256 currentTime = block.timestamp;
        uint256 cliffEndTime = schedule.startTime + CLIFF_DURATION_SECONDS; // 12-month cliff
        
        // During cliff period, all tokens are locked
        if (currentTime < cliffEndTime) return true;
        
        // After cliff, calculate vested amount
        uint256 vestedAmount = _calculateVestedAmount(schedule);
        return schedule.amount > vestedAmount;
    }

    /**
     * @notice Get vested FVC amount for a user
     * @dev Calculates how many FVC tokens are vested and available
     * @param user Address of the user
     * @return vestedAmount Amount of FVC tokens vested
     * @return totalAmount Total amount of FVC tokens in vesting
     */
    function getVestedAmount(address user) external view returns (uint256 vestedAmount, uint256 totalAmount) {
        VestingSchedule storage schedule = _vestingSchedules[user];
        if (schedule.amount == 0) return (0, 0);
        
        totalAmount = schedule.amount;
        vestedAmount = _calculateVestedAmount(schedule);
        return (vestedAmount, totalAmount);
    }

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
    ) {
        progress = (totalBonded * 10000) / TOTAL_SALE_TARGET; // 4 decimal precision
        currentMilestoneIndex = currentMilestone;
        totalBondedAmount = totalBonded;
        totalFVCSoldAmount = totalFVCSold;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Calculate vested FVC amount for a vesting schedule
     * @dev Implements 12-month cliff + 24-month linear vesting
     * @param schedule Vesting schedule structure
     * @return vestedAmount Amount of FVC tokens vested
     */
    function _calculateVestedAmount(VestingSchedule storage schedule) internal view returns (uint256 vestedAmount) {
        uint256 currentTime = block.timestamp;
        uint256 cliffEndTime = schedule.startTime + CLIFF_DURATION_SECONDS; // 12-month cliff
        uint256 vestingEndTime = cliffEndTime + VESTING_DURATION_SECONDS;    // 24-month linear after cliff
        
        // During cliff period, no tokens are vested
        if (currentTime < cliffEndTime) {
            return 0;
        }
        
        // After cliff, linear vesting over 24 months
        if (currentTime >= vestingEndTime) {
            return schedule.amount; // Fully vested
        }
        
        // Calculate linear vesting progress
        uint256 vestingProgress = currentTime - cliffEndTime;
        uint256 vestingDuration = VESTING_DURATION_SECONDS; // 24 months
        
        vestedAmount = (schedule.amount * vestingProgress) / vestingDuration;
        return vestedAmount;
    }

    /**
     * @notice Get FVC tokens sold for a specific milestone
     * @dev Calculates FVC sold within milestone bounds
     * @param milestoneIndex Index of the milestone
     * @return fvcSold FVC tokens sold in this milestone
     */
    function _getMilestoneFVCSold(uint256 milestoneIndex) internal view returns (uint256 fvcSold) {
        if (milestoneIndex >= milestones.length) return 0;
        
        // This is a simplified calculation - in practice, you'd track per-milestone sales
        // For now, we'll use the total FVC sold as an approximation
        return totalFVCSold;
    }

    // ============ MODIFIERS ============
    
    /// @notice Modifier to check if circuit breaker is not active
    modifier whenCircuitBreakerNotActive() {
        require(!circuitBreakerActive, "Circuit breaker active");
        _;
    }
    
    /// @notice Modifier to check if emergency shutdown is not active
    modifier whenNotEmergencyShutdown() {
        require(!emergencyShutdownActive, "Emergency shutdown active");
        _;
    }
    
    /// @notice Modifier to check if emergency cooldown has passed
    modifier emergencyCooldownPassed() {
        require(block.timestamp >= lastEmergencyOperation + EMERGENCY_COOLDOWN, "Emergency cooldown not passed");
        _;
    }
    
    /// @notice Modifier to track bonding per block
    modifier trackBondingPerBlock(uint256 usdcAmount) {
        if (block.number > lastBondingBlock) {
            bondingThisBlock = 0;
            lastBondingBlock = block.number;
        }
        require(bondingThisBlock + usdcAmount <= MAX_BONDING_PER_BLOCK, "Block bonding limit exceeded");
        _;
        bondingThisBlock += usdcAmount;
    }

    // ============ PRECISION FUNCTIONS (Industry Standard) ============
    
    /**
     * @notice Calculate FVC amount with proper precision handling
     * @dev Uses industry-standard precision handling to avoid rounding errors
     * @param usdcAmount Amount of USDC (in 6 decimals)
     * @param price Price per FVC (in 3 decimals)
     * @return fvcAmount Amount of FVC tokens (in 18 decimals)
     */
    function _calculatePreciseFVCAmount(uint256 usdcAmount, uint256 price) internal pure returns (uint256 fvcAmount) {
        // Validate inputs
        if (usdcAmount == 0 || price == 0) revert Bonding__CalculationError();
        
        // Use the original formula: (usdcAmount * PRECISION) / (price * PRICE_PRECISION)
        // This matches the original calculation that was working
        uint256 numerator = usdcAmount * PRECISION;
        uint256 denominator = price * PRICE_PRECISION;
        
        // Check for division by zero
        if (denominator == 0) revert Bonding__CalculationError();
        
        // Calculate with precision
        fvcAmount = numerator / denominator;
        
        // Validate result
        if (fvcAmount == 0) revert Bonding__CalculationError();
        
        return fvcAmount;
    }
    
    /**
     * @notice Calculate vesting duration with proper precision
     * @dev Ensures consistent time calculations across the contract
     * @return cliffDuration Cliff duration in seconds
     * @return vestingDuration Vesting duration in seconds
     * @return totalDuration Total duration in seconds
     */
    function _calculateVestingDurations() internal pure returns (
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 totalDuration
    ) {
        cliffDuration = CLIFF_DURATION_SECONDS;
        vestingDuration = VESTING_DURATION_SECONDS;
        totalDuration = TOTAL_VESTING_DURATION_SECONDS;
        
        // Validate calculations
        require(cliffDuration > 0, "Invalid cliff duration");
        require(vestingDuration > 0, "Invalid vesting duration");
        require(totalDuration == cliffDuration + vestingDuration, "Invalid total duration");
        
        return (cliffDuration, vestingDuration, totalDuration);
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

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Start the private sale
     * @dev Only bonding manager can start the sale
     * @param duration Duration of the sale in seconds
     */
    function startPrivateSale(uint256 duration) external onlyRole(BONDING_MANAGER_ROLE) {
        if (privateSaleActive) revert Bonding__PrivateSaleNotActive();
        
        privateSaleActive = true;
        saleStartTime = block.timestamp;
        saleEndTime = block.timestamp + duration;
        
        emit PrivateSaleStarted(saleStartTime, saleEndTime);
    }

    /**
     * @notice End the private sale
     * @dev Only bonding manager can end the sale
     */
    function endPrivateSale() external onlyRole(BONDING_MANAGER_ROLE) {
        if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
        
        privateSaleActive = false;
        
        emit PrivateSaleEnded(totalBonded, totalFVCSold);
    }

    /**
     * @notice Allocate FVC tokens to milestones
     * @dev Only bonding manager can allocate FVC tokens
     * @param milestoneIndex Index of the milestone to allocate to
     * @param amount Amount of FVC tokens to allocate
     */
    function allocateFVCToMilestone(uint256 milestoneIndex, uint256 amount) external onlyRole(BONDING_MANAGER_ROLE) {
        if (milestoneIndex >= milestones.length) revert Bonding__InvalidMilestone();
        if (amount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        
        milestones[milestoneIndex].fvcAllocation = amount;
        
        emit FVCAllocated(milestoneIndex, amount);
    }

    // ============ EMERGENCY FUNCTIONS (Industry Standard) ============
    
    /**
     * @notice Activate circuit breaker
     * @dev Emergency function to halt all bonding operations
     * @custom:security Only EMERGENCY_ROLE can activate circuit breaker
     */
    function activateCircuitBreaker() external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerActive = true;
        lastEmergencyOperation = block.timestamp;
        emit CircuitBreakerActivated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Deactivate circuit breaker
     * @dev Emergency function to resume bonding operations
     * @custom:security Only EMERGENCY_ROLE can deactivate circuit breaker
     */
    function deactivateCircuitBreaker() external onlyRole(EMERGENCY_ROLE) emergencyCooldownPassed {
        circuitBreakerActive = false;
        lastEmergencyOperation = block.timestamp;
        emit CircuitBreakerDeactivated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Trigger emergency shutdown
     * @dev Halts all operations and allows emergency withdrawal
     * @custom:security Only EMERGENCY_ROLE can trigger emergency shutdown
     */
    function triggerEmergencyShutdown() external onlyRole(EMERGENCY_ROLE) emergencyCooldownPassed {
        emergencyShutdownActive = true;
        privateSaleActive = false;
        lastEmergencyOperation = block.timestamp;
        emit EmergencyShutdown(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Emergency withdrawal for users
     * @dev Allows users to withdraw their USDC in emergency situations
     * @custom:security Only available during emergency shutdown
     */
    function emergencyWithdraw() external whenNotEmergencyShutdown {
        require(emergencyShutdownActive, "Emergency withdrawal not available");
        
        uint256 userBondedAmount = userBonded[msg.sender];
        require(userBondedAmount > 0, "No USDC bonded");
        
        // Calculate proportional refund based on treasury balance
        uint256 treasuryBalance = usdc.balanceOf(treasury);
        uint256 refundAmount = (userBondedAmount * treasuryBalance) / totalBonded;
        
        // Ensure refund doesn't exceed user's bonded amount
        refundAmount = refundAmount > userBondedAmount ? userBondedAmount : refundAmount;
        
        // Update state
        userBonded[msg.sender] = 0;
        totalBonded = totalBonded - userBondedAmount;
        
        // Transfer refund
        usdc.safeTransferFrom(treasury, msg.sender, refundAmount);
        
        emit EmergencyWithdrawal(msg.sender, refundAmount, block.timestamp);
    }
    
    /**
     * @notice Get emergency status
     * @dev Returns current emergency state
     * @return circuitBreaker Circuit breaker status
     * @return emergencyShutdown Emergency shutdown status
     * @return lastEmergencyOperation Last emergency operation timestamp
     */
    function getEmergencyStatus() external view returns (
        bool circuitBreaker,
        bool emergencyShutdown,
        uint256 lastEmergencyOperation
    ) {
        return (circuitBreakerActive, emergencyShutdownActive, lastEmergencyOperation);
    }
    
    // ============ EVENTS ============
    
    /// @notice Emitted when circuit breaker is activated
    event CircuitBreakerActivated(address indexed guardian, uint256 timestamp);
    
    /// @notice Emitted when circuit breaker is deactivated
    event CircuitBreakerDeactivated(address indexed guardian, uint256 timestamp);
    
    /// @notice Emitted when emergency shutdown is triggered
    event EmergencyShutdown(address indexed guardian, uint256 timestamp);
    
    /// @notice Emitted when emergency withdrawal occurs
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 timestamp);

    // ============ UUPS UPGRADE FUNCTIONS ============

    /**
     * @notice Upgrade the contract implementation
     * @dev Only upgrader role can upgrade
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // ============ LEGACY INTERFACE COMPLIANCE ============
    
    // These functions are kept for interface compliance but may not be used in the new system
    
    function allocateFVC(uint256) external pure {
        revert("Use allocateFVCToMilestone instead");
    }
    
    function calculateUSDCAmount(uint256) external pure returns (uint256) {
        revert("Use calculateFVCAmount instead");
    }
    
    function getCurrentDiscount() external pure returns (uint256) {
        revert("Use getCurrentPrice instead");
    }
    
    function getCurrentRound() external pure returns (uint256) {
        revert("Use getCurrentMilestone instead");
    }
    
    function completeCurrentRound() external pure {
        revert("Use endPrivateSale instead");
    }
    
    function startNextRound() external pure {
        revert("Use startPrivateSale instead");
    }
    
    function markPublicLaunch() external pure {
        revert("Use endPrivateSale instead");
    }
}
