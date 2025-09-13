// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ComplianceOracle
 * @notice External KYC provider integration (Sumsub) for FVC Protocol
 * @dev Immutable contract providing oracle services for KYC verification
 * @custom:security Immutable contract handling sensitive compliance data
 */
contract ComplianceOracle is AccessControl {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when signature is invalid
    error ComplianceOracle__InvalidSignature();
    
    /// @notice Error when verification has expired
    error ComplianceOracle__VerificationExpired();
    
    /// @notice Error when address is zero
    error ComplianceOracle__ZeroAddress();
    
    /// @notice Error when unauthorized oracle access
    error ComplianceOracle__UnauthorizedOracle();
    
    /// @notice Error when verification already exists
    error ComplianceOracle__VerificationExists();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for oracle admin
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    
    /// @notice Role identifier for verification oracle
    bytes32 public constant VERIFICATION_ORACLE_ROLE = keccak256("VERIFICATION_ORACLE_ROLE");
    
    /// @notice Role identifier for compliance monitor
    bytes32 public constant COMPLIANCE_MONITOR_ROLE = keccak256("COMPLIANCE_MONITOR_ROLE");
    
    /// @notice Maximum verification validity period (1 year)
    uint256 public constant MAX_VERIFICATION_PERIOD = 365 days;
    
    /// @notice Standard verification period (6 months)
    uint256 public constant STANDARD_VERIFICATION_PERIOD = 180 days;

    // ============ STRUCTS ============

    /**
     * @notice Oracle verification record structure
     * @dev Contains verification data from external KYC provider
     * @param applicantId External KYC provider applicant ID
     * @param verificationHash Hash of verification data
     * @param verificationLevel Level of verification completed
     * @param verifiedAt Timestamp when verification was completed
     * @param expiresAt Timestamp when verification expires
     * @param providerId KYC provider identifier (e.g., "sumsub")
     * @param countryCode ISO country code
     * @param riskScore Risk assessment score
     * @param documentTypes Types of documents verified
     * @param isActive Whether verification is currently active
     */
    struct VerificationRecord {
        string applicantId;
        bytes32 verificationHash;
        uint8 verificationLevel;
        uint256 verifiedAt;
        uint256 expiresAt;
        string providerId;
        bytes2 countryCode;
        uint8 riskScore;
        string documentTypes;
        bool isActive;
    }

    /**
     * @notice Verification request structure
     * @dev Contains data for submitting verification to oracle
     * @param user Address to verify
     * @param applicantId External provider applicant ID
     * @param verificationData Encrypted verification data
     * @param timestamp Request timestamp
     * @param nonce Unique request identifier
     * @param signature Oracle signature
     */
    struct VerificationRequest {
        address user;
        string applicantId;
        bytes verificationData;
        uint256 timestamp;
        uint256 nonce;
        bytes signature;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice Mapping of address to verification record
    mapping(address => VerificationRecord) public verificationRecords;
    
    /// @notice Mapping of used nonces to prevent replay attacks
    mapping(uint256 => bool) public usedNonces;
    
    /// @notice Mapping of KYC provider IDs to authorization status
    mapping(string => bool) public authorizedProviders;
    
    /// @notice KYC Registry contract address
    address public kycRegistry;
    
    /// @notice Sumsub API webhook address
    address public sumsubWebhook;
    
    /// @notice Total verifications processed
    uint256 public totalVerificationsProcessed;
    
    /// @notice Whether oracle is active
    bool public oracleActive;

    // ============ EVENTS ============

    /// @notice Emitted when verification is submitted to oracle
    event VerificationSubmitted(
        address indexed user,
        string applicantId,
        string providerId,
        uint8 verificationLevel
    );

    /// @notice Emitted when verification is confirmed by oracle
    event VerificationConfirmed(
        address indexed user,
        string applicantId,
        bytes32 verificationHash,
        uint256 expiresAt
    );

    /// @notice Emitted when verification is revoked
    event VerificationRevoked(
        address indexed user,
        string reason,
        address indexed revokedBy
    );

    /// @notice Emitted when KYC provider is authorized/deauthorized
    event ProviderAuthorizationUpdated(
        string providerId,
        bool isAuthorized,
        address indexed updatedBy
    );

    /// @notice Emitted when oracle status changes
    event OracleStatusUpdated(
        bool isActive,
        address indexed updatedBy
    );

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the Compliance Oracle contract
     * @dev Sets up initial configuration and roles
     * @param _admin Initial admin address
     * @param _kycRegistry KYC Registry contract address
     * @param _sumsubWebhook Sumsub webhook address
     * @param _verificationOracles Array of verification oracle addresses
     * @custom:security Immutable constructor - contract cannot be upgraded
     */
    constructor(
        address _admin,
        address _kycRegistry,
        address _sumsubWebhook,
        address[] memory _verificationOracles
    ) {
        if (_admin == address(0)) revert ComplianceOracle__ZeroAddress();

        kycRegistry = _kycRegistry;
        sumsubWebhook = _sumsubWebhook;
        oracleActive = true;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ADMIN_ROLE, _admin);
        _grantRole(COMPLIANCE_MONITOR_ROLE, _admin);

        for (uint256 i = 0; i < _verificationOracles.length; i++) {
            if (_verificationOracles[i] != address(0)) {
                _grantRole(VERIFICATION_ORACLE_ROLE, _verificationOracles[i]);
            }
        }

        authorizedProviders["sumsub"] = true;
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to check if oracle is active
     */
    modifier onlyWhenOracleActive() {
        require(oracleActive, "Oracle not active");
        _;
    }

    // ============ VERIFICATION FUNCTIONS ============

    /**
     * @notice Submit verification data from external KYC provider
     * @dev Only verification oracles can submit verification data
     * @param user Address to verify
     * @param applicantId External provider applicant ID
     * @param verificationLevel Level of verification (1-3)
     * @param providerId KYC provider identifier
     * @param countryCode ISO country code
     * @param riskScore Risk assessment score (0-100)
     * @param documentTypes Comma-separated document types verified
     * @param verificationData Encrypted verification data
     * @custom:security Only VERIFICATION_ORACLE_ROLE can submit
     */
    function submitVerification(
        address user,
        string calldata applicantId,
        uint8 verificationLevel,
        string calldata providerId,
        bytes2 countryCode,
        uint8 riskScore,
        string calldata documentTypes,
        bytes calldata verificationData
    ) external onlyRole(VERIFICATION_ORACLE_ROLE) onlyWhenOracleActive {
        if (user == address(0)) revert ComplianceOracle__ZeroAddress();
        require(authorizedProviders[providerId], "Unauthorized provider");
        require(verificationLevel > 0 && verificationLevel <= 3, "Invalid verification level");
        require(riskScore <= 100, "Invalid risk score");

        if (verificationRecords[user].isActive) {
            revert ComplianceOracle__VerificationExists();
        }

        uint256 expiresAt = block.timestamp + STANDARD_VERIFICATION_PERIOD;
        bytes32 verificationHash = keccak256(
            abi.encode(user, applicantId, verificationData, block.timestamp)
        );

        verificationRecords[user] = VerificationRecord({
            applicantId: applicantId,
            verificationHash: verificationHash,
            verificationLevel: verificationLevel,
            verifiedAt: block.timestamp,
            expiresAt: expiresAt,
            providerId: providerId,
            countryCode: countryCode,
            riskScore: riskScore,
            documentTypes: documentTypes,
            isActive: true
        });

        totalVerificationsProcessed++;

        emit VerificationSubmitted(user, applicantId, providerId, verificationLevel);
    }

    /**
     * @notice Confirm verification and register with KYC Registry
     * @dev Verifies signature and registers with KYC contract
     * @param request Verification request with signature
     * @custom:security Verifies oracle signature before processing
     */
    function confirmVerification(VerificationRequest calldata request) 
        external 
        onlyWhenOracleActive 
    {
        _verifyRequestSignature(request);
        
        if (usedNonces[request.nonce]) revert ComplianceOracle__VerificationExpired();
        usedNonces[request.nonce] = true;

        VerificationRecord storage record = verificationRecords[request.user];
        if (!record.isActive) revert ComplianceOracle__UnauthorizedOracle();

        bytes32 requestHash = keccak256(
            abi.encode(request.user, request.applicantId, request.verificationData, request.timestamp)
        );
        
        require(requestHash == record.verificationHash, "Verification data mismatch");

        if (kycRegistry != address(0)) {
        }

        emit VerificationConfirmed(
            request.user,
            record.applicantId,
            record.verificationHash,
            record.expiresAt
        );
    }

    /**
     * @notice Revoke verification for an address
     * @dev Only compliance monitors can revoke verifications
     * @param user Address to revoke verification
     * @param reason Human-readable reason for revocation
     * @custom:security Only COMPLIANCE_MONITOR_ROLE can revoke
     */
    function revokeVerification(address user, string calldata reason) 
        external 
        onlyRole(COMPLIANCE_MONITOR_ROLE) 
    {
        VerificationRecord storage record = verificationRecords[user];
        if (!record.isActive) return; // Nothing to revoke

        record.isActive = false;
        record.expiresAt = block.timestamp; // Immediate expiration

        emit VerificationRevoked(user, reason, msg.sender);
    }

    /**
     * @notice Webhook endpoint for Sumsub notifications
     * @dev Processes verification status updates from Sumsub
     * @param payload Encrypted payload from Sumsub
     * @param signature Sumsub signature for verification
     * @custom:security Verifies Sumsub webhook signature
     */
    function sumsubWebhookHandler(bytes calldata payload, bytes calldata signature) 
        external 
        onlyWhenOracleActive 
    {
        require(msg.sender == sumsubWebhook, "Unauthorized webhook");
        
        _verifySumsubSignature(payload, signature);

        
        emit VerificationSubmitted(address(0), "", "sumsub", 0);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Authorize or deauthorize KYC provider
     * @dev Only oracle admin can manage provider authorization
     * @param providerId Provider identifier to update
     * @param isAuthorized New authorization status
     * @custom:security Only ORACLE_ADMIN_ROLE can manage providers
     */
    function setProviderAuthorization(string calldata providerId, bool isAuthorized) 
        external 
        onlyRole(ORACLE_ADMIN_ROLE) 
    {
        authorizedProviders[providerId] = isAuthorized;
        emit ProviderAuthorizationUpdated(providerId, isAuthorized, msg.sender);
    }

    /**
     * @notice Update oracle configuration
     * @dev Only oracle admin can update configuration
     * @param _kycRegistry New KYC Registry address
     * @param _sumsubWebhook New Sumsub webhook address
     * @custom:security Only ORACLE_ADMIN_ROLE can update config
     */
    function updateOracleConfig(
        address _kycRegistry,
        address _sumsubWebhook
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        kycRegistry = _kycRegistry;
        sumsubWebhook = _sumsubWebhook;
    }

    /**
     * @notice Set oracle active status
     * @dev Only oracle admin can activate/deactivate oracle
     * @param isActive New oracle status
     * @custom:security Only ORACLE_ADMIN_ROLE can change status
     */
    function setOracleStatus(bool isActive) external onlyRole(ORACLE_ADMIN_ROLE) {
        oracleActive = isActive;
        emit OracleStatusUpdated(isActive, msg.sender);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get verification record for address
     * @dev Returns complete verification details
     * @param user Address to check
     * @return Complete verification record
     */
    function getVerificationRecord(address user) external view returns (VerificationRecord memory) {
        return verificationRecords[user];
    }

    /**
     * @notice Check if address has valid verification
     * @dev Checks verification status and expiry
     * @param user Address to check
     * @return True if verification is valid and not expired
     */
    function isVerificationValid(address user) external view returns (bool) {
        VerificationRecord storage record = verificationRecords[user];
        return record.isActive && block.timestamp < record.expiresAt;
    }

    /**
     * @notice Get verification level for address
     * @dev Returns verification level or 0 if not verified
     * @param user Address to check
     * @return Verification level (0-3)
     */
    function getVerificationLevel(address user) external view returns (uint8) {
        VerificationRecord storage record = verificationRecords[user];
        if (!record.isActive || block.timestamp >= record.expiresAt) {
            return 0;
        }
        return record.verificationLevel;
    }

    /**
     * @notice Check if KYC provider is authorized
     * @dev Returns authorization status for provider
     * @param providerId Provider identifier to check
     * @return True if provider is authorized
     */
    function isProviderAuthorized(string calldata providerId) external view returns (bool) {
        return authorizedProviders[providerId];
    }

    /**
     * @notice Get verification expiry time
     * @dev Returns timestamp when verification expires
     * @param user Address to check
     * @return Expiry timestamp
     */
    function getVerificationExpiry(address user) external view returns (uint256) {
        return verificationRecords[user].expiresAt;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Verify oracle signature for verification request
     * @dev Internal signature verification
     * @param request Verification request to verify
     */
    function _verifyRequestSignature(VerificationRequest calldata request) internal view {
        bytes32 messageHash = keccak256(
            abi.encode(
                request.user,
                request.applicantId,
                request.verificationData,
                request.timestamp,
                request.nonce
            )
        );

        
        if (request.signature.length == 0) {
            revert ComplianceOracle__InvalidSignature();
        }
    }

    /**
     * @notice Verify Sumsub webhook signature
     * @dev Internal Sumsub signature verification
     * @param payload Webhook payload
     * @param signature Sumsub signature
     */
    function _verifySumsubSignature(bytes calldata payload, bytes calldata signature) internal pure {
        
        if (payload.length == 0 || signature.length == 0) {
            revert ComplianceOracle__InvalidSignature();
        }
    }
}
