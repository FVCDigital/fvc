// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFVC {
    function mint(address to, uint256 amount) external;
}

interface IVesting {
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliff,
        uint256 duration
    ) external;
}

/**
 * @title Sale
 * @notice Fixed-price tranche sale accepting USDC/USDT, mints FVC on purchase
 * @dev Owner (Gnosis Safe) controls rate, cap, active state, and accepted tokens
 * @dev Large purchases (>= vestingThreshold) are automatically vested via TokenVesting contract
 */
contract Sale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ IMMUTABLES ============

    /// @notice Token being sold (FVC)
    IFVC public immutable saleToken;

    /// @notice Treasury/beneficiary receiving stablecoins (Gnosis Safe)
    address public immutable beneficiary;

    // ============ STATE VARIABLES ============

    /// @notice Fixed price: stablecoin units (6 decimals) per 1 FVC (18 decimals)
    uint256 public rate;

    /// @notice Maximum stablecoins (6 decimals) to accept across all tokens
    uint256 public cap;

    /// @notice Total stablecoins (6 decimals) accepted so far across all tokens
    uint256 public raised;

    /// @notice Whether sale is active
    bool public active;

    /// @notice Accepted stablecoins mapping
    mapping(address => bool) public isAccepted;

    /// @notice Decimals for each accepted token
    mapping(address => uint8) public tokenDecimals;

    /// @notice TokenVesting contract address (optional, set by owner)
    IVesting public vestingContract;

    /// @notice ETH price in USD with 6 decimals (e.g. 2500e6 = $2,500 per ETH), set by owner
    uint256 public ethUsdRate;

    /// @notice Minimum purchase amount (6 decimals) to trigger vesting
    uint256 public vestingThreshold;

    /// @notice Default vesting parameters (can be overridden per purchase)
    uint256 public defaultCliff;      // e.g., 180 days
    uint256 public defaultDuration;   // e.g., 730 days

    // ============ EVENTS ============

    event TokensPurchased(address indexed buyer, address indexed stable, uint256 paymentAmount, uint256 tokenAmount);
    event TokensPurchasedWithETH(address indexed buyer, uint256 ethAmount, uint256 usdEquivalent, uint256 tokenAmount);
    event TokensPurchasedWithVesting(address indexed buyer, uint256 tokenAmount, uint256 cliff, uint256 duration);
    event RateUpdated(uint256 newRate);
    event CapUpdated(uint256 newCap);
    event EthUsdRateUpdated(uint256 newEthUsdRate);
    event SaleStatusChanged(bool active);
    event AcceptedTokenUpdated(address indexed token, bool allowed);
    event VestingConfigUpdated(address indexed vestingContract, uint256 threshold, uint256 cliff, uint256 duration);

    // ============ ERRORS ============

    error Sale__Inactive();
    error Sale__ZeroAddress();
    error Sale__ZeroAmount();
    error Sale__ZeroRate();
    error Sale__ZeroCap();
    error Sale__CapExceeded();
    error Sale__TokenNotAccepted();
    error Sale__EthNotEnabled();
    error Sale__EthTransferFailed();

    // ============ CONSTRUCTOR ============

    /**
     * @param _saleToken FVC token address (must expose mint)
     * @param _beneficiary Treasury/beneficiary address (Gnosis Safe)
     * @param _initialRate Stable units (6d) per 1 FVC (18d)
     * @param _initialCap Maximum stable (6d) to raise
     */
    constructor(
        address _saleToken,
        address _beneficiary,
        uint256 _initialRate,
        uint256 _initialCap
    ) {
        if (_saleToken == address(0) || _beneficiary == address(0)) revert Sale__ZeroAddress();
        if (_initialRate == 0) revert Sale__ZeroRate();
        if (_initialCap == 0) revert Sale__ZeroCap();

        saleToken = IFVC(_saleToken);
        beneficiary = _beneficiary;
        rate = _initialRate;
        cap = _initialCap;

        transferOwnership(_beneficiary);
    }

    // ============ PURCHASE ============

    /**
     * @notice Buy FVC with an accepted stablecoin at the fixed rate
     * @param stable Address of accepted stablecoin (e.g., USDC or USDT)
     * @param amount Amount of stablecoin (6 decimals)
     */
    function buy(address stable, uint256 amount) external nonReentrant {
        if (!active) revert Sale__Inactive();
        if (!isAccepted[stable]) revert Sale__TokenNotAccepted();
        if (amount == 0) revert Sale__ZeroAmount();
        
        uint8 decimals = tokenDecimals[stable];
        require(decimals > 0, "Token decimals not configured");
        
        // Normalize amount to 6 decimals for cap tracking
        uint256 normalizedAmount = decimals == 6 ? amount : (decimals < 6 ? amount * 10**(6 - decimals) : amount / 10**(decimals - 6));
        
        if (raised + normalizedAmount > cap) revert Sale__CapExceeded();

        // Calculate FVC amount
        // Rate is defined as: (stable with 6 decimals) per (1 FVC with 18 decimals)
        // Normalize input to 6 decimals, then scale to 18 decimals for FVC
        uint256 tokenAmount = (normalizedAmount * 1e18) / rate;

        // Effects (track in normalized 6-decimal units)
        raised += normalizedAmount;

        // Interactions
        IERC20(stable).safeTransferFrom(msg.sender, beneficiary, amount);

        // Check if purchase should be vested
        if (
            address(vestingContract) != address(0) &&
            vestingThreshold > 0 &&
            normalizedAmount >= vestingThreshold
        ) {
            // Large purchase - create vesting schedule
            saleToken.mint(address(vestingContract), tokenAmount);
            
            vestingContract.createVestingSchedule(
                msg.sender,
                tokenAmount,
                block.timestamp,
                defaultCliff,
                defaultDuration
            );

            emit TokensPurchasedWithVesting(msg.sender, tokenAmount, defaultCliff, defaultDuration);
        } else {
            // Small purchase - mint directly (no vesting)
            saleToken.mint(msg.sender, tokenAmount);
            emit TokensPurchased(msg.sender, stable, amount, tokenAmount);
        }
    }

    /**
     * @notice Buy FVC with native ETH/BNB at the owner-set ethUsdRate
     * @dev Converts msg.value to a 6-decimal USD equivalent, then applies the same FVC rate
     *      ETH is forwarded to the beneficiary (Gnosis Safe)
     */
    function buyWithETH() external payable nonReentrant {
        if (!active) revert Sale__Inactive();
        if (ethUsdRate == 0) revert Sale__EthNotEnabled();
        if (msg.value == 0) revert Sale__ZeroAmount();

        // msg.value is 18 decimals. ethUsdRate is USD per 1 ETH in 6 decimals.
        // usdEquivalent (6 decimals) = msg.value * ethUsdRate / 1e18
        uint256 usdEquivalent = (msg.value * ethUsdRate) / 1e18;
        if (usdEquivalent == 0) revert Sale__ZeroAmount();
        if (raised + usdEquivalent > cap) revert Sale__CapExceeded();

        uint256 tokenAmount = (usdEquivalent * 1e18) / rate;

        raised += usdEquivalent;

        // Forward ETH to beneficiary
        (bool sent, ) = beneficiary.call{value: msg.value}("");
        if (!sent) revert Sale__EthTransferFailed();

        if (
            address(vestingContract) != address(0) &&
            vestingThreshold > 0 &&
            usdEquivalent >= vestingThreshold
        ) {
            saleToken.mint(address(vestingContract), tokenAmount);
            vestingContract.createVestingSchedule(
                msg.sender,
                tokenAmount,
                block.timestamp,
                defaultCliff,
                defaultDuration
            );
            emit TokensPurchasedWithVesting(msg.sender, tokenAmount, defaultCliff, defaultDuration);
        } else {
            saleToken.mint(msg.sender, tokenAmount);
        }

        emit TokensPurchasedWithETH(msg.sender, msg.value, usdEquivalent, tokenAmount);
    }

    // ============ OWNER CONTROLS ============

    /**
     * @notice Set sale active status (this is the explicit commence/stop signal)
     */
    function setActive(bool _active) external onlyOwner {
        active = _active;
        emit SaleStatusChanged(_active);
    }

    /**
     * @notice Update price (stable 6d per 1 FVC)
     */
    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert Sale__ZeroRate();
        rate = newRate;
        emit RateUpdated(newRate);
    }

    /**
     * @notice Set ETH/USD price (6 decimals). Set to 0 to disable ETH purchases.
     * @param newEthUsdRate USD per 1 ETH in 6 decimals (e.g. 2500e6 = $2,500)
     */
    function setEthUsdRate(uint256 newEthUsdRate) external onlyOwner {
        ethUsdRate = newEthUsdRate;
        emit EthUsdRateUpdated(newEthUsdRate);
    }

    /**
     * @notice Update total cap (stable 6d)
     */
    function setCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert Sale__ZeroCap();
        cap = newCap;
        emit CapUpdated(newCap);
    }

    /**
     * @notice Allow or disallow a stablecoin (e.g., USDC, USDT)
     * @param token Token address
     * @param allowed Whether token is accepted
     * @param decimals Token decimals (required if allowed=true)
     */
    function setAcceptedToken(address token, bool allowed, uint8 decimals) external onlyOwner {
        if (token == address(0)) revert Sale__ZeroAddress();
        if (allowed) {
            require(decimals > 0 && decimals <= 18, "Invalid decimals");
            tokenDecimals[token] = decimals;
        }
        isAccepted[token] = allowed;
        emit AcceptedTokenUpdated(token, allowed);
    }

    /**
     * @notice Configure vesting parameters (Gnosis Safe controlled)
     * @param _vestingContract TokenVesting contract address
     * @param _threshold Minimum purchase amount (6 decimals) to trigger vesting (e.g., 50_000e6 = £50k)
     * @param _cliff Cliff duration in seconds (e.g., 180 days)
     * @param _duration Total vesting duration in seconds (e.g., 730 days)
     */
    function setVestingConfig(
        address _vestingContract,
        uint256 _threshold,
        uint256 _cliff,
        uint256 _duration
    ) external onlyOwner {
        vestingContract = IVesting(_vestingContract);
        vestingThreshold = _threshold;
        defaultCliff = _cliff;
        defaultDuration = _duration;
        emit VestingConfigUpdated(_vestingContract, _threshold, _cliff, _duration);
    }

    /**
     * @notice Update vesting threshold only
     * @param _threshold New threshold (6 decimals)
     */
    function setVestingThreshold(uint256 _threshold) external onlyOwner {
        vestingThreshold = _threshold;
    }

    /**
     * @notice Update default vesting parameters
     * @param _cliff New cliff duration in seconds
     * @param _duration New total duration in seconds
     */
    function setDefaultVesting(uint256 _cliff, uint256 _duration) external onlyOwner {
        require(_cliff <= _duration, "Cliff > duration");
        defaultCliff = _cliff;
        defaultDuration = _duration;
    }
}
