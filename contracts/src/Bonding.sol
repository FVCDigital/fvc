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

contract Bonding is IBonding, Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // State variables
    IFVC public fvc;
    IERC20 public usdc;
    address public treasury;
    
    // Round management
    uint256 public currentRoundId;
    mapping(uint256 => RoundConfig) public rounds;
    
    // Current round state
    uint256 public initialDiscount; // e.g., 20%
    uint256 public finalDiscount; // e.g., 5%
    uint256 public epochCap; // Total tokens that can be bonded in this epoch (increased to 200M)
    uint256 public walletCap; // Max tokens per wallet
    uint256 public vestingPeriod; // Vesting period in seconds
    
    uint256 public totalBonded; // Total USDC bonded in current epoch
    
    // Mapping to track user bonded amounts per round
    mapping(uint256 => mapping(address => uint256)) public userBonded;
    
    // Mapping to track vesting schedules
    mapping(address => VestingSchedule) public vestingSchedules;
    
    // Events (inherited from IBonding interface)
    event EpochCapUpdated(uint256 newCap);
    event WalletCapUpdated(uint256 newCap);
    event VestingPeriodUpdated(uint256 newPeriod);
    
    // Custom errors
    error Bonding__AmountMustBeGreaterThanZero();
    error Bonding__EpochCapExceeded();
    error Bonding__ExceedsWalletCap();
    error Bonding__TokensLockedInVesting();
    error Bonding__InvalidDiscountRange();
    error Bonding__InvalidVestingPeriod();
    error Bonding__RoundNotActive();
    error Bonding__RoundAlreadyActive();
    error Bonding__NoMoreRounds();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _fvc,
        address _usdc,
        address _treasury,
        uint256 _initialDiscount,
        uint256 _finalDiscount,
        uint256 _epochCap,
        uint256 _walletCap,
        uint256 _vestingPeriod
    ) public initializer {
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
        
        // Initialize first round
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
     * @dev Bond USDC for FVC tokens with discount
     * @param amount Amount of USDC to bond
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
        
        // Create vesting schedule
        uint256 startTime = block.timestamp;
        uint256 endTime = BondingMath.calculateVestingEndTime(startTime, vestingPeriod);
        
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
            emit RoundCompleted(currentRoundId, currentRound.totalBonded);
        }
    }
    
    /**
     * @dev Get current discount based on total bonded amount
     * @return Current discount percentage
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
     * @dev Get current round configuration
     * @return Current round config
     */
    function getCurrentRound() external view returns (RoundConfig memory) {
        return rounds[currentRoundId];
    }
    
    /**
     * @dev Start a new bonding round (Olympus style)
     * @param _initialDiscount Initial discount for the round
     * @param _finalDiscount Final discount for the round
     * @param _epochCap Total tokens that can be bonded in this round
     * @param _walletCap Max tokens per wallet for this round
     * @param _vestingPeriod Vesting period for this round
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
     * @dev Complete current round (when epoch cap is reached)
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
     * @dev Get vesting schedule for a user
     * @param user Address of the user
     * @return Vesting schedule
     */
    function getVestingSchedule(address user) external view returns (VestingSchedule memory) {
        return vestingSchedules[user];
    }
    
    /**
     * @dev Check if user's tokens are still locked in vesting
     * @param user Address of the user
     * @return True if tokens are locked
     */
    function isLocked(address user) public view returns (bool) {
        VestingSchedule memory schedule = vestingSchedules[user];
        return schedule.amount > 0 && BondingMath.isVestingLocked(block.timestamp, schedule.endTime);
    }
    
    /**
     * @dev Override transfer function to check vesting
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
    
    // Admin functions
    function setEpochCap(uint256 _epochCap) external onlyOwner {
        epochCap = _epochCap;
        emit EpochCapUpdated(_epochCap);
    }
    
    function setWalletCap(uint256 _walletCap) external onlyOwner {
        walletCap = _walletCap;
        emit WalletCapUpdated(_walletCap);
    }
    
    function setVestingPeriod(uint256 _vestingPeriod) external onlyOwner {
        if (_vestingPeriod == 0) {
            revert Bonding__InvalidVestingPeriod();
        }
        vestingPeriod = _vestingPeriod;
        emit VestingPeriodUpdated(_vestingPeriod);
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    /**
     * @dev Start next round with predefined parameters (automatic progression)
     * Only works if current round is completed
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
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
} 