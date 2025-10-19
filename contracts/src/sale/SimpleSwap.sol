// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SimpleSwap
 * @notice Direct USDC → FVC swap for staking MVP
 * @dev Minimal swap contract with fixed price and caps
 */
contract SimpleSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============
    
    /// @notice USDC token (6 decimals)
    IERC20 public immutable usdc;
    
    /// @notice FVC token (18 decimals)
    IERC20 public immutable fvcToken;
    
    /// @notice Treasury address receiving USDC
    address public immutable treasury;
    
    /// @notice Price per FVC in USDC (6 decimals)
    /// @dev Example: 25000 = $0.025 per FVC
    uint256 public pricePerFVC;
    
    /// @notice Maximum USDC that can be raised
    uint256 public totalCap;
    
    /// @notice Maximum USDC per user
    uint256 public individualCap;
    
    /// @notice Total USDC raised so far
    uint256 public totalRaised;
    
    /// @notice Whether swap is active
    bool public isActive;
    
    /// @notice Mapping of user to total USDC spent
    mapping(address => uint256) public userPurchased;

    // ============ EVENTS ============

    event Swap(address indexed buyer, uint256 usdcAmount, uint256 fvcAmount);
    event SwapConfigured(uint256 pricePerFVC, uint256 totalCap, uint256 individualCap);
    event SwapStatusChanged(bool isActive);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the swap contract
     * @param _usdc USDC token address
     * @param _fvcToken FVC token address
     * @param _treasury Treasury address receiving USDC
     * @param _pricePerFVC Price per FVC in USDC (6 decimals)
     * @param _totalCap Maximum USDC that can be raised
     * @param _individualCap Maximum USDC per user
     */
    constructor(
        address _usdc,
        address _fvcToken,
        address _treasury,
        uint256 _pricePerFVC,
        uint256 _totalCap,
        uint256 _individualCap
    ) {
        require(_usdc != address(0), "Zero address");
        require(_fvcToken != address(0), "Zero address");
        require(_treasury != address(0), "Zero address");
        require(_pricePerFVC > 0, "Invalid price");
        
        usdc = IERC20(_usdc);
        fvcToken = IERC20(_fvcToken);
        treasury = _treasury;
        pricePerFVC = _pricePerFVC;
        totalCap = _totalCap;
        individualCap = _individualCap;
    }

    // ============ SWAP FUNCTION ============

    /**
     * @notice Swap USDC for FVC tokens
     * @param usdcAmount Amount of USDC to spend (6 decimals)
     */
    function swap(uint256 usdcAmount) external nonReentrant {
        require(isActive, "Swap not active");
        require(usdcAmount > 0, "Zero amount");
        require(userPurchased[msg.sender] + usdcAmount <= individualCap, "Exceeds individual cap");
        require(totalRaised + usdcAmount <= totalCap, "Exceeds total cap");
        
        // Calculate FVC amount
        // usdcAmount has 6 decimals, pricePerFVC has 6 decimals
        // Result needs 18 decimals for FVC
        uint256 fvcAmount = (usdcAmount * 1e18) / pricePerFVC;
        
        // Check contract has enough FVC
        require(fvcToken.balanceOf(address(this)) >= fvcAmount, "Insufficient FVC");
        
        // Update state
        userPurchased[msg.sender] += usdcAmount;
        totalRaised += usdcAmount;
        
        // Transfer USDC from user to treasury
        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);
        
        // Transfer FVC to user
        fvcToken.safeTransfer(msg.sender, fvcAmount);
        
        emit Swap(msg.sender, usdcAmount, fvcAmount);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update swap configuration
     * @param _pricePerFVC New price per FVC in USDC (6 decimals)
     * @param _totalCap New total cap
     * @param _individualCap New individual cap
     */
    function configure(
        uint256 _pricePerFVC,
        uint256 _totalCap,
        uint256 _individualCap
    ) external onlyOwner {
        require(_pricePerFVC > 0, "Invalid price");
        
        pricePerFVC = _pricePerFVC;
        totalCap = _totalCap;
        individualCap = _individualCap;
        
        emit SwapConfigured(_pricePerFVC, _totalCap, _individualCap);
    }

    /**
     * @notice Activate or deactivate swap
     * @param _isActive New status
     */
    function setActive(bool _isActive) external onlyOwner {
        isActive = _isActive;
        emit SwapStatusChanged(_isActive);
    }

    /**
     * @notice Emergency withdraw FVC tokens
     * @param amount Amount to withdraw
     */
    function withdrawFVC(uint256 amount) external onlyOwner {
        fvcToken.safeTransfer(owner(), amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Calculate FVC amount for given USDC
     * @param usdcAmount Amount of USDC (6 decimals)
     * @return Amount of FVC (18 decimals)
     */
    function calculateFVC(uint256 usdcAmount) external view returns (uint256) {
        return (usdcAmount * 1e18) / pricePerFVC;
    }

    /**
     * @notice Get remaining allocation for user
     * @param user User address
     * @return Remaining USDC user can spend
     */
    function getRemainingAllocation(address user) external view returns (uint256) {
        uint256 purchased = userPurchased[user];
        if (purchased >= individualCap) return 0;
        return individualCap - purchased;
    }

    /**
     * @notice Get swap progress
     * @return raised Total USDC raised
     * @return cap Total cap
     * @return remaining Remaining cap
     */
    function getProgress() external view returns (
        uint256 raised,
        uint256 cap,
        uint256 remaining
    ) {
        raised = totalRaised;
        cap = totalCap;
        remaining = cap > raised ? cap - raised : 0;
    }
}
