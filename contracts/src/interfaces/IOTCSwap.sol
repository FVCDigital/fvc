// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IOTCSwap
 * @notice Interface for FVC OTC swap functionality
 * @dev OTC swap interface for private token sales
 */
interface IOTCSwap {
    /**
     * @notice Sale configuration structure
     * @dev Contains all parameters for a sale round
     * @param isActive Whether the sale is currently active
     * @param merkleRoot Merkle root for allowlist verification
     * @param pricePerToken Price per FVC token in USDC (6 decimals)
     * @param totalCap Maximum USDC that can be raised
     * @param individualCap Maximum USDC per individual
     * @param totalRaised Total USDC raised so far
     * @param startTime Sale start timestamp
     * @param endTime Sale end timestamp
     */
    struct SaleConfig {
        bool isActive;
        bytes32 merkleRoot;
        uint256 pricePerToken;
        uint256 totalCap;
        uint256 individualCap;
        uint256 totalRaised;
        uint256 startTime;
        uint256 endTime;
    }

    /**
     * @notice Purchase order structure
     * @dev Contains order details for verification
     * @param buyer Address making the purchase
     * @param usdcAmount Amount of USDC to spend
     * @param fvcAmount Amount of FVC tokens to receive
     * @param deadline Order expiration timestamp
     * @param nonce Unique order identifier
     */
    struct PurchaseOrder {
        address buyer;
        uint256 usdcAmount;
        uint256 fvcAmount;
        uint256 deadline;
        uint256 nonce;
    }

    /**
     * @notice Purchase FVC tokens with USDC using Merkle proof
     * @dev Verifies allowlist eligibility and creates vesting schedule
     * @param usdcAmount Amount of USDC to spend
     * @param merkleProof Merkle proof for allowlist verification
     */
    function purchaseWithMerkleProof(
        uint256 usdcAmount,
        bytes32[] calldata merkleProof
    ) external;

    /**
     * @notice Purchase FVC tokens with signed order
     * @dev Purchase using cryptographic signatures
     * @param order Purchase order details
     * @param signature Admin signature approving the order
     */
    function purchaseWithSignedOrder(
        PurchaseOrder calldata order,
        bytes calldata signature
    ) external;

    /**
     * @notice Calculate FVC amount for given USDC amount
     * @dev Public function for front-end calculations
     * @param usdcAmount Amount of USDC to spend
     * @return Amount of FVC tokens that would be received
     */
    function calculateFVCAmount(uint256 usdcAmount) external view returns (uint256);

    /**
     * @notice Check if user is eligible to purchase
     * @dev Checks KYC status and purchase limits
     * @param user Address to check
     * @param usdcAmount Amount user wants to purchase
     * @return True if user can purchase the specified amount
     */
    function isEligibleToPurchase(address user, uint256 usdcAmount) external view returns (bool);

    /**
     * @notice Get remaining allocation for user
     * @dev Returns how much more USDC user can purchase
     * @param user Address to check
     * @return Remaining USDC allocation for user
     */
    function getRemainingAllocation(address user) external view returns (uint256);

    /**
     * @notice Emitted when a purchase is completed
     * @param buyer Address of the buyer
     * @param usdcAmount Amount of USDC spent
     * @param fvcAmount Amount of FVC tokens purchased
     * @param vestingScheduleId ID of created vesting schedule
     */
    event PurchaseCompleted(
        address indexed buyer, 
        uint256 usdcAmount, 
        uint256 fvcAmount, 
        uint256 vestingScheduleId
    );

    /**
     * @notice Emitted when sale configuration is updated
     * @param merkleRoot New Merkle root for allowlist
     * @param pricePerToken New price per token
     * @param totalCap New total cap
     * @param individualCap New individual cap
     */
    event SaleConfigUpdated(
        bytes32 merkleRoot, 
        uint256 pricePerToken, 
        uint256 totalCap, 
        uint256 individualCap
    );
}
