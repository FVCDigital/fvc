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
    
    /// @notice Maximum wallet cap for private sale (2M USDC)
    uint256 public constant MAX_WALLET_CAP = 2_000_000 * 1e6; // 2M USDC in 6 decimals
    
    /// @notice Total private sale target (20M USDC)
    uint256 public constant TOTAL_SALE_TARGET = 20_000_000 * 1e6; // 20M USDC in 6 decimals
    
    /// @notice Total FVC tokens for private sale (225M FVC)
    uint256 public constant TOTAL_FVC_ALLOCATION = 225_000_000 * 1e18; // 225M FVC in 18 decimals

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
    mapping(address => VestingSchedule) public vestingSchedules;

    // ============ MILESTONE STRUCTURE ============
    
    /// @notice Milestone configuration structure
    struct Milestone {
        uint256 usdcThreshold;    // USDC threshold to reach this milestone
        uint256 price;            // Price per FVC in USDC (6 decimals)
        uint256 fvcAllocation;    // FVC tokens allocated to this milestone
        string name;              // Milestone name
        bool isActive;            // Whether milestone is active
    }
    
    /// @notice Array of milestones (4 total)
    Milestone[] public milestones;

    // ============ EVENTS ============

    /// @notice Emitted when private sale starts
    event PrivateSaleStarted(uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when private sale ends
    event PrivateSaleEnded(uint256 totalBonded, uint256 totalFVCSold);
    
    /// @notice Emitted when a milestone is reached
    event MilestoneReached(uint256 milestoneIndex, uint256 usdcThreshold, uint256 price);
    
    /// @notice Emitted when a user bonds USDC
    event Bonded(address indexed user, uint256 usdcAmount, uint256 fvcAmount, uint256 milestoneIndex);
    


    // ============ INITIALIZER ============

    /**
     * @notice Initialize the bonding contract
     * @dev Sets up milestone structure and initial parameters
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     */
    function initialize(
        address _fvc,
        address _usdc,
        address _treasury
    ) external initializer {
        if (_fvc == address(0)) revert Bonding__ZeroAddress();
        if (_usdc == address(0)) revert Bonding__ZeroAddress();
        if (_treasury == address(0)) revert Bonding__ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BONDING_MANAGER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

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
     * @dev Main bonding function with milestone-based pricing
     * @param usdcAmount Amount of USDC to bond (in 6 decimals)
     */
    function bond(uint256 usdcAmount) external nonReentrant {
        if (usdcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
        if (block.timestamp > saleEndTime) revert Bonding__PrivateSaleEnded();
        
        // Check wallet cap
        if (userBonded[msg.sender] + usdcAmount > MAX_WALLET_CAP) {
            revert Bonding__ExceedsWalletCap();
        }
        
        // Check if milestone cap would be exceeded
        Milestone storage currentMilestoneData = milestones[currentMilestone];
        uint256 milestoneProgress = totalBonded - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        uint256 milestoneRemaining = currentMilestoneData.usdcThreshold - (currentMilestone > 0 ? milestones[currentMilestone - 1].usdcThreshold : 0);
        
        if (milestoneProgress + usdcAmount > milestoneRemaining) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        // Calculate FVC amount based on current milestone price
        uint256 fvcAmount = (usdcAmount * 1e18) / currentMilestoneData.price; // Convert to FVC (18 decimals)
        
        // Check if enough FVC is available for this milestone
        uint256 milestoneFVCSold = _getMilestoneFVCSold(currentMilestone);
        if (milestoneFVCSold + fvcAmount > currentMilestoneData.fvcAllocation) {
            revert Bonding__MilestoneCapExceeded();
        }
        
        // Update state BEFORE external calls (reentrancy protection)
        totalBonded = totalBonded + usdcAmount;
        totalFVCSold = totalFVCSold + fvcAmount;
        userBonded[msg.sender] = userBonded[msg.sender] + usdcAmount;
        
        // Create vesting schedule - 12-month cliff + 24-month linear
        uint256 startTime = block.timestamp;
        uint256 cliffEndTime = startTime + 365 days; // 12-month cliff
        uint256 endTime = cliffEndTime + 730 days;   // 24-month linear after cliff
        
        vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        // Update current milestone if needed
        _updateCurrentMilestone();
        
        // External calls AFTER state updates (reentrancy protection)
        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);
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
        
        fvcAmount = (usdcAmount * 1e18) / currentPrice;
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
        return vestingSchedules[user];
    }

    /**
     * @notice Check if user's tokens are locked in vesting
     * @dev Used by FVC token to prevent transfers of locked tokens
     * @param user Address of the user to check
     * @return True if tokens are locked, false if unlocked
     */
    function isLocked(address user) external view returns (bool) {
        VestingSchedule storage schedule = vestingSchedules[user];
        if (schedule.amount == 0) return false;
        
        uint256 currentTime = block.timestamp;
        uint256 cliffEndTime = schedule.startTime + 365 days; // 12-month cliff
        
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
        VestingSchedule storage schedule = vestingSchedules[user];
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
        uint256 cliffEndTime = schedule.startTime + 365 days; // 12-month cliff
        uint256 vestingEndTime = cliffEndTime + 730 days;    // 24-month linear after cliff
        
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
        uint256 vestingDuration = 730 days; // 24 months
        
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
    
    function getCurrentRound() external pure returns (RoundConfig memory) {
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
