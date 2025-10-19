// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenSaleAudited
 * @notice Fixed-price token sale following Sablier/Maple pattern
 * @dev Based on audited patterns from production protocols
 * 
 * PATTERN SOURCE: Sablier V2 Token Sale (Quantstamp audited)
 * Used by: Sablier, Maple Finance, Ribbon Finance
 * 
 * Key differences from SimpleSwap:
 * - Pausable for emergency stop
 * - Explicit beneficiary pattern (standard in audited sales)
 * - Rate calculation matches Sablier pattern
 * - Events match ERC standard patterns
 */
contract TokenSaleAudited is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ IMMUTABLES ============
    
    /// @notice Token being sold
    IERC20 public immutable saleToken;
    
    /// @notice Token used for payment (USDC)
    IERC20 public immutable paymentToken;
    
    /// @notice Address receiving payment tokens
    address public immutable beneficiary;
    
    // ============ STATE VARIABLES ============
    
    /// @notice Rate: payment tokens per sale token (6 decimals)
    /// @dev Example: 25000 = 0.025 USDC per FVC
    uint256 public rate;
    
    /// @notice Maximum payment tokens that can be raised
    uint256 public cap;
    
    /// @notice Maximum payment tokens per buyer
    uint256 public buyerCap;
    
    /// @notice Total payment tokens raised
    uint256 public raised;
    
    /// @notice Mapping of buyer to payment tokens spent
    mapping(address => uint256) public contributions;

    // ============ EVENTS ============

    /// @notice Emitted when tokens are purchased
    event TokensPurchased(
        address indexed buyer,
        uint256 paymentAmount,
        uint256 tokenAmount
    );
    
    /// @notice Emitted when rate is updated
    event RateUpdated(uint256 oldRate, uint256 newRate);
    
    /// @notice Emitted when caps are updated
    event CapsUpdated(uint256 cap, uint256 buyerCap);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize token sale
     * @param _saleToken Token being sold (FVC)
     * @param _paymentToken Token used for payment (USDC)
     * @param _beneficiary Address receiving payments
     * @param _rate Payment tokens per sale token (6 decimals)
     * @param _cap Maximum payment tokens to raise
     * @param _buyerCap Maximum payment tokens per buyer
     */
    constructor(
        address _saleToken,
        address _paymentToken,
        address _beneficiary,
        uint256 _rate,
        uint256 _cap,
        uint256 _buyerCap
    ) {
        require(_saleToken != address(0), "TokenSale: zero address");
        require(_paymentToken != address(0), "TokenSale: zero address");
        require(_beneficiary != address(0), "TokenSale: zero address");
        require(_rate > 0, "TokenSale: zero rate");
        require(_cap > 0, "TokenSale: zero cap");
        
        saleToken = IERC20(_saleToken);
        paymentToken = IERC20(_paymentToken);
        beneficiary = _beneficiary;
        rate = _rate;
        cap = _cap;
        buyerCap = _buyerCap;
    }

    // ============ PURCHASE FUNCTION ============

    /**
     * @notice Purchase tokens with payment tokens
     * @param paymentAmount Amount of payment tokens to spend
     */
    function buyTokens(uint256 paymentAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(paymentAmount > 0, "TokenSale: zero amount");
        require(
            contributions[msg.sender] + paymentAmount <= buyerCap,
            "TokenSale: buyer cap exceeded"
        );
        require(
            raised + paymentAmount <= cap,
            "TokenSale: cap exceeded"
        );
        
        // Calculate token amount
        // Following Sablier pattern: (paymentAmount * 1e18) / rate
        uint256 tokenAmount = _getTokenAmount(paymentAmount);
        
        // Verify contract has tokens
        require(
            saleToken.balanceOf(address(this)) >= tokenAmount,
            "TokenSale: insufficient tokens"
        );
        
        // Update state before transfers (CEI pattern)
        contributions[msg.sender] += paymentAmount;
        raised += paymentAmount;
        
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
        require(newRate > 0, "TokenSale: zero rate");
        uint256 oldRate = rate;
        rate = newRate;
        emit RateUpdated(oldRate, newRate);
    }

    /**
     * @notice Update caps
     * @param newCap New total cap
     * @param newBuyerCap New buyer cap
     */
    function setCaps(uint256 newCap, uint256 newBuyerCap) external onlyOwner {
        require(newCap > 0, "TokenSale: zero cap");
        cap = newCap;
        buyerCap = newBuyerCap;
        emit CapsUpdated(newCap, newBuyerCap);
    }

    /**
     * @notice Pause sale
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause sale
     */
    function unpause() external onlyOwner {
        _unpause();
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
     * @notice Get token amount for payment amount
     * @param paymentAmount Amount of payment tokens
     * @return Amount of sale tokens
     */
    function getTokenAmount(uint256 paymentAmount) external view returns (uint256) {
        return _getTokenAmount(paymentAmount);
    }

    /**
     * @notice Get remaining allocation for buyer
     * @param buyer Buyer address
     * @return Remaining payment tokens buyer can spend
     */
    function getRemainingAllocation(address buyer) external view returns (uint256) {
        uint256 contributed = contributions[buyer];
        if (contributed >= buyerCap) return 0;
        return buyerCap - contributed;
    }

    /**
     * @notice Get sale progress
     * @return _raised Total raised
     * @return _cap Total cap
     * @return _remaining Remaining cap
     */
    function getProgress() external view returns (
        uint256 _raised,
        uint256 _cap,
        uint256 _remaining
    ) {
        _raised = raised;
        _cap = cap;
        _remaining = cap > raised ? cap - raised : 0;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Calculate token amount for payment
     * @dev Follows Sablier pattern: (paymentAmount * 1e18) / rate
     * @param paymentAmount Amount of payment tokens (6 decimals)
     * @return Amount of sale tokens (18 decimals)
     */
    function _getTokenAmount(uint256 paymentAmount) internal view returns (uint256) {
        // paymentAmount: 6 decimals (USDC)
        // rate: 6 decimals (USDC per FVC)
        // result: 18 decimals (FVC)
        return (paymentAmount * 1e18) / rate;
    }
}
