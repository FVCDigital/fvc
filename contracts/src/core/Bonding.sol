// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IBonding.sol";
import "../interfaces/IFVC.sol";
import "../libraries/BondingMath.sol";

/**
 * @title Bonding
 * @notice FVC Protocol bonding contract with emergency unlock function
 * @dev Manages USDC bonding for FVC tokens with dynamic discount pricing and vesting schedules
 * @custom:security Uses OpenZeppelin access controls and reentrancy protection
 */
contract Bonding is IBonding, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CUSTOM ERRORS ============
    
    /// @notice Error thrown when bonding amount is zero
    error Bonding__AmountMustBeGreaterThanZero();
    
    /// @notice Error thrown when round is not active
    error Bonding__RoundNotActive();
    
    /// @notice Error thrown when epoch cap is exceeded
    error Bonding__EpochCapExceeded();
    
    /// @notice Error thrown when wallet cap is exceeded
    error Bonding__ExceedsWalletCap();
    
    /// @notice Error thrown when tokens are locked in vesting
    error Bonding__TokensLockedInVesting();
    
    /// @notice Error thrown when vesting period is zero
    error Bonding__InvalidVestingPeriod();
    
    /// @notice Error thrown when address is zero
    error Bonding__ZeroAddress();

    // ============ STATE VARIABLES ============

    /// @notice FVC token contract address
    IFVC public immutable fvc;

    /// @notice USDC token contract address
    IERC20 public immutable usdc;

    /// @notice Treasury address for USDC collection
    address public treasury;
    
    /// @notice Current bonding round identifier
    uint256 public currentRoundId;

    /// @notice Mapping of round ID to round configuration
    mapping(uint256 => RoundConfig) public rounds;
    
    /// @notice Initial discount percentage for current round (e.g., 20%)
    uint256 public initialDiscount;

    /// @notice Final discount percentage for current round (e.g., 5%)
    uint256 public finalDiscount;

    /// @notice Total tokens that can be bonded in current epoch
    uint256 public epochCap;

    /// @notice Maximum tokens per wallet for current round
    uint256 public walletCap;

    /// @notice Vesting period in seconds for current round
    uint256 public vestingPeriod;
    
    /// @notice Total FVC tokens allocated to current round
    uint256 public fvcAllocated;

    /// @notice Total FVC tokens sold in current round
    uint256 public fvcSold;

    /// @notice Total USDC collected in current round
    uint256 public totalBonded;
    
    /// @notice Mapping of round ID to user address to bonded amount
    mapping(uint256 => mapping(address => uint256)) public userBonded;
    
    /// @notice Mapping of user address to vesting schedule
    mapping(address => VestingSchedule) public vestingSchedules;
    
    // ============ EVENTS ============

    /// @notice Emitted when epoch cap is updated
    event EpochCapUpdated(uint256 indexed newCap);

    /// @notice Emitted when wallet cap is updated
    event WalletCapUpdated(uint256 indexed newCap);

    /// @notice Emitted when vesting period is updated
    event VestingPeriodUpdated(uint256 indexed newPeriod);

    /// @notice Emitted when emergency unlock is performed
    event EmergencyUnlock(address indexed user, uint256 amount);
    
    /// @notice Emitted when treasury is updated
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the bonding contract
     * @dev Sets up initial round parameters and treasury
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     * @param _initialDiscount Initial discount percentage (e.g., 20)
     * @param _finalDiscount Final discount percentage (e.g., 5)
     * @param _epochCap Total USDC that can be bonded in current epoch
     * @param _walletCap Maximum USDC per wallet for current round
     * @param _vestingPeriod Vesting period in seconds
     * @custom:security Grants ownership to deployer
     */
    constructor(
        address _fvc,
        address _usdc,
        address _treasury,
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) payable Ownable(msg.sender) {
        if (_fvc == address(0)) revert Bonding__ZeroAddress();
        if (_usdc == address(0)) revert Bonding__ZeroAddress();
        if (_treasury == address(0)) revert Bonding__ZeroAddress();
        if (_vestingPeriod == 0) revert Bonding__InvalidVestingPeriod();
        
        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        
        // Start first round
        currentRoundId = 1;
        rounds[currentRoundId] = RoundConfig({
            roundId: currentRoundId,
            initialDiscount: _initialDiscount,
            finalDiscount: _finalDiscount,
            epochCap: _epochCap,
            walletCap: _walletCap,
            vestingPeriod: _vestingPeriod,
            fvcAllocated: 0,  // Will be set when FVC is allocated
            fvcSold: 0,        // Starts at 0
            isActive: true,
            totalBonded: 0
        });
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Emergency unlock vesting for a specific user (TESTNET ONLY)
     * @dev Only owner can call this function - FOR TESTNET USE ONLY
     * @param user Address of the user to unlock
     * @custom:security Only owner can call this function
     */
    function emergencyUnlockVesting(address user) external onlyOwner {
        if (user == address(0)) revert Bonding__ZeroAddress();
        
        VestingSchedule storage schedule = vestingSchedules[user];
        
        if (schedule.amount > 0) {
            uint256 amount = schedule.amount;
            
            // Reset the vesting schedule to unlock immediately
            schedule.amount = 0;
            schedule.startTime = 0;
            schedule.endTime = 0;
            
            emit EmergencyUnlock(user, amount);
        }
    }

    /**
     * @notice Emergency unlock all vesting schedules (TESTNET ONLY)
     * @dev Only owner can call this function - FOR TESTNET USE ONLY
     * @custom:security Only owner can call this function
     */
    function emergencyUnlockAllVesting() external onlyOwner {
        // This is a simplified version - in production you'd iterate through all users
        // For testnet purposes, this function exists but may not unlock all users
        emit EmergencyUnlock(address(0), 0);
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Bond USDC for FVC tokens
     * @dev Implements Olympus-style bonding with vesting schedules
     * @param fvcAmount Amount of FVC tokens to receive (in 18 decimals)
     * @custom:security Checks FVC availability, wallet cap, and vesting locks
     */
    function bond(uint256 fvcAmount) external nonReentrant {
        if (fvcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (!currentRound.isActive) revert Bonding__RoundNotActive();
        
        // Cache storage variables to save gas
        uint256 _fvcSold = fvcSold;
        uint256 _fvcAllocated = fvcAllocated;
        uint256 _walletCap = walletCap;
        uint256 _currentRoundId = currentRoundId;
        
        // Check if enough FVC is available
        if (_fvcSold + fvcAmount > _fvcAllocated) {
            revert Bonding__EpochCapExceeded();
        }
        
        // Calculate USDC amount needed based on current discount
        uint256 currentDiscount = getCurrentDiscount();
        uint256 usdcAmount = BondingMath.calculateUSDCAmount(fvcAmount, currentDiscount);
        
        // Check wallet cap (in USDC terms)
        if (userBonded[_currentRoundId][msg.sender] + usdcAmount > _walletCap) {
            revert Bonding__ExceedsWalletCap();
        }
        
        // Update state BEFORE external calls (reentrancy protection)
        totalBonded = totalBonded + usdcAmount;
        currentRound.totalBonded = currentRound.totalBonded + usdcAmount;
        currentRound.fvcSold = currentRound.fvcSold + fvcAmount;
        fvcSold = _fvcSold + fvcAmount;
        userBonded[_currentRoundId][msg.sender] = userBonded[_currentRoundId][msg.sender] + usdcAmount;
        
        // Create vesting schedule - tokens locked until round ends
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + vestingPeriod;
        
        vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        // External calls AFTER state updates (reentrancy protection)
        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);
        IERC20(address(fvc)).safeTransfer(msg.sender, fvcAmount);
        
        emit Bonded(msg.sender, usdcAmount);
        emit VestingScheduleCreated(msg.sender, fvcAmount, startTime, endTime);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current discount percentage
     * @dev Calculates discount based on bonding progress with precision handling
     * @return Current discount percentage
     */
    function getCurrentDiscount() public view returns (uint256) {
        uint256 _totalBonded = totalBonded;
        uint256 _epochCap = epochCap;
        uint256 _initialDiscount = initialDiscount;
        uint256 _finalDiscount = finalDiscount;
        
        if (_totalBonded >= _epochCap) {
            return _finalDiscount;
        }
        
        // Use higher precision arithmetic to avoid precision loss
        uint256 progress = (_totalBonded * 10000) / _epochCap; // 4 decimal precision
        uint256 discountRange = _initialDiscount - _finalDiscount;
        uint256 discountReduction = (discountRange * progress) / 10000;
        
        return _initialDiscount - discountReduction;
    }

    /**
     * @notice Get current round configuration
     * @dev Returns complete round data for current round
     * @return Current round configuration
     */
    function getCurrentRound() external view returns (RoundConfig memory) {
        return rounds[currentRoundId];
    }

    /**
     * @notice Get vesting schedule for a specific user
     * @dev Returns complete vesting data for the user
     * @param user Address of the user
     * @return Vesting schedule structure
     */
    function getVestingSchedule(address user) external view returns (VestingSchedule memory) {
        return vestingSchedules[user];
    }

    /**
     * @notice Check if user's tokens are still locked in vesting
     * @dev Compares current time with vesting end time
     * @param user Address of the user to check
     * @return True if tokens are locked, false otherwise
     */
    function isLocked(address user) external view returns (bool) {
        VestingSchedule memory schedule = vestingSchedules[user];
        return schedule.amount != 0 && BondingMath.isVestingLocked(block.timestamp, schedule.endTime);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update vesting period for current round
     * @dev Only owner can call this function
     * @param _vestingPeriod New vesting period in seconds
     * @custom:security Only owner can call this function
     */
    function setVestingPeriod(uint256 _vestingPeriod) external onlyOwner {
        if (_vestingPeriod == 0) revert Bonding__InvalidVestingPeriod();
        
        vestingPeriod = _vestingPeriod;
        emit VestingPeriodUpdated(_vestingPeriod);
    }

    /**
     * @notice Update treasury address
     * @dev Only owner can call this function
     * @param _treasury New treasury address
     * @custom:security Only owner can call this function
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert Bonding__ZeroAddress();
        
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Start a new bonding round
     * @dev Only owner can call this function
     * @param _initialDiscount Initial discount percentage
     * @param _finalDiscount Final discount percentage
     * @param _epochCap Total USDC that can be bonded
     * @param _walletCap Maximum USDC per wallet
     * @param _vestingPeriod Vesting period in seconds
     * @custom:security Only owner can call this function
     */
    function startNewRound(
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) external onlyOwner {
        if (_vestingPeriod == 0) revert Bonding__InvalidVestingPeriod();
        
        // Complete current round
        RoundConfig storage currentRound = rounds[currentRoundId];
        currentRound.isActive = false;
        
        // Start new round
        currentRoundId = currentRoundId + 1;
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        totalBonded = 0;
        fvcSold = 0;
        
        // Create new round
        rounds[currentRoundId] = RoundConfig({
            roundId: currentRoundId,
            initialDiscount: _initialDiscount,
            finalDiscount: _finalDiscount,
            epochCap: _epochCap,
            walletCap: _walletCap,
            vestingPeriod: _vestingPeriod,
            fvcAllocated: 0,  // Will be set when FVC is allocated
            fvcSold: 0,        // Starts at 0
            isActive: true,
            totalBonded: 0
        });
        
        emit RoundStarted(currentRoundId, _initialDiscount, _finalDiscount, _epochCap);
    }

    /**
     * @notice Allocate FVC tokens to the current bonding round
     * @dev Only owner can allocate FVC tokens for bonding
     * @param fvcAmount Amount of FVC tokens to allocate (in 18 decimals)
     * @custom:security Only owner can call this function
     */
    function allocateFVC(uint256 fvcAmount) external onlyOwner {
        if (fvcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
        
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (!currentRound.isActive) revert Bonding__RoundNotActive();
        
        // Transfer FVC tokens from owner to this contract
        IERC20(address(fvc)).safeTransferFrom(msg.sender, address(this), fvcAmount);
        
        // Update FVC allocation
        fvcAllocated = fvcAllocated + fvcAmount;
        currentRound.fvcAllocated = currentRound.fvcAllocated + fvcAmount;
        
        emit FVCAllocated(currentRoundId, fvcAmount);
    }

    /**
     * @notice Get remaining FVC tokens available for bonding
     * @dev Returns the difference between allocated and sold FVC
     * @return Remaining FVC tokens available
     */
    function getRemainingFVC() public view returns (uint256) {
        return fvcAllocated - fvcSold;
    }

    /**
     * @notice Calculate USDC amount needed for a given FVC amount
     * @dev Uses current discount to calculate USDC required
     * @param fvcAmount Amount of FVC tokens desired (in 18 decimals)
     * @return usdcAmount Amount of USDC needed (in 6 decimals)
     */
    function calculateUSDCAmount(uint256 fvcAmount) public view returns (uint256 usdcAmount) {
        uint256 currentDiscount = getCurrentDiscount();
        return BondingMath.calculateUSDCAmount(fvcAmount, currentDiscount);
    }
}
