// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SaleAdmin
 * @notice Governance-controlled sale parameter management for FVC Protocol
 * @dev UUPS upgradeable contract for managing OTC sales and allowlists
 * @custom:security Uses role-based access control with governance oversight
 */
contract SaleAdmin is AccessControlUpgradeable, UUPSUpgradeable {
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when sale round doesn't exist
    error SaleAdmin__RoundNotFound();
    
    /// @notice Error when sale round is already active
    error SaleAdmin__RoundAlreadyActive();
    
    /// @notice Error when price is invalid
    error SaleAdmin__InvalidPrice();
    
    /// @notice Error when cap is invalid
    error SaleAdmin__InvalidCap();
    
    /// @notice Error when timeframe is invalid
    error SaleAdmin__InvalidTimeframe();
    
    /// @notice Error when address is zero
    error SaleAdmin__ZeroAddress();
    
    /// @notice Error when array lengths don't match
    error SaleAdmin__ArrayLengthMismatch();
    
    /// @notice Error when unauthorized access
    error SaleAdmin__Unauthorized();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for governance admin
    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    
    /// @notice Role identifier for sale manager
    bytes32 public constant SALE_MANAGER_ROLE = keccak256("SALE_MANAGER_ROLE");
    
    /// @notice Role identifier for allowlist manager
    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");
    
    /// @notice Role identifier for pause guardian
    bytes32 public constant PAUSE_GUARDIAN_ROLE = keccak256("PAUSE_GUARDIAN_ROLE");
    
    /// @notice Maximum price per token (safety limit)
    uint256 public constant MAX_PRICE_PER_TOKEN = 100 * 1e6; // 100 USDC
    
    /// @notice Maximum individual cap (safety limit)
    uint256 public constant MAX_INDIVIDUAL_CAP = 50_000_000 * 1e6; // 50M USDC

    // ============ STRUCTS ============

    /**
     * @notice Sale round configuration structure
     * @dev Contains all parameters for a sale round
     * @param roundId Unique identifier for the sale round
     * @param name Human-readable name for the round
     * @param isActive Whether the round is currently active
     * @param merkleRoot Merkle root for allowlist verification
     * @param pricePerToken Price per FVC token in USDC (6 decimals)
     * @param totalCap Maximum USDC that can be raised in this round
     * @param individualCap Maximum USDC per individual in this round
     * @param startTime Round start timestamp
     * @param endTime Round end timestamp
     * @param vestingCliff Cliff period for vested tokens
     * @param vestingDuration Total vesting duration
     * @param totalSold Total USDC sold in this round
     * @param participantCount Number of participants in this round
     */
    struct SaleRound {
        uint256 roundId;
        string name;
        bool isActive;
        bytes32 merkleRoot;
        uint256 pricePerToken;
        uint256 totalCap;
        uint256 individualCap;
        uint256 startTime;
        uint256 endTime;
        uint256 vestingCliff;
        uint256 vestingDuration;
        uint256 totalSold;
        uint256 participantCount;
    }

    /**
     * @notice Allowlist entry structure
     * @dev Contains allowlist information for an address
     * @param isAllowed Whether address is on allowlist
     * @param individualCap Custom individual cap (0 = use round default)
     * @param roundId Sale round this allowlist entry applies to
     * @param addedBy Address that added this entry
     * @param addedAt Timestamp when entry was added
     */
    struct AllowlistEntry {
        bool isAllowed;
        uint256 individualCap;
        uint256 roundId;
        address addedBy;
        uint256 addedAt;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice Counter for sale round IDs
    uint256 public nextRoundId;
    
    /// @notice Current active sale round ID
    uint256 public currentActiveRound;
    
    /// @notice Mapping of round ID to sale round configuration
    mapping(uint256 => SaleRound) public saleRounds;
    
    /// @notice Mapping of round ID and address to allowlist status
    mapping(uint256 => mapping(address => AllowlistEntry)) public allowlists;
    
    /// @notice Array of all created round IDs
    uint256[] public allRoundIds;
    
    /// @notice Global sale pause status
    bool public globalSalePaused;
    
    /// @notice OTC Swap contract address
    address public otcSwapContract;
    
    /// @notice Vesting Vault contract address
    address public vestingVaultContract;

    // ============ EVENTS ============

    /// @notice Emitted when a new sale round is created
    event SaleRoundCreated(
        uint256 indexed roundId,
        string name,
        uint256 pricePerToken,
        uint256 totalCap,
        uint256 startTime,
        uint256 endTime
    );

    /// @notice Emitted when sale round configuration is updated
    event SaleRoundUpdated(
        uint256 indexed roundId,
        uint256 pricePerToken,
        uint256 totalCap,
        uint256 individualCap
    );

    /// @notice Emitted when sale round status changes
    event SaleRoundStatusChanged(
        uint256 indexed roundId,
        bool isActive,
        address indexed activatedBy
    );

    /// @notice Emitted when allowlist is updated
    event AllowlistUpdated(
        uint256 indexed roundId,
        bytes32 merkleRoot,
        address indexed updatedBy
    );

    /// @notice Emitted when individual allowlist entry is modified
    event IndividualAllowlistModified(
        uint256 indexed roundId,
        address indexed user,
        bool isAllowed,
        uint256 individualCap,
        address indexed modifiedBy
    );

    /// @notice Emitted when contract addresses are updated
    event ContractAddressesUpdated(address otcSwap, address vestingVault);

    /// @notice Emitted when global sale pause status changes
    event GlobalSalePauseChanged(bool isPaused, address indexed pausedBy);

    // ============ STORAGE GAP ============
    
    uint256[40] private __gap;

    // ============ INITIALIZER ============

    /**
     * @notice Initialize the Sale Admin contract
     * @dev Sets up initial configuration and roles
     * @param _admin Initial admin address
     * @param _otcSwapContract OTC swap contract address
     * @param _vestingVaultContract Vesting vault contract address
     * @custom:security Only callable once during deployment
     */
    function initialize(
        address _admin,
        address _otcSwapContract,
        address _vestingVaultContract
    ) external initializer {
        if (_admin == address(0)) revert SaleAdmin__ZeroAddress();
        if (_otcSwapContract == address(0)) revert SaleAdmin__ZeroAddress();
        if (_vestingVaultContract == address(0)) revert SaleAdmin__ZeroAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();

        otcSwapContract = _otcSwapContract;
        vestingVaultContract = _vestingVaultContract;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ADMIN_ROLE, _admin);
        _grantRole(SALE_MANAGER_ROLE, _admin);
        _grantRole(ALLOWLIST_MANAGER_ROLE, _admin);
        _grantRole(PAUSE_GUARDIAN_ROLE, _admin);

        nextRoundId = 1; // Start from 1
    }

    // ============ SALE ROUND MANAGEMENT ============

    /**
     * @notice Create a new sale round
     * @dev Only sale manager can create new rounds
     * @param name Human-readable name for the round
     * @param pricePerToken Price per FVC token in USDC (6 decimals)
     * @param totalCap Maximum USDC that can be raised
     * @param individualCap Maximum USDC per individual
     * @param startTime Round start timestamp
     * @param endTime Round end timestamp
     * @param vestingCliff Cliff period in seconds
     * @param vestingDuration Total vesting duration in seconds
     * @return roundId Created round identifier
     * @custom:security Only SALE_MANAGER_ROLE can create rounds
     */
    function createSaleRound(
        string calldata name,
        uint256 pricePerToken,
        uint256 totalCap,
        uint256 individualCap,
        uint256 startTime,
        uint256 endTime,
        uint256 vestingCliff,
        uint256 vestingDuration
    ) external onlyRole(SALE_MANAGER_ROLE) returns (uint256 roundId) {
        if (pricePerToken == 0 || pricePerToken > MAX_PRICE_PER_TOKEN) {
            revert SaleAdmin__InvalidPrice();
        }
        if (totalCap == 0 || individualCap == 0 || individualCap > MAX_INDIVIDUAL_CAP) {
            revert SaleAdmin__InvalidCap();
        }
        if (startTime >= endTime || endTime <= block.timestamp) {
            revert SaleAdmin__InvalidTimeframe();
        }

        roundId = nextRoundId++;

        saleRounds[roundId] = SaleRound({
            roundId: roundId,
            name: name,
            isActive: false,
            merkleRoot: bytes32(0),
            pricePerToken: pricePerToken,
            totalCap: totalCap,
            individualCap: individualCap,
            startTime: startTime,
            endTime: endTime,
            vestingCliff: vestingCliff,
            vestingDuration: vestingDuration,
            totalSold: 0,
            participantCount: 0
        });

        allRoundIds.push(roundId);

        emit SaleRoundCreated(
            roundId,
            name,
            pricePerToken,
            totalCap,
            startTime,
            endTime
        );
    }

    /**
     * @notice Update sale round configuration
     * @dev Only sale manager can update round parameters
     * @param roundId Sale round identifier
     * @param pricePerToken New price per token
     * @param totalCap New total cap
     * @param individualCap New individual cap
     * @param startTime New start time
     * @param endTime New end time
     * @custom:security Only SALE_MANAGER_ROLE can update rounds
     */
    function updateSaleRound(
        uint256 roundId,
        uint256 pricePerToken,
        uint256 totalCap,
        uint256 individualCap,
        uint256 startTime,
        uint256 endTime
    ) external onlyRole(SALE_MANAGER_ROLE) {
        if (saleRounds[roundId].roundId == 0) revert SaleAdmin__RoundNotFound();
        if (saleRounds[roundId].isActive) revert SaleAdmin__RoundAlreadyActive();
        if (pricePerToken == 0 || pricePerToken > MAX_PRICE_PER_TOKEN) {
            revert SaleAdmin__InvalidPrice();
        }
        if (totalCap == 0 || individualCap == 0 || individualCap > MAX_INDIVIDUAL_CAP) {
            revert SaleAdmin__InvalidCap();
        }
        if (startTime >= endTime) revert SaleAdmin__InvalidTimeframe();

        SaleRound storage round = saleRounds[roundId];
        round.pricePerToken = pricePerToken;
        round.totalCap = totalCap;
        round.individualCap = individualCap;
        round.startTime = startTime;
        round.endTime = endTime;

        emit SaleRoundUpdated(roundId, pricePerToken, totalCap, individualCap);
    }

    /**
     * @notice Activate or deactivate a sale round
     * @dev Only sale manager can change round status
     * @param roundId Sale round identifier
     * @param isActive New active status
     * @custom:security Only SALE_MANAGER_ROLE can change status
     */
    function setSaleRoundStatus(uint256 roundId, bool isActive) 
        external 
        onlyRole(SALE_MANAGER_ROLE) 
    {
        if (saleRounds[roundId].roundId == 0) revert SaleAdmin__RoundNotFound();

        if (isActive && currentActiveRound != 0 && currentActiveRound != roundId) {
            saleRounds[currentActiveRound].isActive = false;
            emit SaleRoundStatusChanged(currentActiveRound, false, msg.sender);
        }

        saleRounds[roundId].isActive = isActive;
        
        if (isActive) {
            currentActiveRound = roundId;
        } else if (currentActiveRound == roundId) {
            currentActiveRound = 0;
        }

        emit SaleRoundStatusChanged(roundId, isActive, msg.sender);
    }

    // ============ ALLOWLIST MANAGEMENT ============

    /**
     * @notice Update Merkle root for allowlist verification
     * @dev Only allowlist manager can update Merkle roots
     * @param roundId Sale round identifier
     * @param merkleRoot New Merkle root for allowlist
     * @custom:security Only ALLOWLIST_MANAGER_ROLE can update allowlists
     */
    function updateAllowlistMerkleRoot(uint256 roundId, bytes32 merkleRoot) 
        external 
        onlyRole(ALLOWLIST_MANAGER_ROLE) 
    {
        if (saleRounds[roundId].roundId == 0) revert SaleAdmin__RoundNotFound();

        saleRounds[roundId].merkleRoot = merkleRoot;

        emit AllowlistUpdated(roundId, merkleRoot, msg.sender);
    }

    /**
     * @notice Add or update individual allowlist entries
     * @dev Only allowlist manager can modify individual entries
     * @param roundId Sale round identifier
     * @param users Array of user addresses
     * @param isAllowedFlags Array of allowlist status flags
     * @param individualCaps Array of custom individual caps (0 = use round default)
     * @custom:security Only ALLOWLIST_MANAGER_ROLE can modify entries
     */
    function updateIndividualAllowlist(
        uint256 roundId,
        address[] calldata users,
        bool[] calldata isAllowedFlags,
        uint256[] calldata individualCaps
    ) external onlyRole(ALLOWLIST_MANAGER_ROLE) {
        if (saleRounds[roundId].roundId == 0) revert SaleAdmin__RoundNotFound();
        if (users.length != isAllowedFlags.length || users.length != individualCaps.length) {
            revert SaleAdmin__ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] == address(0)) revert SaleAdmin__ZeroAddress();
            if (individualCaps[i] > MAX_INDIVIDUAL_CAP) revert SaleAdmin__InvalidCap();

            allowlists[roundId][users[i]] = AllowlistEntry({
                isAllowed: isAllowedFlags[i],
                individualCap: individualCaps[i],
                roundId: roundId,
                addedBy: msg.sender,
                addedAt: block.timestamp
            });

            emit IndividualAllowlistModified(
                roundId,
                users[i],
                isAllowedFlags[i],
                individualCaps[i],
                msg.sender
            );
        }
    }

    /**
     * @notice Remove users from allowlist
     * @dev Only allowlist manager can remove entries
     * @param roundId Sale round identifier
     * @param users Array of user addresses to remove
     * @custom:security Only ALLOWLIST_MANAGER_ROLE can remove entries
     */
    function removeFromAllowlist(uint256 roundId, address[] calldata users) 
        external 
        onlyRole(ALLOWLIST_MANAGER_ROLE) 
    {
        if (saleRounds[roundId].roundId == 0) revert SaleAdmin__RoundNotFound();

        for (uint256 i = 0; i < users.length; i++) {
            delete allowlists[roundId][users[i]];

            emit IndividualAllowlistModified(
                roundId,
                users[i],
                false,
                0,
                msg.sender
            );
        }
    }

    // ============ VERIFICATION FUNCTIONS ============

    /**
     * @notice Verify if user is on allowlist using Merkle proof
     * @dev Public function for verification before purchase
     * @param roundId Sale round identifier
     * @param user User address to verify
     * @param merkleProof Merkle proof for verification
     * @return True if user is on allowlist
     */
    function verifyAllowlist(
        uint256 roundId,
        address user,
        bytes32[] calldata merkleProof
    ) external view returns (bool) {
        SaleRound storage round = saleRounds[roundId];
        
        if (allowlists[roundId][user].isAllowed) {
            return true;
        }

        if (round.merkleRoot != bytes32(0)) {
            bytes32 leaf = keccak256(abi.encode(user));
            return MerkleProof.verify(merkleProof, round.merkleRoot, leaf);
        }

        return false;
    }

    /**
     * @notice Get effective individual cap for user
     * @dev Returns custom cap if set, otherwise round default
     * @param roundId Sale round identifier
     * @param user User address to check
     * @return Effective individual cap for user
     */
    function getEffectiveIndividualCap(uint256 roundId, address user) 
        external 
        view 
        returns (uint256) 
    {
        AllowlistEntry storage entry = allowlists[roundId][user];
        
        if (entry.individualCap > 0) {
            return entry.individualCap;
        }
        
        return saleRounds[roundId].individualCap;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update contract addresses
     * @dev Only governance admin can update contract addresses
     * @param _otcSwapContract New OTC swap contract address
     * @param _vestingVaultContract New vesting vault contract address
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can update addresses
     */
    function updateContractAddresses(
        address _otcSwapContract,
        address _vestingVaultContract
    ) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        if (_otcSwapContract == address(0)) revert SaleAdmin__ZeroAddress();
        if (_vestingVaultContract == address(0)) revert SaleAdmin__ZeroAddress();

        otcSwapContract = _otcSwapContract;
        vestingVaultContract = _vestingVaultContract;

        emit ContractAddressesUpdated(_otcSwapContract, _vestingVaultContract);
    }

    /**
     * @notice Set global sale pause status
     * @dev Emergency function for pause guardian
     * @param isPaused New pause status
     * @custom:security Only PAUSE_GUARDIAN_ROLE can pause globally
     */
    function setGlobalSalePause(bool isPaused) external onlyRole(PAUSE_GUARDIAN_ROLE) {
        globalSalePaused = isPaused;
        emit GlobalSalePauseChanged(isPaused, msg.sender);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get sale round details
     * @dev Returns complete sale round information
     * @param roundId Sale round identifier
     * @return Complete sale round struct
     */
    function getSaleRound(uint256 roundId) external view returns (SaleRound memory) {
        return saleRounds[roundId];
    }

    /**
     * @notice Get current active sale round
     * @dev Returns active round details
     * @return Complete active sale round struct
     */
    function getCurrentActiveSaleRound() external view returns (SaleRound memory) {
        if (currentActiveRound == 0) {
            return SaleRound({
                roundId: 0,
                name: "",
                isActive: false,
                merkleRoot: bytes32(0),
                pricePerToken: 0,
                totalCap: 0,
                individualCap: 0,
                startTime: 0,
                endTime: 0,
                vestingCliff: 0,
                vestingDuration: 0,
                totalSold: 0,
                participantCount: 0
            });
        }
        return saleRounds[currentActiveRound];
    }

    /**
     * @notice Get all sale round IDs
     * @dev Returns array of all created round IDs
     * @return Array of round IDs
     */
    function getAllRoundIds() external view returns (uint256[] memory) {
        return allRoundIds;
    }

    /**
     * @notice Get allowlist entry for user and round
     * @dev Returns allowlist details for specific user and round
     * @param roundId Sale round identifier
     * @param user User address to check
     * @return Complete allowlist entry struct
     */
    function getAllowlistEntry(uint256 roundId, address user) 
        external 
        view 
        returns (AllowlistEntry memory) 
    {
        return allowlists[roundId][user];
    }

    /**
     * @notice Check if sales are currently allowed
     * @dev Checks global pause and active round status
     * @return True if sales are allowed
     */
    function areSalesAllowed() external view returns (bool) {
        if (globalSalePaused) return false;
        if (currentActiveRound == 0) return false;
        
        SaleRound storage round = saleRounds[currentActiveRound];
        return round.isActive && 
               block.timestamp >= round.startTime && 
               block.timestamp <= round.endTime;
    }

    // ============ UPGRADE AUTHORIZATION ============

    /**
     * @notice Authorize contract upgrade
     * @dev Only governance admin can authorize upgrades
     * @param newImplementation Address of new implementation
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can authorize upgrades
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(GOVERNANCE_ADMIN_ROLE)
    {}
}
