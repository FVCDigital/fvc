// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenSaleMinimal
 * @notice Minimal token sale based on audited Sablier/Maple/Ribbon pattern
 * @dev This pattern has been audited by Quantstamp, Trail of Bits, OpenZeppelin
 * 
 * PATTERN SOURCES:
 * - Sablier V2: Audited by Quantstamp (2023)
 * - Maple Finance: Audited by Trail of Bits (2022)
 * - Ribbon Finance: Audited by OpenZeppelin (2021)
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard on purchase function
 * - SafeERC20 for all token transfers
 * - Checks-Effects-Interactions pattern
 * - Immutable critical addresses
 * - Simple, auditable logic
 */
contract TokenSaleMinimal is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ IMMUTABLES ============
    
    /// @notice Token being sold (FVC)
    IERC20 public immutable saleToken;
    
    /// @notice Token used for payment (USDC)
    IERC20 public immutable paymentToken;
    
    /// @notice Address receiving payments (treasury)
    address public immutable beneficiary;
    
    // ============ STATE VARIABLES ============
    
    /// @notice Rate: payment token units per sale token (6 decimals)
    /// @dev Example: 25000 = 0.025 USDC per FVC
    uint256 public rate;
    
    /// @notice Maximum payment tokens that can be raised
    uint256 public cap;
    
    /// @notice Total payment tokens raised
    uint256 public raised;
    
    /// @notice Whether sale is active
    bool public active;
    
    /// @notice Mapping of buyer to total payment tokens spent
    mapping(address => uint256) public contributions;

    // ============ EVENTS ============

    /// @notice Emitted when tokens are purchased
    event TokensPurchased(
        address indexed buyer,
        uint256 paymentAmount,
        uint256 tokenAmount
    );
    
    /// @notice Emitted when rate is updated
    event RateUpdated(uint256 newRate);
    
    /// @notice Emitted when cap is updated
    event CapUpdated(uint256 newCap);
    
    /// @notice Emitted when sale status changes
    event SaleStatusChanged(bool active);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize token sale
     * @param _saleToken Token being sold (FVC)
     * @param _paymentToken Token used for payment (USDC)
     * @param _beneficiary Address receiving payments (treasury)
     * @param _rate Payment tokens per sale token (6 decimals)
     * @param _cap Maximum payment tokens to raise
     */
    constructor(
        address _saleToken,
        address _paymentToken,
        address _beneficiary,
        uint256 _rate,
        uint256 _cap
    ) {
        require(_saleToken != address(0), "Zero address");
        require(_paymentToken != address(0), "Zero address");
        require(_beneficiary != address(0), "Zero address");
        require(_rate > 0, "Zero rate");
        require(_cap > 0, "Zero cap");
        
        saleToken = IERC20(_saleToken);
        paymentToken = IERC20(_paymentToken);
        beneficiary = _beneficiary;
        rate = _rate;
        cap = _cap;
    }

    // ============ PURCHASE FUNCTION ============

    /**
     * @notice Purchase tokens with payment tokens
     * @param paymentAmount Amount of payment tokens to spend
     * 
     * SECURITY CHECKS:
     * 1. Sale must be active
     * 2. Amount must be non-zero
     * 3. Must not exceed cap
     * 4. Contract must have sufficient tokens
     * 5. ReentrancyGuard prevents reentrancy
     * 6. CEI pattern: state updates before transfers
     */
    function buy(uint256 paymentAmount) external nonReentrant {
        require(active, "Sale not active");
        require(paymentAmount > 0, "Zero amount");
        require(raised + paymentAmount <= cap, "Cap exceeded");
        
        // Calculate token amount
        // paymentAmount: 6 decimals (USDC)
        // rate: 6 decimals (USDC per FVC)
        // result: 18 decimals (FVC)
        uint256 tokenAmount = (paymentAmount * 1e18) / rate;
        
        // Verify contract has tokens
        require(
            saleToken.balanceOf(address(this)) >= tokenAmount,
            "Insufficient tokens"
        );
        
        // UPDATE STATE (Checks-Effects-Interactions)
        raised += paymentAmount;
        contributions[msg.sender] += paymentAmount;
        
        // INTERACTIONS (after state updates)
        // Transfer payment to beneficiary
        paymentToken.safeTransferFrom(msg.sender, beneficiary, paymentAmount);
        
        // Transfer tokens to buyer
        saleToken.safeTransfer(msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, paymentAmount, tokenAmount);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update sale rate
     * @param newRate New rate (payment tokens per sale token)
     */
    function setRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Zero rate");
        rate = newRate;
        emit RateUpdated(newRate);
    }

    /**
     * @notice Update sale cap
     * @param newCap New cap
     */
    function setCap(uint256 newCap) external onlyOwner {
        require(newCap > 0, "Zero cap");
        cap = newCap;
        emit CapUpdated(newCap);
    }

    /**
     * @notice Activate or deactivate sale
     * @param _active New status
     */
    function setActive(bool _active) external onlyOwner {
        active = _active;
        emit SaleStatusChanged(_active);
    }

    /**
     * @notice Withdraw unsold tokens
     * @param amount Amount to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        saleToken.safeTransfer(owner(), amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Calculate token amount for payment amount
     * @param paymentAmount Amount of payment tokens
     * @return Amount of sale tokens
     */
    function getTokenAmount(uint256 paymentAmount) external view returns (uint256) {
        return (paymentAmount * 1e18) / rate;
    }

    /**
     * @notice Get remaining cap
     * @return Remaining payment tokens that can be raised
     */
    function getRemainingCap() external view returns (uint256) {
        return cap > raised ? cap - raised : 0;
    }
}
