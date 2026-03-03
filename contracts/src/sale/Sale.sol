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
    ) external returns (uint256 scheduleId);
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title Sale
 * @notice Fixed-price tranche sale accepting USDC/USDT and native ETH, mints FVC on purchase.
 * @dev ETH/USD price is sourced from a Chainlink AggregatorV3 price feed.
 *      If the feed is stale (> stalenessThreshold seconds) or address(0), the contract
 *      falls back to the owner-set ethUsdRate manual override.
 *      Large purchases (>= vestingThreshold) are automatically vested via the Vesting contract.
 */
contract Sale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ IMMUTABLES ============

    IFVC public immutable saleToken;
    address public immutable beneficiary;

    // ============ CHAINLINK ============

    /// @notice Chainlink ETH/USD price feed (8 decimals). address(0) = disabled.
    AggregatorV3Interface public priceFeed;

    /// @notice Maximum age of a Chainlink answer before it is considered stale (default 1 hour)
    uint256 public stalenessThreshold = 1 hours;

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

    /// @notice Vesting contract address (optional)
    IVesting public vestingContract;

    /// @notice Manual ETH/USD fallback (6 decimals, e.g. 2500e6 = $2,500).
    ///         Used when priceFeed is address(0) or its answer is stale.
    ///         Set to 0 to disable ETH purchases entirely when oracle is also absent.
    uint256 public ethUsdRate;

    /// @notice Minimum purchase (6 decimals) to trigger vesting
    uint256 public vestingThreshold;

    /// @notice Default vesting cliff in seconds
    uint256 public defaultCliff;

    /// @notice Default vesting total duration in seconds
    uint256 public defaultDuration;

    // ============ EVENTS ============

    event TokensPurchased(address indexed buyer, address indexed stable, uint256 paymentAmount, uint256 tokenAmount);
    event TokensPurchasedWithETH(address indexed buyer, uint256 ethAmount, uint256 usdEquivalent, uint256 tokenAmount);
    event TokensPurchasedWithVesting(address indexed buyer, uint256 tokenAmount, uint256 cliff, uint256 duration);
    event RateUpdated(uint256 newRate);
    event CapUpdated(uint256 newCap);
    event EthUsdRateUpdated(uint256 newEthUsdRate);
    event PriceFeedUpdated(address newPriceFeed);
    event StalenessThresholdUpdated(uint256 newThreshold);
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
    error Sale__OracleInvalidPrice();

    // ============ CONSTRUCTOR ============

    /**
     * @param _saleToken    FVC token address
     * @param _beneficiary  Treasury address (Gnosis Safe)
     * @param _initialRate  Stable units (6d) per 1 FVC (18d)
     * @param _initialCap   Maximum stable (6d) to raise
     * @param _priceFeed    Chainlink ETH/USD AggregatorV3 address (address(0) to disable oracle)
     */
    constructor(
        address _saleToken,
        address _beneficiary,
        uint256 _initialRate,
        uint256 _initialCap,
        address _priceFeed
    ) {
        if (_saleToken == address(0) || _beneficiary == address(0)) revert Sale__ZeroAddress();
        if (_initialRate == 0) revert Sale__ZeroRate();
        if (_initialCap == 0) revert Sale__ZeroCap();

        saleToken = IFVC(_saleToken);
        beneficiary = _beneficiary;
        rate = _initialRate;
        cap = _initialCap;

        if (_priceFeed != address(0)) {
            priceFeed = AggregatorV3Interface(_priceFeed);
        }

        transferOwnership(_beneficiary);
    }

    // ============ PURCHASE ============

    /**
     * @notice Buy FVC with an accepted stablecoin at the fixed rate.
     */
    function buy(address stable, uint256 amount) external nonReentrant {
        if (!active) revert Sale__Inactive();
        if (!isAccepted[stable]) revert Sale__TokenNotAccepted();
        if (amount == 0) revert Sale__ZeroAmount();

        uint8 dec = tokenDecimals[stable];
        require(dec > 0, "Token decimals not configured");

        uint256 normalizedAmount = dec == 6
            ? amount
            : (dec < 6 ? amount * 10 ** (6 - dec) : amount / 10 ** (dec - 6));

        if (raised + normalizedAmount > cap) revert Sale__CapExceeded();

        uint256 tokenAmount = (normalizedAmount * 1e18) / rate;

        raised += normalizedAmount;

        IERC20(stable).safeTransferFrom(msg.sender, beneficiary, amount);

        _mintOrVest(msg.sender, tokenAmount, normalizedAmount);

        if (
            address(vestingContract) != address(0) &&
            (vestingThreshold == 0 || normalizedAmount >= vestingThreshold)
        ) {
            emit TokensPurchasedWithVesting(msg.sender, tokenAmount, defaultCliff, defaultDuration);
        } else {
            emit TokensPurchased(msg.sender, stable, amount, tokenAmount);
        }
    }

    /**
     * @notice Buy FVC with native ETH.
     * @dev Price sourced from Chainlink oracle. Falls back to ethUsdRate if oracle is
     *      absent or stale. Reverts if neither source is available.
     */
    function buyWithETH() external payable nonReentrant {
        if (!active) revert Sale__Inactive();
        if (msg.value == 0) revert Sale__ZeroAmount();

        uint256 usdPerEth = _getEthUsdPrice();
        if (usdPerEth == 0) revert Sale__EthNotEnabled();

        uint256 usdEquivalent = (msg.value * usdPerEth) / 1e18;
        if (usdEquivalent == 0) revert Sale__ZeroAmount();
        if (raised + usdEquivalent > cap) revert Sale__CapExceeded();

        uint256 tokenAmount = (usdEquivalent * 1e18) / rate;

        raised += usdEquivalent;

        (bool sent, ) = beneficiary.call{value: msg.value}("");
        if (!sent) revert Sale__EthTransferFailed();

        _mintOrVest(msg.sender, tokenAmount, usdEquivalent);

        emit TokensPurchasedWithETH(msg.sender, msg.value, usdEquivalent, tokenAmount);

        if (
            address(vestingContract) != address(0) &&
            (vestingThreshold == 0 || usdEquivalent >= vestingThreshold)
        ) {
            emit TokensPurchasedWithVesting(msg.sender, tokenAmount, defaultCliff, defaultDuration);
        }
    }

    // ============ OWNER CONTROLS ============

    function setActive(bool _active) external onlyOwner {
        active = _active;
        emit SaleStatusChanged(_active);
    }

    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert Sale__ZeroRate();
        rate = newRate;
        emit RateUpdated(newRate);
    }

    /**
     * @notice Set the manual ETH/USD fallback rate (6 decimals).
     *         Set to 0 to disable ETH purchases when oracle is also absent.
     */
    function setEthUsdRate(uint256 newEthUsdRate) external onlyOwner {
        ethUsdRate = newEthUsdRate;
        emit EthUsdRateUpdated(newEthUsdRate);
    }

    /**
     * @notice Update the Chainlink price feed address. Pass address(0) to rely solely on manual rate.
     */
    function setPriceFeed(address newFeed) external onlyOwner {
        priceFeed = AggregatorV3Interface(newFeed);
        emit PriceFeedUpdated(newFeed);
    }

    /**
     * @notice Update the maximum age of an oracle answer before it is treated as stale.
     */
    function setStalenessThreshold(uint256 newThreshold) external onlyOwner {
        stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(newThreshold);
    }

    function setCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert Sale__ZeroCap();
        cap = newCap;
        emit CapUpdated(newCap);
    }

    function setAcceptedToken(address token, bool allowed, uint8 decimals_) external onlyOwner {
        if (token == address(0)) revert Sale__ZeroAddress();
        if (allowed) {
            require(decimals_ > 0 && decimals_ <= 18, "Invalid decimals");
            tokenDecimals[token] = decimals_;
        }
        isAccepted[token] = allowed;
        emit AcceptedTokenUpdated(token, allowed);
    }

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

    function setVestingThreshold(uint256 _threshold) external onlyOwner {
        vestingThreshold = _threshold;
    }

    function setDefaultVesting(uint256 _cliff, uint256 _duration) external onlyOwner {
        require(_cliff <= _duration, "Cliff > duration");
        defaultCliff = _cliff;
        defaultDuration = _duration;
    }

    /**
     * @notice OTC mint: owner mints FVC to any wallet with optional custom vesting.
     *         Payment is off-chain. Does not increment raised.
     */
    function mintOTC(
        address recipient,
        uint256 fvcAmount,
        uint256 cliff,
        uint256 duration
    ) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert Sale__ZeroAddress();
        if (fvcAmount == 0) revert Sale__ZeroAmount();

        if (duration > 0 && address(vestingContract) != address(0)) {
            require(cliff <= duration, "Cliff > duration");
            saleToken.mint(address(vestingContract), fvcAmount);
            vestingContract.createVestingSchedule(
                recipient,
                fvcAmount,
                block.timestamp,
                cliff,
                duration
            );
            emit TokensPurchasedWithVesting(recipient, fvcAmount, cliff, duration);
        } else {
            saleToken.mint(recipient, fvcAmount);
            emit TokensPurchased(recipient, address(0), 0, fvcAmount);
        }
    }

    // ============ VIEWS ============

    /**
     * @notice Returns the current ETH/USD price (6 decimals) from oracle or fallback.
     *         Returns 0 if neither source is available (ETH purchases will revert).
     */
    function getEthUsdPrice() external view returns (uint256 price, bool fromOracle) {
        (price, fromOracle) = _getEthUsdPriceWithSource();
    }

    // ============ INTERNAL ============

    function _mintOrVest(address buyer, uint256 tokenAmount, uint256 normalizedUsd) internal {
        if (
            address(vestingContract) != address(0) &&
            (vestingThreshold == 0 || normalizedUsd >= vestingThreshold)
        ) {
            saleToken.mint(address(vestingContract), tokenAmount);
            vestingContract.createVestingSchedule(
                buyer,
                tokenAmount,
                block.timestamp,
                defaultCliff,
                defaultDuration
            );
        } else {
            saleToken.mint(buyer, tokenAmount);
        }
    }

    /**
     * @dev Returns ETH/USD price in 6 decimals.
     *      Priority: live oracle → manual fallback → 0 (disabled).
     *      Oracle is skipped if address(0) or answer is stale/non-positive.
     */
    function _getEthUsdPrice() internal view returns (uint256) {
        (uint256 price, ) = _getEthUsdPriceWithSource();
        return price;
    }

    function _getEthUsdPriceWithSource() internal view returns (uint256 price, bool fromOracle) {
        if (address(priceFeed) != address(0)) {
            try priceFeed.latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                bool fresh = (block.timestamp - updatedAt) <= stalenessThreshold;
                if (answer > 0 && fresh) {
                    uint8 feedDecimals = priceFeed.decimals();
                    // Normalise to 6 decimals
                    if (feedDecimals >= 6) {
                        price = uint256(answer) / 10 ** (feedDecimals - 6);
                    } else {
                        price = uint256(answer) * 10 ** (6 - feedDecimals);
                    }
                    return (price, true);
                }
            } catch {}
        }
        // Fallback to manual rate
        return (ethUsdRate, false);
    }
}
