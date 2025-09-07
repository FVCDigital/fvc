pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KYCRegistry
 * @notice Allowlist management with oracle-based verification for FVC Protocol
 * @dev Immutable contract managing KYC verification status for compliance
 * @custom:security Immutable contract for regulatory compliance requirements
 */
contract KYCRegistry is AccessControl {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when address is zero
    error KYCRegistry__ZeroAddress();
    
    /// @notice Error when KYC verification has expired
    error KYCRegistry__VerificationExpired();
    
    /// @notice Error when unauthorized verification attempt
    error KYCRegistry__UnauthorizedVerification();
    
    /// @notice Error when invalid verification duration
    error KYCRegistry__InvalidDuration();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for KYC admin
    bytes32 public constant KYC_ADMIN_ROLE = keccak256("KYC_ADMIN_ROLE");
    
    /// @notice Role identifier for KYC oracle
    bytes32 public constant KYC_ORACLE_ROLE = keccak256("KYC_ORACLE_ROLE");
    
    /// @notice Role identifier for compliance officer
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    
    /// @notice Maximum KYC verification duration (1 year)
    uint256 public constant MAX_VERIFICATION_DURATION = 365 days;
    
    /// @notice Standard verification duration (180 days)
    uint256 public constant STANDARD_VERIFICATION_DURATION = 180 days;

    // ============ STRUCTS ============

    /**
     * @notice KYC verification record structure
     * @dev Contains all KYC verification details
     * @param isVerified Whether address is KYC verified
     * @param verificationLevel Verification level (1=basic, 2=enhanced, 3=institutional)
     * @param verifiedAt Timestamp when KYC was verified
     * @param expiresAt Timestamp when verification expires
     * @param verifiedBy Address that performed verification
     * @param countryCode ISO country code of user
     * @param riskScore Risk score assigned to user (0-100)
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

    // ============ STATE VARIABLES ============
    
    /// @notice Mapping of address to KYC verification record
    mapping(address => KYCRecord) public kycRecords;
    
    /// @notice Mapping of country codes to restriction status
    mapping(bytes2 => bool) public restrictedCountries;
    
    /// @notice Total number of verified addresses
    uint256 public totalVerifiedAddresses;
    
    /// @notice Whether KYC enforcement is active
    bool public kycEnforcementActive;
    
    /// @notice Compliance oracle contract address
    address public complianceOracle;

    // ============ EVENTS ============

    /// @notice Emitted when address is KYC verified
    /// @param user Address that was verified
    /// @param verificationLevel Level of verification
    /// @param expiresAt Expiration timestamp
    /// @param verifiedBy Address that performed verification
    event KYCVerified(
        address indexed user,
        uint8 verificationLevel,
        uint256 expiresAt,
        address indexed verifiedBy
    );

    /// @notice Emitted when KYC verification is revoked
    /// @param user Address whose verification was revoked
    /// @param revokedBy Address that revoked verification
    /// @param reason Human-readable reason for revocation
    event KYCRevoked(
        address indexed user,
        address indexed revokedBy,
        string reason
    );

    /// @notice Emitted when address is blacklisted
    /// @param user Address that was blacklisted
    /// @param blacklistedBy Address that performed blacklisting
    /// @param reason Reason for blacklisting
    event AddressBlacklisted(
        address indexed user,
        address indexed blacklistedBy,
        string reason
    );

    /// @notice Emitted when country restriction is updated
    /// @param countryCode ISO country code
    /// @param isRestricted New restriction status
    /// @param updatedBy Address that updated restriction
    event CountryRestrictionUpdated(
        bytes2 indexed countryCode,
        bool isRestricted,
        address indexed updatedBy
    );

    /// @notice Emitted when KYC enforcement status changes
    /// @param isActive New enforcement status
    /// @param updatedBy Address that changed status
    event KYCEnforcementUpdated(
        bool isActive,
        address indexed updatedBy
    );

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the KYC Registry contract
     * @dev Sets up initial configuration and roles
     * @param _admin Initial admin address
     * @param _complianceOracle Compliance oracle contract address
     * @param _kycOfficers Array of KYC officer addresses
     * @custom:security Immutable constructor - contract cannot be upgraded
     */
    constructor(
        address _admin,
        address _complianceOracle,
        address[] memory _kycOfficers
    ) {
        if (_admin == address(0)) revert KYCRegistry__ZeroAddress();

        complianceOracle = _complianceOracle;
        kycEnforcementActive = true;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(KYC_ADMIN_ROLE, _admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, _admin);

        if (_complianceOracle != address(0)) {
            _grantRole(KYC_ORACLE_ROLE, _complianceOracle);
        }

        for (uint256 i = 0; i < _kycOfficers.length; i++) {
            if (_kycOfficers[i] != address(0)) {
                _grantRole(COMPLIANCE_OFFICER_ROLE, _kycOfficers[i]);
            }
        }
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to check if KYC enforcement is active
     */
    modifier onlyWhenKYCActive() {
        require(kycEnforcementActive, "KYC enforcement not active");
        _;
    }

    // ============ KYC VERIFICATION FUNCTIONS ============

    /**
     * @notice Verify KYC status for an address
     * @dev Only compliance officers can verify KYC
     * @param user Address to verify
     * @param verificationLevel Level of verification (1-3)
     * @param duration Verification duration in seconds
     * @param countryCode ISO country code
     * @param riskScore Risk score (0-100)
     * @custom:security Only COMPLIANCE_OFFICER_ROLE can verify
     */
    function verifyKYC(
        address user,
        uint8 verificationLevel,
        uint256 duration,
        bytes2 countryCode,
        uint8 riskScore
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) onlyWhenKYCActive {
        if (user == address(0)) revert KYCRegistry__ZeroAddress();
        if (verificationLevel == 0 || verificationLevel > 3) {
            revert KYCRegistry__UnauthorizedVerification();
        }
        if (duration == 0 || duration > MAX_VERIFICATION_DURATION) {
            revert KYCRegistry__InvalidDuration();
        }
        if (riskScore > 100) revert KYCRegistry__UnauthorizedVerification();
        if (restrictedCountries[countryCode]) revert KYCRegistry__UnauthorizedVerification();

        bool isNewVerification = !kycRecords[user].isVerified;

        uint256 expiresAt = block.timestamp + duration;

        kycRecords[user] = KYCRecord({
            isVerified: true,
            verificationLevel: verificationLevel,
            verifiedAt: block.timestamp,
            expiresAt: expiresAt,
            verifiedBy: msg.sender,
            countryCode: countryCode,
            riskScore: riskScore,
            isBlacklisted: false
        });

        if (isNewVerification) {
            totalVerifiedAddresses++;
        }

        emit KYCVerified(user, verificationLevel, expiresAt, msg.sender);
    }

    /**
     * @notice Batch verify multiple addresses
     * @dev Gas-optimized batch verification
     * @param users Array of addresses to verify
     * @param verificationLevels Array of verification levels
     * @param durations Array of verification durations
     * @param countryCodes Array of country codes
     * @param riskScores Array of risk scores
     * @custom:security Only COMPLIANCE_OFFICER_ROLE can batch verify
     */
    function batchVerifyKYC(
        address[] calldata users,
        uint8[] calldata verificationLevels,
        uint256[] calldata durations,
        bytes2[] calldata countryCodes,
        uint8[] calldata riskScores
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) onlyWhenKYCActive {
        require(
            users.length == verificationLevels.length &&
            users.length == durations.length &&
            users.length == countryCodes.length &&
            users.length == riskScores.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) continue;
            if (verificationLevels[i] == 0 || verificationLevels[i] > 3) continue;
            if (durations[i] == 0 || durations[i] > MAX_VERIFICATION_DURATION) continue;
            if (riskScores[i] > 100) continue;
            if (restrictedCountries[countryCodes[i]]) continue;

            bool isNewVerification = !kycRecords[users[i]].isVerified;
            uint256 expiresAt = block.timestamp + durations[i];

            kycRecords[users[i]] = KYCRecord({
                isVerified: true,
                verificationLevel: verificationLevels[i],
                verifiedAt: block.timestamp,
                expiresAt: expiresAt,
                verifiedBy: msg.sender,
                countryCode: countryCodes[i],
                riskScore: riskScores[i],
                isBlacklisted: false
            });

            if (isNewVerification) {
                totalVerifiedAddresses++;
            }

            emit KYCVerified(users[i], verificationLevels[i], expiresAt, msg.sender);
        }
    }

    /**
     * @notice Revoke KYC verification for an address
     * @dev Only compliance officers can revoke verification
     * @param user Address to revoke verification
     * @param reason Human-readable reason for revocation
     * @custom:security Only COMPLIANCE_OFFICER_ROLE can revoke
     */
    function revokeKYC(address user, string calldata reason) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        if (user == address(0)) revert KYCRegistry__ZeroAddress();

        KYCRecord storage record = kycRecords[user];
        if (!record.isVerified) return; // Nothing to revoke

        record.isVerified = false;
        record.expiresAt = block.timestamp; // Immediate expiration
        totalVerifiedAddresses--;

        emit KYCRevoked(user, msg.sender, reason);
    }

    /**
     * @notice Blacklist an address
     * @dev Only compliance officers can blacklist addresses
     * @param user Address to blacklist
     * @param reason Reason for blacklisting
     * @custom:security Only COMPLIANCE_OFFICER_ROLE can blacklist
     */
    function blacklistAddress(address user, string calldata reason) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        if (user == address(0)) revert KYCRegistry__ZeroAddress();

        kycRecords[user].isBlacklisted = true;
        
        if (kycRecords[user].isVerified) {
            kycRecords[user].isVerified = false;
            kycRecords[user].expiresAt = block.timestamp;
            totalVerifiedAddresses--;
        }

        emit AddressBlacklisted(user, msg.sender, reason);
    }

    // ============ COUNTRY RESTRICTION FUNCTIONS ============

    /**
     * @notice Update country restriction status
     * @dev Only KYC admin can update country restrictions
     * @param countryCode ISO country code to update
     * @param isRestricted New restriction status
     * @custom:security Only KYC_ADMIN_ROLE can update restrictions
     */
    function updateCountryRestriction(bytes2 countryCode, bool isRestricted) 
        external 
        onlyRole(KYC_ADMIN_ROLE) 
    {
        restrictedCountries[countryCode] = isRestricted;
        emit CountryRestrictionUpdated(countryCode, isRestricted, msg.sender);
    }

    /**
     * @notice Batch update country restrictions
     * @dev Gas-optimized batch update for multiple countries
     * @param countryCodes Array of country codes
     * @param restrictionStatuses Array of restriction statuses
     * @custom:security Only KYC_ADMIN_ROLE can batch update
     */
    function batchUpdateCountryRestrictions(
        bytes2[] calldata countryCodes,
        bool[] calldata restrictionStatuses
    ) external onlyRole(KYC_ADMIN_ROLE) {
        require(countryCodes.length == restrictionStatuses.length, "Array length mismatch");

        for (uint256 i = 0; i < countryCodes.length; i++) {
            restrictedCountries[countryCodes[i]] = restrictionStatuses[i];
            emit CountryRestrictionUpdated(countryCodes[i], restrictionStatuses[i], msg.sender);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update KYC enforcement status
     * @dev Only KYC admin can enable/disable enforcement
     * @param isActive New enforcement status
     * @custom:security Only KYC_ADMIN_ROLE can change enforcement
     */
    function setKYCEnforcement(bool isActive) external onlyRole(KYC_ADMIN_ROLE) {
        kycEnforcementActive = isActive;
        emit KYCEnforcementUpdated(isActive, msg.sender);
    }

    /**
     * @notice Update compliance oracle address
     * @dev Only admin can update oracle address
     * @param newOracle New compliance oracle address
     * @custom:security Only DEFAULT_ADMIN_ROLE can update oracle
     */
    function updateComplianceOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (complianceOracle != address(0)) {
            _revokeRole(KYC_ORACLE_ROLE, complianceOracle);
        }

        complianceOracle = newOracle;

        if (newOracle != address(0)) {
            _grantRole(KYC_ORACLE_ROLE, newOracle);
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if address is KYC verified and not expired
     * @dev Main verification function for external contracts
     * @param user Address to check
     * @return True if KYC verified and not expired
     */
    function isKYCVerified(address user) external view returns (bool) {
        if (!kycEnforcementActive) return true; // Allow if enforcement disabled
        
        KYCRecord storage record = kycRecords[user];
        return record.isVerified && 
               !record.isBlacklisted && 
               block.timestamp < record.expiresAt;
    }

    /**
     * @notice Get KYC verification level for address
     * @dev Returns verification level (0 if not verified)
     * @param user Address to check
     * @return Verification level (0-3)
     */
    function getVerificationLevel(address user) external view returns (uint8) {
        KYCRecord storage record = kycRecords[user];
        if (!record.isVerified || record.isBlacklisted || block.timestamp >= record.expiresAt) {
            return 0;
        }
        return record.verificationLevel;
    }

    /**
     * @notice Get complete KYC record for address
     * @dev Returns full KYC verification details
     * @param user Address to check
     * @return Complete KYC record struct
     */
    function getKYCRecord(address user) external view returns (KYCRecord memory) {
        return kycRecords[user];
    }

    /**
     * @notice Check if country is restricted
     * @dev Returns restriction status for country code
     * @param countryCode ISO country code to check
     * @return True if country is restricted
     */
    function isCountryRestricted(bytes2 countryCode) external view returns (bool) {
        return restrictedCountries[countryCode];
    }

    /**
     * @notice Get verification expiry time
     * @dev Returns timestamp when verification expires
     * @param user Address to check
     * @return Expiry timestamp (0 if not verified)
     */
    function getVerificationExpiry(address user) external view returns (uint256) {
        return kycRecords[user].expiresAt;
    }

    /**
     * @notice Check if address is blacklisted
     * @dev Returns blacklist status
     * @param user Address to check
     * @return True if blacklisted
     */
    function isBlacklisted(address user) external view returns (bool) {
        return kycRecords[user].isBlacklisted;
    }

    /**
     * @notice Get total number of verified addresses
     * @dev Returns count of currently verified addresses
     * @return Total verified address count
     */
    function getTotalVerifiedAddresses() external view returns (uint256) {
        return totalVerifiedAddresses;
    }
}
