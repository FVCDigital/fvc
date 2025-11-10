// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IFVC {
    function mint(address to, uint256 amount) external;
}

/**
 * @title TokenSale
 * @notice Fixed-price tranche sale accepting USDC/USDT, mints FVC on purchase
 * @dev Owner (Gnosis Safe) controls rate, cap, active state, and accepted tokens
 */
contract TokenSale is Ownable, ReentrancyGuard {
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

    // ============ EVENTS ============

    event TokensPurchased(address indexed buyer, address indexed stable, uint256 paymentAmount, uint256 tokenAmount);
    event RateUpdated(uint256 newRate);
    event CapUpdated(uint256 newCap);
    event SaleStatusChanged(bool active);
    event AcceptedTokenUpdated(address indexed token, bool allowed);

    // ============ ERRORS ============

    error Sale__Inactive();
    error Sale__ZeroAddress();
    error Sale__ZeroAmount();
    error Sale__ZeroRate();
    error Sale__ZeroCap();
    error Sale__CapExceeded();
    error Sale__TokenNotAccepted();

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
        if (raised + amount > cap) revert Sale__CapExceeded();

        // Calculate FVC amount, scaling 6d -> 18d
        uint256 tokenAmount = (amount * 1e18) / rate;

        // Effects
        raised += amount;

        // Interactions
        IERC20(stable).safeTransferFrom(msg.sender, beneficiary, amount);
        saleToken.mint(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, stable, amount, tokenAmount);
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
     * @notice Update total cap (stable 6d)
     */
    function setCap(uint256 newCap) external onlyOwner {
        if (newCap == 0) revert Sale__ZeroCap();
        cap = newCap;
        emit CapUpdated(newCap);
    }

    /**
     * @notice Allow or disallow a stablecoin (e.g., USDC, USDT)
     */
    function setAcceptedToken(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert Sale__ZeroAddress();
        isAccepted[token] = allowed;
        emit AcceptedTokenUpdated(token, allowed);
    }
}
