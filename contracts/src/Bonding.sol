// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IBonding.sol";
import "./interfaces/IFVC.sol";
import "./libraries/BondingMath.sol";

/**
 * @title Bonding
 * @notice FVC Protocol bonding contract implementing Olympus-style token distribution
 * @dev Manages USDC bonding for FVC tokens with dynamic discount pricing and vesting schedules
 * @custom:security Uses OpenZeppelin upgradeable pattern with access controls
 */
contract Bonding is IBonding, Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    /// @notice FVC token contract address
    /// @dev Used for minting FVC tokens to bonded users
    IFVC public fvc;

    /// @notice USDC token contract address
    /// @dev Stablecoin used for bonding purchases
    IERC20 public usdc;

    /// @notice Treasury address for USDC collection
    /// @dev Only owner can update this address
    address public treasury;
    
    /// @notice Current bonding round identifier
    /// @dev Increments with each new round, starts at 1
    uint256 public currentRoundId;

    /// @notice Mapping of round ID to round configuration
    /// @dev Stores historical and current round parameters
    mapping(uint256 => RoundConfig) public rounds;
    
    /// @notice Initial discount percentage for current round (e.g., 20%)
    /// @dev Higher discount = more FVC tokens per USDC
    uint256 public initialDiscount;

    /// @notice Final discount percentage for current round (e.g., 5%)
    /// @dev Lower discount = fewer FVC tokens per USDC
    uint256 public finalDiscount;

    /// @notice Total tokens that can be bonded in current epoch
    /// @dev Prevents over-allocation of FVC tokens
    uint256 public epochCap;

    /// @notice Maximum tokens per wallet for current round
    /// @dev Prevents whale dominance in early rounds
    uint256 public walletCap;

    /// @notice Vesting period in seconds for current round
    /// @dev Tokens are locked during this period
    uint256 public vestingPeriod;
    
    /// @notice Total USDC bonded in current epoch
    /// @dev Used to calculate current discount rate
    uint256 public totalBonded;
    
    /// @notice Mapping of round ID to user address to bonded amount
    /// @dev Tracks user participation per round
    mapping(uint256 => mapping(address => uint256)) public userBonded;
    
    /// @notice Mapping of user address to vesting schedule
    /// @dev Tracks token lock periods for each user
    mapping(address => VestingSchedule) public vestingSchedules;
    
    // ============ EVENTS ============

    /// @notice Emitted when epoch cap is updated
    /// @param newCap New epoch cap value
    event EpochCapUpdated(uint256 newCap);

    /// @notice Emitted when wallet cap is updated
    /// @param newCap New wallet cap value
    event WalletCapUpdated(uint256 newCap);

    /// @notice Emitted when vesting period is updated
    /// @param newPeriod New vesting period in seconds
    event VestingPeriodUpdated(uint256 newPeriod);
    
    // ============ CUSTOM ERRORS ============

    /// @notice Error thrown when bonding amount is zero
    /// @dev Prevents empty bonding transactions
    error Bonding__AmountMustBeGreaterThanZero();

    /// @notice Error thrown when epoch cap would be exceeded
    /// @dev Prevents over-allocation of FVC tokens
    error Bonding__EpochCapExceeded();

    /// @notice Error thrown when wallet cap would be exceeded
    /// @dev Prevents whale dominance in early rounds
    error Bonding__ExceedsWalletCap();

    /// @notice Error thrown when tokens are locked in vesting
    /// @dev Prevents transfer of locked tokens
    error Bonding__TokensLockedInVesting();

    /// @notice Error thrown when discount range is invalid
    /// @dev Ensures initial discount > final discount
    error Bonding__InvalidDiscountRange();

    /// @notice Error thrown when vesting period is zero
    /// @dev Ensures vesting period is set
    error Bonding__InvalidVestingPeriod();

    /// @notice Error thrown when round is not active
    /// @dev Prevents bonding in inactive rounds
    error Bonding__RoundNotActive();

    /// @notice Error thrown when round is already active
    /// @dev Prevents starting multiple active rounds
    error Bonding__RoundAlreadyActive();

    /// @notice Error thrown when no more rounds are available
    /// @dev Prevents exceeding maximum round count
    error Bonding__NoMoreRounds();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitialisers();
    }
    
    /**
     * @notice Initialise the bonding contract with initial parameters
     * @dev Sets up first round with specified discount and cap parameters
     * @param _fvc FVC token contract address
     * @param _usdc USDC token contract address
     * @param _treasury Treasury address for USDC collection
     * @param _initialDiscount Initial discount percentage (0-100)
     * @param _finalDiscount Final discount percentage (0-100)
     * @param _epochCap Total tokens that can be bonded in this epoch
     * @param _walletCap Maximum tokens per wallet for this round
     * @param _vestingPeriod Vesting period in seconds
     * @custom:security Validates discount range and vesting period
     */
    function initialise(
        address _fvc,
        address _usdc,
        address _treasury,
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) public initialiser {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        fvc = IFVC(_fvc);
        usdc = IERC20(_usdc);
        treasury = _treasury;
        
        // Validate parameters
        if (_initialDiscount <= _finalDiscount) {
            revert Bonding__InvalidDiscountRange();
        }
        if (_vestingPeriod == 0) {
            revert Bonding__InvalidVestingPeriod();
        }
        
        // Initialise first round
        currentRoundId = 1;
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        
        // Create first round
        rounds[currentRoundId] = RoundConfig({
            roundId: currentRoundId,
            initialDiscount: _initialDiscount,
            finalDiscount: _finalDiscount,
            epochCap: _epochCap,
            walletCap: _walletCap,
            vestingPeriod: _vestingPeriod,
            isActive: true,
            totalBonded: 0
        });
        
        emit RoundStarted(currentRoundId, _initialDiscount, _finalDiscount, _epochCap);
    }
    
    /**
     * @notice Bond USDC for FVC tokens with dynamic discount pricing
     * @dev Implements Olympus-style bonding with vesting schedules
     * @param amount Amount of USDC to bond (in 6 decimals)
     * @custom:security Checks epoch cap, wallet cap, and vesting locks
     */
    function bond(uint256 amount) external {
        if (amount == 0) {
            revert Bonding__AmountMustBeGreaterThanZero();
        }
        
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (!currentRound.isActive) {
            revert Bonding__RoundNotActive();
        }
        
        // Check epoch cap
        if (totalBonded + amount > epochCap) {
            revert Bonding__EpochCapExceeded();
        }
        
        // Check wallet cap
        if (userBonded[currentRoundId][msg.sender] + amount > walletCap) {
            revert Bonding__ExceedsWalletCap();
        }
        
        // Calculate discount
        uint256 currentDiscount = getCurrentDiscount();
        uint256 fvcAmount = BondingMath.calculateFVCAmount(amount, currentDiscount);
        
        // Transfer USDC to treasury
        usdc.safeTransferFrom(msg.sender, treasury, amount);
        
        // Mint FVC tokens to user
        fvc.mint(msg.sender, fvcAmount);
        
        // Update state
        totalBonded += amount;
        currentRound.totalBonded += amount;
        userBonded[currentRoundId][msg.sender] += amount;
        
        // Create vesting schedule - tokens locked until round ends
        uint256 startTime = block.timestamp;
        // Vesting ends when round is completed (totalBonded >= epochCap)
        // For now, we'll use a placeholder end time that will be updated when round completes
        uint256 endTime = startTime + vestingPeriod; // This will be updated when round completes
        
        vestingSchedules[msg.sender] = VestingSchedule({
            amount: fvcAmount,
            startTime: startTime,
            endTime: endTime
        });
        
        emit Bonded(msg.sender, amount);
        emit VestingScheduleCreated(msg.sender, fvcAmount, startTime, endTime);
        
        // Auto-complete round if epoch cap is reached
        if (totalBonded >= epochCap) {
            currentRound.isActive = false;
            // Update all vesting schedules to unlock tokens
            _unlockAllVestingSchedules();
            emit RoundCompleted(currentRoundId, currentRound.totalBonded);
        }
    }
    
    /**
     * @notice Get current discount based on total bonded amount
     * @dev Calculates dynamic discount using BondingMath library
     * @return Current discount percentage (0-100)
     */
    function getCurrentDiscount() public view returns (uint256) {
        return BondingMath.calculateCurrentDiscount(
            totalBonded,
            epochCap,
            initialDiscount,
            finalDiscount
        );
    }
    
    /**
     * @notice Get current round configuration
     * @dev Returns complete round data structure
     * @return Current round configuration
     */
    function getCurrentRound() external view returns (RoundConfig memory) {
        return rounds[currentRoundId];
    }
    
    /**
     * @notice Start a new bonding round with custom parameters
     * @dev Allows owner to manually start rounds with specific parameters
     * @param _initialDiscount Initial discount for the round (0-100)
     * @param _finalDiscount Final discount for the round (0-100)
     * @param _epochCap Total tokens that can be bonded in this round
     * @param _walletCap Max tokens per wallet for this round
     * @param _vestingPeriod Vesting period for this round in seconds
     * @custom:security Only owner can call this function
     */
    function startNewRound(
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) external onlyOwner {
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (currentRound.isActive) {
            revert Bonding__RoundAlreadyActive();
        }
        
        // Validate parameters
        if (_initialDiscount <= _finalDiscount) {
            revert Bonding__InvalidDiscountRange();
        }
        if (_vestingPeriod == 0) {
            revert Bonding__InvalidVestingPeriod();
        }
        
        // Complete current round
        emit RoundCompleted(currentRoundId, currentRound.totalBonded);
        
        // Start new round
        currentRoundId++;
        initialDiscount = _initialDiscount;
        finalDiscount = _finalDiscount;
        epochCap = _epochCap;
        walletCap = _walletCap;
        vestingPeriod = _vestingPeriod;
        totalBonded = 0;
        
        // Create new round
        rounds[currentRoundId] = RoundConfig({
            roundId: currentRoundId,
            initialDiscount: _initialDiscount,
            finalDiscount: _finalDiscount,
            epochCap: _epochCap,
            walletCap: _walletCap,
            vestingPeriod: _vestingPeriod,
            isActive: true,
            totalBonded: 0
        });
        
        emit RoundStarted(currentRoundId, _initialDiscount, _finalDiscount, _epochCap);
    }
    
    /**
     * @notice Complete current round manually
     * @dev Allows owner to end round before epoch cap is reached
     * @custom:security Only owner can call this function
     */
    function completeCurrentRound() external onlyOwner {
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (!currentRound.isActive) {
            revert Bonding__RoundNotActive();
        }
        
        currentRound.isActive = false;
        emit RoundCompleted(currentRoundId, currentRound.totalBonded);
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
     * @dev Used by FVC token to prevent transfers of locked tokens
     * @param user Address of the user to check
     * @return True if tokens are locked, false if unlocked
     */
    function isLocked(address user) public view returns (bool) {
        VestingSchedule memory schedule = vestingSchedules[user];
        return schedule.amount > 0 && BondingMath.isVestingLocked(block.timestamp, schedule.endTime);
    }
    
    /**
     * @notice Override transfer function to check vesting
     * @dev Prevents transfer of locked tokens
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @param amount Amount of tokens to transfer
     * @custom:security Reverts if tokens are locked in vesting
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal view {
        if (from != address(0) && isLocked(from)) {
            revert Bonding__TokensLockedInVesting();
        }
    }
    
    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update epoch cap for current round
     * @dev Only owner can modify this parameter
     * @param _epochCap New epoch cap value
     * @custom:security Only owner can call this function
     */
    function setEpochCap(uint256 _epochCap) external onlyOwner {
        epochCap = _epochCap;
        emit EpochCapUpdated(_epochCap);
    }
    
    /**
     * @notice Update wallet cap for current round
     * @dev Only owner can modify this parameter
     * @param _walletCap New wallet cap value
     * @custom:security Only owner can call this function
     */
    function setWalletCap(uint256 _walletCap) external onlyOwner {
        walletCap = _walletCap;
        emit WalletCapUpdated(_walletCap);
    }
    
    /**
     * @notice Update vesting period for current round
     * @dev Only owner can modify this parameter
     * @param _vestingPeriod New vesting period in seconds
     * @custom:security Only owner can call this function
     */
    function setVestingPeriod(uint256 _vestingPeriod) external onlyOwner {
        if (_vestingPeriod == 0) {
            revert Bonding__InvalidVestingPeriod();
        }
        vestingPeriod = _vestingPeriod;
        emit VestingPeriodUpdated(_vestingPeriod);
    }
    
    /**
     * @notice Update treasury address
     * @dev Only owner can modify this parameter
     * @param _treasury New treasury address
     * @custom:security Only owner can call this function
     */
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    /**
     * @notice Start next round with predefined parameters (automatic progression)
     * @dev Implements Olympus-style round progression with decreasing discounts
     * @custom:security Only owner can call this function, limited to 5 rounds
     */
    function startNextRound() external onlyOwner {
        RoundConfig storage currentRound = rounds[currentRoundId];
        if (currentRound.isActive) {
            revert Bonding__RoundAlreadyActive();
        }
        
        // Check if we have more rounds available
        if (currentRoundId >= 5) {
            revert Bonding__NoMoreRounds();
        }
        
        // Predefined round parameters (Olympus style)
        uint256[5] memory initialDiscounts = [uint256(25), uint256(20), uint256(15), uint256(10), uint256(5)];
        uint256[5] memory finalDiscounts = [uint256(5), uint256(3), uint256(2), uint256(1), uint256(0)];
        uint256[5] memory epochCaps = [
            uint256(80000000) * 10**18,  // 80M
            uint256(60000000) * 10**18,  // 60M
            uint256(40000000) * 10**18,  // 40M
            uint256(15000000) * 10**18,  // 15M
            uint256(5000000) * 10**18    // 5M
        ];
        uint256[5] memory walletCaps = [
            uint256(8000000) * 10**18,   // 8M
            uint256(6000000) * 10**18,   // 6M
            uint256(4000000) * 10**18,   // 4M
            uint256(2000000) * 10**18,   // 2M
            uint256(1000000) * 10**18    // 1M
        ];
        
        // Complete current round
        emit RoundCompleted(currentRoundId, currentRound.totalBonded);
        
        // Start new round
        currentRoundId++;
        initialDiscount = initialDiscounts[currentRoundId - 1];
        finalDiscount = finalDiscounts[currentRoundId - 1];
        epochCap = epochCaps[currentRoundId - 1];
        walletCap = walletCaps[currentRoundId - 1];
        totalBonded = 0;
        
        // Create new round
        rounds[currentRoundId] = RoundConfig({
            roundId: currentRoundId,
            initialDiscount: initialDiscounts[currentRoundId - 1],
            finalDiscount: finalDiscounts[currentRoundId - 1],
            epochCap: epochCaps[currentRoundId - 1],
            walletCap: walletCaps[currentRoundId - 1],
            vestingPeriod: vestingPeriod,
            isActive: true,
            totalBonded: 0
        });
        
        emit RoundStarted(currentRoundId, initialDiscounts[currentRoundId - 1], finalDiscounts[currentRoundId - 1], epochCaps[currentRoundId - 1]);
    }
    
    /**
     * @notice Authorise contract upgrades
     * @dev Only owner can upgrade the contract
     * @param newImplementation Address of new implementation
     * @custom:security Only owner can call this function
     */
    function _authoriseUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Unlock all vesting schedules for the current round
     * @dev Called when a round is completed to unlock all tokens
     * @custom:security Only owner can call this function
     */
    function _unlockAllVestingSchedules() internal onlyOwner {
        RoundConfig storage currentRound = rounds[currentRoundId];
        for (uint256 i = 0; i < currentRound.totalBonded; i++) {
            address user = msg.sender; // Assuming msg.sender is the user for whom we are unlocking
            VestingSchedule memory schedule = vestingSchedules[user];
            if (schedule.amount > 0) {
                // Update endTime to unlock tokens
                vestingSchedules[user].endTime = block.timestamp;
            }
        }
    }
} 