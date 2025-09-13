// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IKYCRegistry
 * @notice Interface for FVC KYC registry functionality
 * @dev KYC registry interface for compliance and verification management
 */
interface IKYCRegistry {
    /**
     * @notice KYC verification record structure
     * @dev All KYC verification details
     * @param isVerified Whether address is KYC verified
     * @param verificationLevel Level of verification (1-3)
     * @param verifiedAt Timestamp when verification was completed
     * @param expiresAt Timestamp when verification expires
     * @param verifiedBy Address that performed verification
     * @param countryCode ISO country code
     * @param riskScore Risk score (0-100)
     * @param isBlacklisted Whether address is blacklisted
     */
    struct KYCRecord {
        bool isVerified;
        uint8 verificationLevel;
        uint256 verifiedAt;
        uint256 expiresAt;
        address verifiedBy;
        bytes2 countryCode;
        uint8 riskScore;
        bool isBlacklisted;
    }

    /**
     * @notice Verify KYC status for an address
     * @dev Only compliance officers can verify KYC
     * @param user Address to verify
     * @param verificationLevel Level of verification (1-3)
     * @param duration Verification duration in seconds
     * @param countryCode ISO country code
     * @param riskScore Risk score (0-100)
     */
    function verifyKYC(
        address user,
        uint8 verificationLevel,
        uint256 duration,
        bytes2 countryCode,
        uint8 riskScore
    ) external;

    /**
     * @notice Batch verify multiple addresses
     * @dev Gas-optimized batch verification
     * @param users Array of addresses to verify
     * @param verificationLevels Array of verification levels
     * @param durations Array of verification durations
     * @param countryCodes Array of country codes
     * @param riskScores Array of risk scores
     */
    function batchVerifyKYC(
        address[] calldata users,
        uint8[] calldata verificationLevels,
        uint256[] calldata durations,
        bytes2[] calldata countryCodes,
        uint8[] calldata riskScores
    ) external;

    /**
     * @notice Revoke KYC verification for an address
     * @dev Only compliance officers can revoke KYC
     * @param user Address to revoke KYC for
     * @param reason Reason for revocation
     */
    function revokeKYC(address user, string calldata reason) external;

    /**
     * @notice Blacklist or whitelist an address
     * @dev Only compliance officers can manage blacklist
     * @param user Address to blacklist/whitelist
     * @param isBlacklisted New blacklist status
     */
    function setBlacklistStatus(address user, bool isBlacklisted) external;

    /**
     * @notice Add or remove country restriction
     * @dev Only compliance officers can manage country restrictions
     * @param countryCode ISO country code
     * @param isRestricted New restriction status
     */
    function setCountryRestriction(bytes2 countryCode, bool isRestricted) external;

    /**
     * @notice Enable or disable KYC enforcement
     * @dev Only KYC admin can change enforcement status
     * @param isActive New enforcement status
     */
    function setKYCEnforcement(bool isActive) external;

    /**
     * @notice Check if address is KYC verified
     * @dev Returns true if verified and not expired
     * @param user Address to check
     * @return True if KYC verified and not expired
     */
    function isKYCVerified(address user) external view returns (bool);

    /**
     * @notice Get KYC verification level for address
     * @dev Returns verification level (0 if not verified)
     * @param user Address to check
     * @return Verification level (0-3)
     */
    function getVerificationLevel(address user) external view returns (uint8);

    /**
     * @notice Get complete KYC record for address
     * @dev Returns full KYC verification details
     * @param user Address to check
     * @return Complete KYC record struct
     */
    function getKYCRecord(address user) external view returns (KYCRecord memory);

    /**
     * @notice Check if country is restricted
     * @dev Returns restriction status for country code
     * @param countryCode ISO country code to check
     * @return True if country is restricted
     */
    function isCountryRestricted(bytes2 countryCode) external view returns (bool);

    /**
     * @notice Get verification expiry time
     * @dev Returns timestamp when verification expires
     * @param user Address to check
     * @return Expiry timestamp (0 if not verified)
     */
    function getVerificationExpiry(address user) external view returns (uint256);

    /**
     * @notice Check if address is blacklisted
     * @dev Returns blacklist status
     * @param user Address to check
     * @return True if blacklisted
     */
    function isBlacklisted(address user) external view returns (bool);

    /**
     * @notice Get total number of verified addresses
     * @dev Returns count of currently verified addresses
     * @return Total verified address count
     */
    function getTotalVerifiedAddresses() external view returns (uint256);

    /**
     * @notice Emitted when KYC verification is completed
     * @param user Address that was verified
     * @param verificationLevel Level of verification
     * @param expiresAt Expiration timestamp
     * @param verifiedBy Address that performed verification
     */
    event KYCVerified(
        address indexed user,
        uint8 verificationLevel,
        uint256 expiresAt,
        address indexed verifiedBy
    );

    /**
     * @notice Emitted when KYC verification is revoked
     * @param user Address whose verification was revoked
     * @param reason Reason for revocation
     * @param revokedBy Address that revoked verification
     */
    event KYCRevoked(
        address indexed user,
        string reason,
        address indexed revokedBy
    );

    /**
     * @notice Emitted when address is blacklisted/whitelisted
     * @param user Address that was blacklisted/whitelisted
     * @param isBlacklisted New blacklist status
     * @param updatedBy Address that updated status
     */
    event BlacklistStatusUpdated(
        address indexed user,
        bool isBlacklisted,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when country restriction is updated
     * @param countryCode Country code that was updated
     * @param isRestricted New restriction status
     * @param updatedBy Address that updated restriction
     */
    event CountryRestrictionUpdated(
        bytes2 countryCode,
        bool isRestricted,
        address indexed updatedBy
    );

    /**
     * @notice Emitted when KYC enforcement status changes
     * @param isActive New enforcement status
     * @param updatedBy Address that updated status
     */
    event KYCEnforcementUpdated(
        bool isActive,
        address indexed updatedBy
    );
}
