pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IBonding.sol";
import "../interfaces/IFVC.sol";
import "../interfaces/AggregatorV3Interface.sol";

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
    
    /// @notice ETH precision (18 decimals)
    uint256 public constant ETH_PRECISION = 1e18;
    
    /// @notice Chainlink ETH/USD price feed decimals (usually 8)
    uint256 public constant CHAINLINK_DECIMALS = 8;

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
    
    /// @notice Error thrown when ETH amount is insufficient
    error Bonding__InsufficientETH();
    
    /// @notice Error thrown when price feed is invalid
    error Bonding__InvalidPriceFeed();

    // ============ STATE VARIABLES ============

    /// @notice FVC token contract address
    IFVC public fvc;

    /// @notice USDC token contract address
    IERC20 public usdc;

    /// @notice Treasury address for USDC collection
    address public treasury;
    
    /// @notice Chainlink ETH/USD price feed address
    AggregatorV3Interface public ethUsdPriceFeed;
    
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
    
    /// @notice Mapping of user address to array of bond transactions
    mapping(address => BondTransaction[]) private _userBonds;
    
    /// @notice Mapping of user address to total bond count
    mapping(address => uint256) private _userBondCount;
    
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


    // ============ INITIALIZER ============

    /**
     * @notice Initialize the bonding contract
     * @dev Sets up initial state and grants roles
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     * @param _ethUsdPriceFeed Chainlink ETH/USD price feed address
     * @custom:security Only callable once during deployment
     */
    function initialize(address _fvc, address _usdc, address _treasury, address _ethUsdPriceFeed) external initializer {
        if (_fvc == address(0)) revert Bonding__ZeroAddress();
        if (_usdc == address(0)) revert Bonding__ZeroAddress();
        if (_treasury == address(0)) revert Bonding__ZeroAddress();
        if (_ethUsdPriceFeed == address(0)) revert Bonding__ZeroAddress();
        
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BONDING_MANAGER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        circuitBreakerActive = false;
        emergencyShutdownActive = false;
        bondingThisBlock = 0;
        lastBondingBlock = block.number;
        lastEmergencyOperation = 0;
        
        _initializeMilestones();
    }

    // ============ PRIVATE FUNCTIONS ============

    /**
     * @notice Initialize the 4 milestones for private sale
     * @dev Sets up the milestone structure with exact pricing and allocations
     */
    function _initializeMilestones() private {
        milestones.push(Milestone({
            usdcThreshold: 416_667 * 1e6,           // 416,667 USDC
            price: 25,                              // $0.025 (25 = 0.025 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Early Bird",
            isActive: true
        }));

        milestones.push(Milestone({
            usdcThreshold: 833_333 * 1e6,           // 833,333 USDC
            price: 50,                              // $0.05 (50 = 0.05 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Early Adopters",
            isActive: true
        }));

        milestones.push(Milestone({
            usdcThreshold: 1_250_000 * 1e6,        // 1,250,000 USDC
            price: 75,                              // $0.075 (75 = 0.075 * 1000)
            fvcAllocation: 16_666_667 * 1e18,      // 16,666,667 FVC
            name: "Growth",
            isActive: true
        }));

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
        if (usdcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
        if (block.timestamp > saleEndTime) revert Bonding__PrivateSaleEnded();
        
        if (milestones.length == 0) revert Bonding__InvalidMilestone();
        if (currentMilestone >= milestones.length) revert Bonding__InvalidMilestone();
        
        if (userBonded[msg.sender] + usdcAmount > MAX_WALLET_CAP) {
            revert Bonding__ExceedsWalletCap();
        }
        
        Milestone storage currentMilestoneData = milestones[currentMilestone];
        if (!currentMilestoneData.isActive) revert Bonding__InvalidMilestone();
        if (currentMilestoneData.price == 0) revert Bonding__CalculationError();
        if (currentMilestoneData.fvcAllocation == 0) revert Bonding__CalculationError();
        
        uint256 milestoneProgress = totalBonded - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        uint256 milestoneRemaining = currentMilestoneData.usdcThreshold - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        
        if (milestoneProgress + usdcAmount > milestoneRemaining) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        uint256 fvcAmount = _calculatePreciseFVCAmount(usdcAmount, currentMilestoneData.price);
        
        if (fvcAmount == 0) revert Bonding__CalculationError();
        
        uint256 milestoneFVCSold = _getMilestoneFVCSold(currentMilestone);
        if (milestoneFVCSold + fvcAmount > currentMilestoneData.fvcAllocation) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        totalBonded = totalBonded + usdcAmount;
        totalFVCSold = totalFVCSold + fvcAmount;
        userBonded[msg.sender] = userBonded[msg.sender] + usdcAmount;
        
        (uint256 cliffDuration, uint256 vestingDuration, uint256 totalDuration) = _calculateVestingDurations();
        uint256 startTime = block.timestamp;
        uint256 cliffEndTime = startTime + cliffDuration;
        uint256 endTime = cliffEndTime + vestingDuration;
        
        require(endTime > startTime, "Invalid vesting schedule");
        require(endTime - startTime == totalDuration, "Vesting duration mismatch");
        
        uint256 bondId = _userBondCount[msg.sender];
        _userBonds[msg.sender].push(BondTransaction({
            bondId: bondId,
            usdcAmount: usdcAmount,
            fvcAmount: fvcAmount,
            timestamp: startTime,
            milestone: currentMilestone,
            claimedAmount: 0,
            isActive: true
        }));
        
        _userBondCount[msg.sender] = bondId + 1;
        
        _vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        _updateCurrentMilestone();
        
        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount); // USDC goes to treasury
        fvc.mint(msg.sender, fvcAmount);
        
        emit Bonded(msg.sender, usdcAmount, fvcAmount, currentMilestone);
        emit VestingScheduleCreated(msg.sender, fvcAmount, startTime, endTime);
        emit BondTransactionCreated(msg.sender, bondId, usdcAmount, fvcAmount, currentMilestone, startTime);
    }

    /**
     * @notice Bond ETH for FVC tokens
     * @dev Converts ETH to USDC equivalent using Chainlink price feed
     * @param fvcAmount Amount of FVC tokens to purchase (in 18 decimals)
     */
    function bondWithETH(uint256 fvcAmount) external payable nonReentrant whenCircuitBreakerNotActive whenNotEmergencyShutdown {
        if (fvcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        if (msg.value == 0) revert Bonding__AmountMustBeGreaterThanZero();
        if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
        if (block.timestamp > saleEndTime) revert Bonding__PrivateSaleEnded();
        
        if (milestones.length == 0) revert Bonding__InvalidMilestone();
        if (currentMilestone >= milestones.length) revert Bonding__InvalidMilestone();
        
        Milestone storage currentMilestoneData = milestones[currentMilestone];
        if (!currentMilestoneData.isActive) revert Bonding__InvalidMilestone();
        if (currentMilestoneData.price == 0) revert Bonding__CalculationError();
        if (currentMilestoneData.fvcAllocation == 0) revert Bonding__CalculationError();
        
        uint256 ethUsdPrice = _getEthUsdPrice();
        if (ethUsdPrice == 0) revert Bonding__InvalidPriceFeed();
        
        uint256 requiredUsdcAmount = _calculatePreciseUSDCAmount(fvcAmount, currentMilestoneData.price);
        
        uint256 requiredWei = _calculateRequiredWei(requiredUsdcAmount, ethUsdPrice);
        
        if (msg.value < requiredWei) revert Bonding__InsufficientETH();
        
        uint256 ethUsdEquivalent = (msg.value * ethUsdPrice) / ETH_PRECISION;
        if (userBonded[msg.sender] + ethUsdEquivalent > MAX_WALLET_CAP) {
            revert Bonding__ExceedsWalletCap();
        }
        
        uint256 milestoneProgress = totalBonded - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        uint256 milestoneRemaining = currentMilestoneData.usdcThreshold - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        
        if (milestoneProgress + ethUsdEquivalent > milestoneRemaining) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        uint256 milestoneFVCSold = _getMilestoneFVCSold(currentMilestone);
        if (milestoneFVCSold + fvcAmount > currentMilestoneData.fvcAllocation) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        totalBonded = totalBonded + ethUsdEquivalent;
        totalFVCSold = totalFVCSold + fvcAmount;
        userBonded[msg.sender] = userBonded[msg.sender] + ethUsdEquivalent;
        
        (uint256 cliffDuration, uint256 vestingDuration, uint256 totalDuration) = _calculateVestingDurations();
        uint256 startTime = block.timestamp;
        uint256 cliffEndTime = startTime + cliffDuration;
        uint256 endTime = cliffEndTime + vestingDuration;
        
        require(endTime > startTime, "Invalid vesting schedule");
        require(endTime - startTime == totalDuration, "Vesting duration mismatch");
        
        uint256 bondId = _userBondCount[msg.sender];
        _userBonds[msg.sender].push(BondTransaction({
            bondId: bondId,
            usdcAmount: ethUsdEquivalent, // Store as USDC equivalent
            fvcAmount: fvcAmount,
            timestamp: startTime,
            milestone: currentMilestone,
            claimedAmount: 0,
            isActive: true
        }));
        
        _userBondCount[msg.sender] = bondId + 1;
        
        _vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        _updateCurrentMilestone();
        
        (bool success, ) = payable(treasury).call{value: requiredWei}("");
        require(success, "ETH transfer failed");
        
        uint256 excessWei = msg.value - requiredWei;
        if (excessWei > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excessWei}("");
            require(refundSuccess, "ETH refund failed");
        }
        
        fvc.mint(msg.sender, fvcAmount);
        
        emit Bonded(msg.sender, ethUsdEquivalent, fvcAmount, currentMilestone);
        emit VestingScheduleCreated(msg.sender, fvcAmount, startTime, endTime);
        emit BondTransactionCreated(msg.sender, bondId, ethUsdEquivalent, fvcAmount, currentMilestone, startTime);
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
     * @notice Get current ETH/USD price from Chainlink
     * @dev Returns ETH/USD price in 18 decimals
     * @return ethUsdPrice ETH/USD price from Chainlink
     */
    function getEthUsdPrice() external view returns (uint256 ethUsdPrice) {
        return _getEthUsdPrice();
    }

    /**
     * @notice Get current FVC prices in both USDC and ETH
     * @dev Returns both USDC and ETH prices per FVC token
     * @return usdcPricePerFVC Price per FVC in USDC (6 decimals)
     * @return ethPricePerFVC Price per FVC in ETH (18 decimals)
     */
    function getCurrentPrices() external view returns (uint256 usdcPricePerFVC, uint256 ethPricePerFVC) {
        if (milestones.length == 0) return (0, 0);
        
        uint256 currentPrice = milestones[currentMilestone].price;
        usdcPricePerFVC = currentPrice;
        
        uint256 ethUsdPrice = _getEthUsdPrice();
        if (ethUsdPrice == 0) {
            ethPricePerFVC = 0;
            return (usdcPricePerFVC, ethPricePerFVC);
        }
        
        uint256 numerator = currentPrice * USDC_PRECISION * ETH_PRECISION;
        uint256 denominator = ethUsdPrice * PRICE_PRECISION;
        
        if (denominator == 0) {
            ethPricePerFVC = 0;
        } else {
            ethPricePerFVC = numerator / denominator;
        }
        
        return (usdcPricePerFVC, ethPricePerFVC);
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
        BondTransaction[] storage bonds = _userBonds[user];
        if (bonds.length == 0) return false;
        
        for (uint256 i = 0; i < bonds.length; i++) {
            if (bonds[i].isActive) {
                uint256 vested = _calculateVestedAmountForBond(bonds[i]);
                if (bonds[i].fvcAmount > vested) {
                    return true; // At least one bond is still locked
                }
            }
        }
        
        return false; // All bonds are fully vested
    }

    /**
     * @notice Get vested FVC amount for a user
     * @dev Calculates how many FVC tokens are vested and available
     * @param user Address of the user
     * @return vestedAmount Amount of FVC tokens vested
     * @return totalAmount Total amount of FVC tokens in vesting
     */
    function getVestedAmount(address user) external view returns (uint256 vestedAmount, uint256 totalAmount) {
        return getTotalVestedAmount(user);
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

    // ============ MULTIPLE VESTING SCHEDULES ============
    
    /**
     * @notice Get all bond transactions for a user
     * @dev Returns array of all bond transactions for the specified user
     * @param user Address of the user
     * @return Array of bond transaction structures
     */
    function getUserBonds(address user) external view returns (BondTransaction[] memory) {
        return _userBonds[user];
    }
    
    /**
     * @notice Get total vested amount across all bonds for a user
     * @dev Calculates total vested and total amount across all active bonds
     * @param user Address of the user
     * @return totalVested Total amount of FVC tokens vested across all bonds
     * @return totalAmount Total amount of FVC tokens across all bonds
     */
    function getTotalVestedAmount(address user) public view returns (uint256 totalVested, uint256 totalAmount) {
        BondTransaction[] storage bonds = _userBonds[user];
        
        for (uint256 i = 0; i < bonds.length; i++) {
            if (bonds[i].isActive) {
                uint256 vested = _calculateVestedAmountForBond(bonds[i]);
                totalVested += vested;
                totalAmount += bonds[i].fvcAmount;
            }
        }
        
        return (totalVested, totalAmount);
    }
    
    /**
     * @notice Get bond count for a user
     * @dev Returns the number of bond transactions for the specified user
     * @param user Address of the user
     * @return Number of bond transactions
     */
    function getBondCount(address user) external view returns (uint256) {
        return _userBondCount[user];
    }
    
    /**
     * @notice Get specific bond transaction by index
     * @dev Returns bond transaction at the specified index for the user
     * @param user Address of the user
     * @param index Index of the bond transaction
     * @return Bond transaction structure
     */
    function getBondAtIndex(address user, uint256 index) external view returns (BondTransaction memory) {
        require(index < _userBonds[user].length, "Bond index out of bounds");
        return _userBonds[user][index];
    }
    
    /**
     * @notice Calculate vested amount for a specific bond transaction
     * @dev Implements 12-month cliff + 24-month linear vesting for individual bonds
     * @param bond Bond transaction structure
     * @return vestedAmount Amount of FVC tokens vested for this bond
     */
    function _calculateVestedAmountForBond(BondTransaction storage bond) internal view returns (uint256 vestedAmount) {
        uint256 currentTime = block.timestamp;
        uint256 cliffEndTime = bond.timestamp + CLIFF_DURATION_SECONDS; // 12-month cliff
        uint256 vestingEndTime = cliffEndTime + VESTING_DURATION_SECONDS; // 24-month linear after cliff
        
        if (currentTime < cliffEndTime) {
            return 0;
        }
        
        if (currentTime >= vestingEndTime) {
            return bond.fvcAmount; // Fully vested
        }
        
        uint256 vestingProgress = currentTime - cliffEndTime;
        uint256 vestingDuration = VESTING_DURATION_SECONDS; // 24 months
        
        vestedAmount = (bond.fvcAmount * vestingProgress) / vestingDuration;
        return vestedAmount;
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
        
        if (currentTime < cliffEndTime) {
            return 0;
        }
        
        if (currentTime >= vestingEndTime) {
            return schedule.amount; // Fully vested
        }
        
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
        
        return totalFVCSold;
    }

    /**
     * @notice Get ETH/USD price from Chainlink price feed
     * @dev Fetches latest price data and validates it
     * @return ethUsdPrice ETH/USD price with proper decimals
     */
    function _getEthUsdPrice() internal view returns (uint256 ethUsdPrice) {
        try ethUsdPriceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256,
            uint80
        ) {
            if (price <= 0) return 0;
            
            ethUsdPrice = uint256(price);
            
            if (ethUsdPriceFeed.decimals() < 18) {
                uint256 decimalsToAdd = 18 - ethUsdPriceFeed.decimals();
                ethUsdPrice = ethUsdPrice * (10 ** decimalsToAdd);
            } else if (ethUsdPriceFeed.decimals() > 18) {
                uint256 decimalsToRemove = ethUsdPriceFeed.decimals() - 18;
                ethUsdPrice = ethUsdPrice / (10 ** decimalsToRemove);
            }
            
            return ethUsdPrice;
        } catch {
            return 0; // Return 0 if price feed fails
        }
    }

    /**
     * @notice Calculate USDC amount for given FVC amount at current price
     * @dev Reverse calculation of FVC amount
     * @param fvcAmount Amount of FVC tokens (in 18 decimals)
     * @param price Price per FVC (in 3 decimals)
     * @return usdcAmount Amount of USDC required (in 6 decimals)
     */
    function _calculatePreciseUSDCAmount(uint256 fvcAmount, uint256 price) internal pure returns (uint256 usdcAmount) {
        if (fvcAmount == 0 || price == 0) revert Bonding__CalculationError();
        
        uint256 numerator = fvcAmount * price * PRICE_PRECISION;
        uint256 denominator = PRECISION;
        
        if (denominator == 0) revert Bonding__CalculationError();
        
        usdcAmount = numerator / denominator;
        
        if (usdcAmount == 0) revert Bonding__CalculationError();
        
        return usdcAmount;
    }

    /**
     * @notice Calculate required ETH amount for given USDC amount
     * @dev Converts USDC amount to ETH using Chainlink price
     * @param usdcAmount Amount of USDC (in 6 decimals)
     * @param ethUsdPrice ETH/USD price (in 18 decimals)
     * @return requiredWei Required ETH amount in wei
     */
    function _calculateRequiredWei(uint256 usdcAmount, uint256 ethUsdPrice) internal pure returns (uint256 requiredWei) {
        if (usdcAmount == 0 || ethUsdPrice == 0) revert Bonding__CalculationError();
        
        uint256 numerator = usdcAmount * ETH_PRECISION;
        uint256 denominator = ethUsdPrice;
        
        if (denominator == 0) revert Bonding__CalculationError();
        
        requiredWei = numerator / denominator;
        
        if (requiredWei == 0) revert Bonding__CalculationError();
        
        return requiredWei;
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
        if (usdcAmount == 0 || price == 0) revert Bonding__CalculationError();
        
        uint256 numerator = usdcAmount * PRECISION;
        uint256 denominator = price * PRICE_PRECISION;
        
        if (denominator == 0) revert Bonding__CalculationError();
        
        fvcAmount = numerator / denominator;
        
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
        
        uint256 treasuryBalance = usdc.balanceOf(treasury);
        uint256 refundAmount = (userBondedAmount * treasuryBalance) / totalBonded;
        
        refundAmount = refundAmount > userBondedAmount ? userBondedAmount : refundAmount;
        
        userBonded[msg.sender] = 0;
        totalBonded = totalBonded - userBondedAmount;
        
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
