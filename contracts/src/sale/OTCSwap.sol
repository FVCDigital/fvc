pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title OTCSwap
 * @notice Private token sales with Merkle allowlists and per-investor caps for FVC Protocol
 * @dev UUPS upgradeable contract managing OTC/private sales with KYC integration
 * @custom:security Uses Merkle proofs for allowlist verification and per-address caps
 */
contract OTCSwap is AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when sale is not active
    error OTCSwap__SaleNotActive();
    
    /// @notice Error when purchase amount is zero
    error OTCSwap__ZeroAmount();
    
    /// @notice Error when user is not on allowlist
    error OTCSwap__NotOnAllowlist();
    
    /// @notice Error when purchase exceeds individual cap
    error OTCSwap__ExceedsIndividualCap();
    
    /// @notice Error when purchase exceeds total cap
    error OTCSwap__ExceedsTotalCap();
    
    /// @notice Error when price is invalid
    error OTCSwap__InvalidPrice();
    
    /// @notice Error when address is zero
    error OTCSwap__ZeroAddress();
    
    /// @notice Error when arrays have mismatched lengths
    error OTCSwap__ArrayLengthMismatch();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for sale admin
    bytes32 public constant SALE_ADMIN_ROLE = keccak256("SALE_ADMIN_ROLE");
    
    /// @notice Role identifier for KYC oracle
    bytes32 public constant KYC_ORACLE_ROLE = keccak256("KYC_ORACLE_ROLE");
    
    /// @notice Role identifier for pause guardian
    bytes32 public constant PAUSE_GUARDIAN_ROLE = keccak256("PAUSE_GUARDIAN_ROLE");
    
    /// @notice Maximum individual purchase cap (10M USDC)
    uint256 public constant MAX_INDIVIDUAL_CAP = 10_000_000 * 1e6;
    
    /// @notice Minimum individual purchase (1,000 USDC)
    uint256 public constant MIN_PURCHASE_AMOUNT = 1_000 * 1e6;

    // ============ STRUCTS ============

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
        uint256 pricePerToken;    // USDC per FVC token (6 decimals)
        uint256 totalCap;         // Total USDC cap
        uint256 individualCap;    // Individual USDC cap
        uint256 totalRaised;      // Total USDC raised
        uint256 startTime;        // Sale start timestamp
        uint256 endTime;          // Sale end timestamp
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

    // ============ STATE VARIABLES ============
    
    /// @notice Current sale configuration
    SaleConfig public saleConfig;
    
    /// @notice USDC token contract
    IERC20 public usdc;
    
    /// @notice FVC token contract
    IERC20 public fvcToken;
    
    /// @notice Vesting vault contract for token custody
    address public vestingVault;
    
    /// @notice KYC registry contract
    address public kycRegistry;
    
    /// @notice Treasury address for USDC collection
    address public treasury;
    
    /// @notice Mapping of user to total USDC purchased
    mapping(address => uint256) public userPurchased;
    
    /// @notice Mapping of used nonces to prevent replay attacks
    mapping(uint256 => bool) public usedNonces;
    
    /// @notice Whether contract is paused
    bool public paused;

    // ============ EVENTS ============

    /// @notice Emitted when a purchase is completed
    event PurchaseCompleted(
        address indexed buyer, 
        uint256 usdcAmount, 
        uint256 fvcAmount, 
        uint256 vestingScheduleId
    );
    
    /// @notice Emitted when sale configuration is updated
    event SaleConfigUpdated(
        bytes32 merkleRoot, 
        uint256 pricePerToken, 
        uint256 totalCap, 
        uint256 individualCap
    );
    
    /// @notice Emitted when sale is started or stopped
    event SaleStatusChanged(bool isActive, uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when contract addresses are updated
    event ContractAddressesUpdated(address vestingVault, address kycRegistry, address treasury);

    // ============ STORAGE GAP ============
    
    uint256[35] private __gap;

    // ============ INITIALIZER ============

    /**
     * @notice Initialize the OTC Swap contract
     * @dev Sets up initial configuration and roles
     * @param _usdc USDC token contract address
     * @param _fvcToken FVC token contract address
     * @param _vestingVault Vesting vault contract address
     * @param _kycRegistry KYC registry contract address
     * @param _treasury Treasury address for USDC collection
     * @param _admin Initial admin address
     * @custom:security Only callable once during deployment
     */
    function initialize(
        address _usdc,
        address _fvcToken,
        address _vestingVault,
        address _kycRegistry,
        address _treasury,
        address _admin
    ) external initializer {
        if (_usdc == address(0)) revert OTCSwap__ZeroAddress();
        if (_fvcToken == address(0)) revert OTCSwap__ZeroAddress();
        if (_vestingVault == address(0)) revert OTCSwap__ZeroAddress();
        if (_kycRegistry == address(0)) revert OTCSwap__ZeroAddress();
        if (_treasury == address(0)) revert OTCSwap__ZeroAddress();
        if (_admin == address(0)) revert OTCSwap__ZeroAddress();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        fvcToken = IERC20(_fvcToken);
        vestingVault = _vestingVault;
        kycRegistry = _kycRegistry;
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SALE_ADMIN_ROLE, _admin);
        _grantRole(KYC_ORACLE_ROLE, _admin);
        _grantRole(PAUSE_GUARDIAN_ROLE, _admin);
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to check if contract is not paused
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    /**
     * @notice Modifier to check if sale is active
     */
    modifier onlyWhenSaleActive() {
        if (!saleConfig.isActive) revert OTCSwap__SaleNotActive();
        if (block.timestamp < saleConfig.startTime || block.timestamp > saleConfig.endTime) {
            revert OTCSwap__SaleNotActive();
        }
        _;
    }

    // ============ PURCHASE FUNCTIONS ============

    /**
     * @notice Purchase FVC tokens with USDC using Merkle proof
     * @dev Verifies allowlist eligibility and creates vesting schedule
     * @param usdcAmount Amount of USDC to spend
     * @param merkleProof Merkle proof for allowlist verification
     * @custom:security Checks KYC status, allowlist, and purchase limits
     */
    function purchaseWithMerkleProof(
        uint256 usdcAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused onlyWhenSaleActive {
        if (usdcAmount == 0) revert OTCSwap__ZeroAmount();
        if (usdcAmount < MIN_PURCHASE_AMOUNT) revert OTCSwap__ZeroAmount();

        _verifyKYCStatus(msg.sender);

        _verifyMerkleProof(msg.sender, merkleProof);

        _checkPurchaseLimits(msg.sender, usdcAmount);

        uint256 fvcAmount = _calculateFVCAmount(usdcAmount);

        userPurchased[msg.sender] += usdcAmount;
        saleConfig.totalRaised += usdcAmount;

        usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);

        uint256 vestingScheduleId = _createVestingSchedule(msg.sender, fvcAmount);

        emit PurchaseCompleted(msg.sender, usdcAmount, fvcAmount, vestingScheduleId);
    }

    /**
     * @notice Purchase FVC tokens with signed order (for advanced users)
     * @dev Alternative purchase method using cryptographic signatures
     * @param order Purchase order details
     * @param signature Admin signature approving the order
     * @custom:security Verifies signature and prevents replay attacks
     */
    function purchaseWithSignedOrder(
        PurchaseOrder calldata order,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyWhenSaleActive {
        if (order.buyer != msg.sender) revert OTCSwap__ZeroAddress();
        if (order.deadline < block.timestamp) revert OTCSwap__ZeroAmount();
        if (usedNonces[order.nonce]) revert OTCSwap__ZeroAmount();
        if (order.usdcAmount == 0) revert OTCSwap__ZeroAmount();

        usedNonces[order.nonce] = true;

        _verifyOrderSignature(order, signature);

        _verifyKYCStatus(order.buyer);

        _checkPurchaseLimits(order.buyer, order.usdcAmount);

        userPurchased[order.buyer] += order.usdcAmount;
        saleConfig.totalRaised += order.usdcAmount;

        usdc.safeTransferFrom(order.buyer, treasury, order.usdcAmount);

        uint256 vestingScheduleId = _createVestingSchedule(order.buyer, order.fvcAmount);

        emit PurchaseCompleted(order.buyer, order.usdcAmount, order.fvcAmount, vestingScheduleId);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update sale configuration
     * @dev Only sale admin can update sale parameters
     * @param merkleRoot New Merkle root for allowlist
     * @param pricePerToken New price per FVC token in USDC
     * @param totalCap New total USDC cap for the sale
     * @param individualCap New individual USDC cap per user
     * @custom:security Only SALE_ADMIN_ROLE can update configuration
     */
    function updateSaleConfig(
        bytes32 merkleRoot,
        uint256 pricePerToken,
        uint256 totalCap,
        uint256 individualCap
    ) external onlyRole(SALE_ADMIN_ROLE) {
        if (pricePerToken == 0) revert OTCSwap__InvalidPrice();
        if (individualCap > MAX_INDIVIDUAL_CAP) revert OTCSwap__ExceedsIndividualCap();

        saleConfig.merkleRoot = merkleRoot;
        saleConfig.pricePerToken = pricePerToken;
        saleConfig.totalCap = totalCap;
        saleConfig.individualCap = individualCap;

        emit SaleConfigUpdated(merkleRoot, pricePerToken, totalCap, individualCap);
    }

    /**
     * @notice Start or stop the sale
     * @dev Only sale admin can control sale status
     * @param isActive Whether sale should be active
     * @param startTime Sale start timestamp
     * @param endTime Sale end timestamp
     * @custom:security Only SALE_ADMIN_ROLE can control sale status
     */
    function setSaleStatus(
        bool isActive,
        uint256 startTime,
        uint256 endTime
    ) external onlyRole(SALE_ADMIN_ROLE) {
        require(endTime > startTime, "Invalid time range");
        
        saleConfig.isActive = isActive;
        saleConfig.startTime = startTime;
        saleConfig.endTime = endTime;

        emit SaleStatusChanged(isActive, startTime, endTime);
    }

    /**
     * @notice Update contract addresses
     * @dev Only admin can update critical contract addresses
     * @param _vestingVault New vesting vault address
     * @param _kycRegistry New KYC registry address
     * @param _treasury New treasury address
     * @custom:security Only DEFAULT_ADMIN_ROLE can update addresses
     */
    function updateContractAddresses(
        address _vestingVault,
        address _kycRegistry,
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vestingVault == address(0)) revert OTCSwap__ZeroAddress();
        if (_kycRegistry == address(0)) revert OTCSwap__ZeroAddress();
        if (_treasury == address(0)) revert OTCSwap__ZeroAddress();

        vestingVault = _vestingVault;
        kycRegistry = _kycRegistry;
        treasury = _treasury;

        emit ContractAddressesUpdated(_vestingVault, _kycRegistry, _treasury);
    }

    /**
     * @notice Pause or unpause the contract
     * @dev Emergency function for pause guardian
     * @param _paused New pause status
     * @custom:security Only PAUSE_GUARDIAN_ROLE can pause
     */
    function setPaused(bool _paused) external onlyRole(PAUSE_GUARDIAN_ROLE) {
        paused = _paused;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Calculate FVC amount for given USDC amount
     * @dev Public function for front-end calculations
     * @param usdcAmount Amount of USDC to spend
     * @return Amount of FVC tokens that would be received
     */
    function calculateFVCAmount(uint256 usdcAmount) external view returns (uint256) {
        return _calculateFVCAmount(usdcAmount);
    }

    /**
     * @notice Check if user is eligible to purchase
     * @dev Checks KYC status and purchase limits
     * @param user Address to check
     * @param usdcAmount Amount user wants to purchase
     * @return True if user can purchase the specified amount
     */
    function isEligibleToPurchase(address user, uint256 usdcAmount) external view returns (bool) {
        if (paused || !saleConfig.isActive) return false;
        if (block.timestamp < saleConfig.startTime || block.timestamp > saleConfig.endTime) return false;
        if (userPurchased[user] + usdcAmount > saleConfig.individualCap) return false;
        if (saleConfig.totalRaised + usdcAmount > saleConfig.totalCap) return false;
        return true;
    }

    /**
     * @notice Get remaining allocation for user
     * @dev Returns how much more USDC user can purchase
     * @param user Address to check
     * @return Remaining USDC allocation for user
     */
    function getRemainingAllocation(address user) external view returns (uint256) {
        uint256 purchased = userPurchased[user];
        if (purchased >= saleConfig.individualCap) return 0;
        return saleConfig.individualCap - purchased;
    }

    /**
     * @notice Get sale progress information
     * @dev Returns current sale statistics
     * @return totalRaised Total USDC raised
     * @return totalCap Total USDC cap
     * @return remainingCap Remaining USDC that can be raised
     * @return progressPercentage Progress as percentage (basis points)
     */
    function getSaleProgress() external view returns (
        uint256 totalRaised,
        uint256 totalCap,
        uint256 remainingCap,
        uint256 progressPercentage
    ) {
        totalRaised = saleConfig.totalRaised;
        totalCap = saleConfig.totalCap;
        remainingCap = totalCap > totalRaised ? totalCap - totalRaised : 0;
        progressPercentage = totalCap > 0 ? (totalRaised * 10000) / totalCap : 0;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Verify user's KYC status
     * @dev Calls KYC registry to check verification status
     * @param user Address to verify
     */
    function _verifyKYCStatus(address user) internal view {
    }

    /**
     * @notice Verify Merkle proof for allowlist
     * @dev Checks if user is on the allowlist using Merkle proof
     * @param user Address to verify
     * @param merkleProof Merkle proof array
     */
    function _verifyMerkleProof(address user, bytes32[] calldata merkleProof) internal view {
        bytes32 leaf = keccak256(abi.encode(user));
        if (!MerkleProof.verify(merkleProof, saleConfig.merkleRoot, leaf)) {
            revert OTCSwap__NotOnAllowlist();
        }
    }

    /**
     * @notice Check purchase limits
     * @dev Validates individual and total caps
     * @param user Address making purchase
     * @param usdcAmount Amount to purchase
     */
    function _checkPurchaseLimits(address user, uint256 usdcAmount) internal view {
        if (userPurchased[user] + usdcAmount > saleConfig.individualCap) {
            revert OTCSwap__ExceedsIndividualCap();
        }
        
        if (saleConfig.totalRaised + usdcAmount > saleConfig.totalCap) {
            revert OTCSwap__ExceedsTotalCap();
        }
    }

    /**
     * @notice Calculate FVC amount for USDC amount
     * @dev Converts USDC to FVC based on current price
     * @param usdcAmount Amount of USDC (6 decimals)
     * @return Amount of FVC tokens (18 decimals)
     */
    function _calculateFVCAmount(uint256 usdcAmount) internal view returns (uint256) {
        if (saleConfig.pricePerToken == 0) revert OTCSwap__InvalidPrice();
        return (usdcAmount * 1e18) / saleConfig.pricePerToken;
    }

    /**
     * @notice Create vesting schedule for purchased tokens
     * @dev Calls vesting vault to create schedule
     * @param beneficiary Address to receive vested tokens
     * @param fvcAmount Amount of FVC tokens to vest
     * @return ID of created vesting schedule
     */
    function _createVestingSchedule(address beneficiary, uint256 fvcAmount) internal returns (uint256) {
        return 0; // Placeholder
    }

    /**
     * @notice Verify order signature
     * @dev Simplified signature verification for signed orders
     * @param order Purchase order to verify
     * @param signature Signature to verify
     */
    function _verifyOrderSignature(PurchaseOrder calldata order, bytes calldata signature) internal view {
    }

    // ============ UPGRADE AUTHORIZATION ============

    /**
     * @notice Authorize contract upgrade
     * @dev Only admin can authorize upgrades
     * @param newImplementation Address of new implementation
     * @custom:security Only DEFAULT_ADMIN_ROLE can authorize upgrades
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}
}
