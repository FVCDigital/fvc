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
    
    /// @notice Error thrown when trying to start new round while current is active
    error Bonding__RoundAlreadyActive();

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

    /// @notice Emitted when emergency unlock is performed
    event EmergencyUnlock(address indexed user, uint256 amount);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the bonding contract
     * @dev Sets up initial round configuration
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     * @param _initialDiscount Initial discount percentage
     * @param _finalDiscount Final discount percentage
     * @param _epochCap Total USDC that can be bonded in this round
     * @param _walletCap Maximum USDC per wallet for this round
     * @param _vestingPeriod Vesting period in seconds
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
    ) {
        if (_fvc == address(0)) revert Bonding__ZeroAddress();
        if (_usdc == address(0)) revert Bonding__ZeroAddress();
        if (_treasury == address(0)) revert Bonding__ZeroAddress();
        if (_vestingPeriod == 0) revert Bonding__InvalidVestingPeriod();
        if (_initialDiscount <= _finalDiscount) revert Bonding__InvalidVestingPeriod();

        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        
        // Set initial round parameters
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        
        // Initialize first round (Round 0)
        currentRoundId = 0;
        rounds[0] = RoundConfig({
            roundId: 0,
            initialDiscount: _initialDiscount,
            finalDiscount: _finalDiscount,
            epochCap: _epochCap,
            walletCap: _walletCap,
            vestingPeriod: _vestingPeriod,
            fvcAllocated: 0,
            fvcSold: 0,
            isActive: true,
            totalBonded: 0
        });
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Emergency unlock function for admin
     * @dev Only owner can call this function to unlock tokens in emergency
     * @param user Address of the user to unlock tokens for
     * @custom:security Only owner can call this function
     */
    function emergencyUnlock(address user) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[user];
        if (schedule.amount > 0) {
            uint256 amount = schedule.amount;
            schedule.amount = 0;
            schedule.startTime = 0;
            schedule.endTime = 0;
            
            emit EmergencyUnlock(user, amount);
        }
    }

    /**
     * @notice Emergency unlock all users (nuclear option)
     * @dev Only owner can call this function to unlock all tokens
     * @custom:security Only owner can call this function
     */
    function emergencyUnlockAll() external onlyOwner {
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
     * @notice Check if user's tokens are locked in vesting
     * @dev Used by FVC token to prevent transfers of locked tokens
     * @param user Address of the user to check
     * @return True if tokens are locked, false if unlocked
     */
    function isLocked(address user) external view returns (bool) {
        VestingSchedule storage schedule = vestingSchedules[user];
        return schedule.amount > 0 && block.timestamp < schedule.endTime;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update epoch cap for current round
     * @dev Only owner can update the epoch cap
     * @param newCap New epoch cap value
     * @custom:security Only owner can call this function
     */
    function updateEpochCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert Bonding__AmountMustBeGreaterThanZero();
        epochCap = newCap;
        emit EpochCapUpdated(newCap);
    }

    /**
     * @notice Update wallet cap for current round
     * @dev Only owner can update the wallet cap
     * @param newCap New wallet cap value
     * @custom:security Only owner can call this function
     */
    function updateWalletCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert Bonding__AmountMustBeGreaterThanZero();
        walletCap = newCap;
        emit WalletCapUpdated(newCap);
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

    /**
     * @notice Complete the current bonding round
     * @dev Only owner can call this function. Sets current round to inactive.
     * @custom:security Only owner can call this function
     */
    function completeCurrentRound() external onlyOwner {
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (!currentRound.isActive) revert Bonding__RoundNotActive();
        
        currentRound.isActive = false;
        
        emit RoundCompleted(currentRoundId, currentRound.fvcSold, currentRound.totalBonded);
    }

    /**
     * @notice Start the next round with predefined parameters
     * @dev Only owner can call this function. Uses hardcoded round parameters.
     * @custom:security Only owner can call this function
     */
    function startNextRound() external onlyOwner {
        // Check if current round is still active - must complete it first
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (currentRound.isActive) revert Bonding__RoundAlreadyActive();
        
        // Increment round ID
        currentRoundId = currentRoundId + 1;
        
        // Predefined parameters for different rounds
        uint256 _initialDiscount;
        uint256 _finalDiscount;
        uint256 _epochCap;
        uint256 _walletCap;
        uint256 _vestingPeriod = 90 * 24 * 60 * 60; // 90 days default
        
        // Round-specific parameters (can be extended for more rounds)
        if (currentRoundId == 1) {
            // Round 1 (Genesis) - After Round 0
            _initialDiscount = 20;
            _finalDiscount = 3;
            _epochCap = 150000000 * 1e18; // 150M tokens
            _walletCap = 8000000 * 1e18; // 8M tokens
        } else if (currentRoundId == 2) {
            // Round 2 (Early Adopters)
            _initialDiscount = 15;
            _finalDiscount = 2;
            _epochCap = 100000000 * 1e18; // 100M tokens
            _walletCap = 5000000 * 1e18; // 5M tokens
        } else {
            // Default parameters for future rounds
            _initialDiscount = 10;
            _finalDiscount = 1;
            _epochCap = 50000000 * 1e18; // 50M tokens
            _walletCap = 2000000 * 1e18; // 2M tokens
        }
        
        // Update contract state
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        
        // CRITICAL FIX: Reset global state to match new round
        totalBonded = 0;
        fvcSold = 0;
        fvcAllocated = 0; // Also reset allocation for new round
        
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
}
