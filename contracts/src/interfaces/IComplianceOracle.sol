// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IComplianceOracle
 * @notice Interface for FVC compliance oracle functionality
 * @dev Compliance oracle interface for external KYC provider integration
 */
interface IComplianceOracle {
    /**
     * @notice Verification request structure
     * @dev Request data for KYC verification
     * @param user Address to verify
     * @param applicantId External provider applicant ID
     * @param verificationData Encoded verification data
     * @param timestamp Request timestamp
     * @param nonce Unique request nonce
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

    /**
     * @notice Oracle verification record structure
     * @dev Complete verification record from oracle
     * @param isActive Whether verification is active
     * @param verificationLevel Level of verification (1-3)
     * @param applicantId External provider applicant ID
     * @param providerId KYC provider identifier
     * @param verifiedAt Timestamp when verification was completed
     * @param expiresAt Timestamp when verification expires
     * @param verificationHash Hash of verification data
     * @param countryCode ISO country code
     * @param riskScore Risk score (0-100)
     */
    struct VerificationRecord {
        bool isActive;
        uint8 verificationLevel;
        string applicantId;
        string providerId;
        uint256 verifiedAt;
        uint256 expiresAt;
        bytes32 verificationHash;
        bytes2 countryCode;
        uint8 riskScore;
    }

    /**
     * @notice Submit verification data from external KYC provider
     * @dev Only verification oracles can submit verification data
     * @param request Verification request data
     * @param verificationLevel Level of verification
     * @param expiresAt Expiration timestamp
     * @param countryCode ISO country code
     * @param riskScore Risk score
     */
    function submitVerification(
        VerificationRequest calldata request,
        uint8 verificationLevel,
        uint256 expiresAt,
        bytes2 countryCode,
        uint8 riskScore
    ) external;

    /**
     * @notice Confirm verification from Sumsub webhook
     * @dev Only authorized webhook can confirm verification
     * @param user Address to verify
     * @param applicantId Sumsub applicant ID
     * @param verificationLevel Level of verification
     * @param expiresAt Expiration timestamp
     * @param signature Webhook signature
     */
    function confirmSumsubVerification(
        address user,
        string calldata applicantId,
        uint8 verificationLevel,
        uint256 expiresAt,
        bytes calldata signature
    ) external;

    /**
     * @notice Revoke verification for an address
     * @dev Only compliance monitors can revoke verification
     * @param user Address to revoke verification for
     * @param reason Reason for revocation
     */
    function revokeVerification(address user, string calldata reason) external;

    /**
     * @notice Authorize or deauthorize KYC provider
     * @dev Only oracle admin can manage provider authorization
     * @param providerId Provider identifier
     * @param isAuthorized New authorization status
     */
    function setProviderAuthorization(string calldata providerId, bool isAuthorized) external;

    /**
     * @notice Update oracle configuration
     * @dev Only oracle admin can update configuration
     * @param _kycRegistry New KYC Registry address
     * @param _sumsubWebhook New Sumsub webhook address
     */
    function updateOracleConfig(
        address _kycRegistry,
        address _sumsubWebhook
    ) external;

    /**
     * @notice Set oracle active status
     * @dev Only oracle admin can activate/deactivate oracle
     * @param isActive New oracle status
     */
    function setOracleStatus(bool isActive) external;

    /**
     * @notice Get verification record for address
     * @dev Returns complete verification details
     * @param user Address to check
     * @return Complete verification record
     */
    function getVerificationRecord(address user) external view returns (VerificationRecord memory);

    /**
     * @notice Check if address has valid verification
     * @dev Checks verification status and expiry
     * @param user Address to check
     * @return True if verification is valid and not expired
     */
    function isVerificationValid(address user) external view returns (bool);

    /**
     * @notice Get verification level for address
     * @dev Returns verification level or 0 if not verified
     * @param user Address to check
     * @return Verification level (0-3)
     */
    function getVerificationLevel(address user) external view returns (uint8);

    /**
     * @notice Check if KYC provider is authorized
     * @dev Returns authorization status for provider
     * @param providerId Provider identifier to check
     * @return True if provider is authorized
     */
    function isProviderAuthorized(string calldata providerId) external view returns (bool);

    /**
     * @notice Get verification expiry time
     * @dev Returns timestamp when verification expires
     * @param user Address to check
     * @return Expiry timestamp
     */
    function getVerificationExpiry(address user) external view returns (uint256);

    /**
     * @notice Emitted when verification is submitted to oracle
     * @param user Address being verified
     * @param applicantId External provider applicant ID
     * @param providerId KYC provider identifier
     * @param verificationLevel Level of verification
     */
    event VerificationSubmitted(
        address indexed user,
        string applicantId,
        string providerId,
        uint8 verificationLevel
    );

    /**
     * @notice Emitted when verification is confirmed by oracle
     * @param user Address that was verified
     * @param applicantId External provider applicant ID
     * @param verificationHash Hash of verification data
     * @param expiresAt Expiration timestamp
     */
    event VerificationConfirmed(
        address indexed user,
        string applicantId,
        bytes32 verificationHash,
        uint256 expiresAt
    );

    /**
     * @notice Emitted when verification is revoked
     * @param user Address whose verification was revoked
     * @param reason Reason for revocation
     * @param revokedBy Address that revoked verification
     */
    event VerificationRevoked(
        address indexed user,
        string reason,
        address indexed revokedBy
    );

    /**
     * @notice Emitted when KYC provider is authorized/deauthorized
     * @param providerId Provider identifier
     * @param isAuthorized New authorization status
     * @param updatedBy Address that updated authorization
     */
    event ProviderAuthorizationUpdated(
        string providerId,
        bool isAuthorized,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when oracle status changes
     * @param isActive New oracle status
     * @param updatedBy Address that updated status
     */
    event OracleStatusUpdated(
        bool isActive,
        address indexed updatedBy
    );
}
