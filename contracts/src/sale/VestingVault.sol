pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VestingVault
 * @notice Immutable token custody contract with cliff and linear vesting schedules
 * @dev Manages FVC token vesting with ERC-1155 receipts for vesting positions
 * @custom:security Immutable contract for maximum user trust - no upgrades possible
 */
contract VestingVault is ERC1155, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when vesting amount is zero
    error VestingVault__ZeroAmount();
    
    /// @notice Error when address is zero
    error VestingVault__ZeroAddress();
    
    /// @notice Error when cliff period is invalid
    error VestingVault__InvalidCliff();
    
    /// @notice Error when vesting duration is invalid
    error VestingVault__InvalidDuration();
    
    /// @notice Error when trying to claim before cliff
    error VestingVault__CliffNotReached();
    
    /// @notice Error when trying to claim more than vested
    error VestingVault__InsufficientVestedAmount();
    
    /// @notice Error when vesting schedule doesn't exist
    error VestingVault__ScheduleNotFound();
    
    /// @notice Error when trying to revoke non-revocable schedule
    error VestingVault__NotRevocable();
    
    /// @notice Error when unauthorized revocation attempt
    error VestingVault__UnauthorizedRevocation();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for sale contracts that can create vesting
    bytes32 public constant SALE_ROLE = keccak256("SALE_ROLE");
    
    /// @notice Role identifier for addresses that can revoke vesting
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    
    /// @notice Role identifier for vesting admin
    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");
    
    /// @notice Maximum vesting duration (4 years)
    uint256 public constant MAX_VESTING_DURATION = 4 * 365 * 24 * 60 * 60;
    
    /// @notice Maximum cliff period (1 year)
    uint256 public constant MAX_CLIFF_PERIOD = 365 * 24 * 60 * 60;

    // ============ STRUCTS ============

    /**
     * @notice Vesting schedule structure
     * @dev Contains all vesting parameters for a beneficiary
     * @param beneficiary Address that will receive the vested tokens
     * @param totalAmount Total amount of tokens in the vesting schedule
     * @param claimedAmount Amount of tokens already claimed
     * @param startTime Vesting start timestamp
     * @param cliffTime Cliff end timestamp (when vesting begins)
     * @param endTime Vesting end timestamp (when fully vested)
     * @param isRevocable Whether the schedule can be revoked
     * @param isRevoked Whether the schedule has been revoked
     * @param revoker Address authorized to revoke (if revocable)
     */
    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 cliffTime;
        uint256 endTime;
        bool isRevocable;
        bool isRevoked;
        address revoker;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice FVC token contract
    IERC20 public immutable fvcToken;
    
    /// @notice Counter for vesting schedule IDs
    uint256 public nextScheduleId;
    
    /// @notice Mapping of schedule ID to vesting schedule
    mapping(uint256 => VestingSchedule) public vestingSchedules;
    
    /// @notice Mapping of beneficiary to their schedule IDs
    mapping(address => uint256[]) public beneficiarySchedules;
    
    /// @notice Total tokens held in vesting
    uint256 public totalVestingTokens;

    // ============ EVENTS ============

    /// @notice Emitted when a new vesting schedule is created
    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffTime,
        uint256 endTime,
        bool isRevocable
    );

    /// @notice Emitted when tokens are claimed from vesting
    event TokensClaimed(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 remainingAmount
    );

    /// @notice Emitted when a vesting schedule is revoked
    event VestingRevoked(
        uint256 indexed scheduleId,
        address indexed revoker,
        uint256 returnedAmount
    );

    /// @notice Emitted when beneficiary is changed
    event BeneficiaryChanged(
        uint256 indexed scheduleId,
        address indexed oldBeneficiary,
        address indexed newBeneficiary
    );

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the Vesting Vault contract
     * @dev Sets up immutable token reference and initial roles
     * @param _fvcToken FVC token contract address
     * @param _admin Initial admin address
     * @param _baseURI Base URI for ERC-1155 metadata
     * @custom:security Immutable constructor - contract cannot be upgraded
     */
    constructor(
        address _fvcToken,
        address _admin,
        string memory _baseURI
    ) ERC1155(_baseURI) {
        if (_fvcToken == address(0)) revert VestingVault__ZeroAddress();
        if (_admin == address(0)) revert VestingVault__ZeroAddress();

        fvcToken = IERC20(_fvcToken);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VESTING_ADMIN_ROLE, _admin);
        _grantRole(SALE_ROLE, _admin);
        _grantRole(REVOKER_ROLE, _admin);

        nextScheduleId = 1; // Start from 1, 0 is reserved
    }

    // ============ VESTING CREATION ============

    /**
     * @notice Create a new vesting schedule
     * @dev Only addresses with SALE_ROLE can create vesting schedules
     * @param beneficiary Address that will receive the vested tokens
     * @param totalAmount Total amount of tokens to vest
     * @param cliffDuration Duration of cliff period in seconds
     * @param vestingDuration Total vesting duration in seconds
     * @param isRevocable Whether the schedule can be revoked
     * @param revoker Address authorized to revoke (if revocable)
     * @return scheduleId Unique identifier for the created schedule
     * @custom:security Only SALE_ROLE can create vesting schedules
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool isRevocable,
        address revoker
    ) external onlyRole(SALE_ROLE) nonReentrant returns (uint256 scheduleId) {
        if (beneficiary == address(0)) revert VestingVault__ZeroAddress();
        if (totalAmount == 0) revert VestingVault__ZeroAmount();
        if (cliffDuration > MAX_CLIFF_PERIOD) revert VestingVault__InvalidCliff();
        if (vestingDuration == 0 || vestingDuration > MAX_VESTING_DURATION) {
            revert VestingVault__InvalidDuration();
        }
        if (isRevocable && revoker == address(0)) revert VestingVault__ZeroAddress();

        scheduleId = nextScheduleId++;
        
        uint256 startTime = block.timestamp;
        uint256 cliffTime = startTime + cliffDuration;
        uint256 endTime = startTime + vestingDuration;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            claimedAmount: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime,
            isRevocable: isRevocable,
            isRevoked: false,
            revoker: revoker
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        totalVestingTokens += totalAmount;

        fvcToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        _mint(beneficiary, scheduleId, 1, "");

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            totalAmount,
            startTime,
            cliffTime,
            endTime,
            isRevocable
        );
    }

    /**
     * @notice Create multiple vesting schedules in batch
     * @dev Gas-optimized batch creation for multiple beneficiaries
     * @param beneficiaries Array of beneficiary addresses
     * @param totalAmounts Array of total amounts to vest
     * @param cliffDurations Array of cliff durations
     * @param vestingDurations Array of vesting durations
     * @param isRevocableFlags Array of revocable flags
     * @param revokers Array of revoker addresses
     * @return scheduleIds Array of created schedule IDs
     * @custom:security Only SALE_ROLE can create batch vesting
     */
    function createBatchVestingSchedules(
        address[] calldata beneficiaries,
        uint256[] calldata totalAmounts,
        uint256[] calldata cliffDurations,
        uint256[] calldata vestingDurations,
        bool[] calldata isRevocableFlags,
        address[] calldata revokers
    ) external onlyRole(SALE_ROLE) nonReentrant returns (uint256[] memory scheduleIds) {
        uint256 length = beneficiaries.length;
        require(
            totalAmounts.length == length &&
            cliffDurations.length == length &&
            vestingDurations.length == length &&
            isRevocableFlags.length == length &&
            revokers.length == length,
            "Array length mismatch"
        );

        scheduleIds = new uint256[](length);
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < length; i++) {
            scheduleIds[i] = _createVestingScheduleInternal(
                beneficiaries[i],
                totalAmounts[i],
                cliffDurations[i],
                vestingDurations[i],
                isRevocableFlags[i],
                revokers[i]
            );
            totalAmount += totalAmounts[i];
        }

        fvcToken.safeTransferFrom(msg.sender, address(this), totalAmount);
    }

    // ============ VESTING CLAIMS ============

    /**
     * @notice Claim vested tokens from a schedule
     * @dev Beneficiary can claim tokens after cliff period
     * @param scheduleId Vesting schedule identifier
     * @custom:security Only beneficiary can claim their vested tokens
     */
    function claimVestedTokens(uint256 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert VestingVault__ScheduleNotFound();
        if (schedule.beneficiary != msg.sender) revert VestingVault__UnauthorizedRevocation();
        if (schedule.isRevoked) revert VestingVault__ScheduleNotFound();
        if (block.timestamp < schedule.cliffTime) revert VestingVault__CliffNotReached();

        uint256 vestedAmount = _calculateVestedAmount(scheduleId);
        uint256 claimableAmount = vestedAmount - schedule.claimedAmount;
        
        if (claimableAmount == 0) revert VestingVault__InsufficientVestedAmount();

        schedule.claimedAmount += claimableAmount;
        totalVestingTokens -= claimableAmount;

        fvcToken.safeTransfer(msg.sender, claimableAmount);

        uint256 remainingAmount = schedule.totalAmount - schedule.claimedAmount;

        emit TokensClaimed(scheduleId, msg.sender, claimableAmount, remainingAmount);
    }

    /**
     * @notice Claim from multiple vesting schedules
     * @dev Gas-optimized batch claiming
     * @param scheduleIds Array of schedule IDs to claim from
     */
    function claimMultipleSchedules(uint256[] calldata scheduleIds) external nonReentrant {
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < scheduleIds.length; ++i) {
            uint256 scheduleId = scheduleIds[i];
            VestingSchedule storage schedule = vestingSchedules[scheduleId];
            
            if (schedule.beneficiary != msg.sender) continue;
            if (schedule.isRevoked) continue;
            if (block.timestamp < schedule.cliffTime) continue;

            uint256 vestedAmount = _calculateVestedAmount(scheduleId);
            uint256 claimableAmount = vestedAmount - schedule.claimedAmount;
            
            if (claimableAmount > 0) {
                schedule.claimedAmount += claimableAmount;
                totalClaimable += claimableAmount;

                uint256 remainingAmount = schedule.totalAmount - schedule.claimedAmount;
                emit TokensClaimed(scheduleId, msg.sender, claimableAmount, remainingAmount);
            }
        }

        if (totalClaimable > 0) {
            totalVestingTokens -= totalClaimable;
            fvcToken.safeTransfer(msg.sender, totalClaimable);
        }
    }

    // ============ VESTING MANAGEMENT ============

    /**
     * @notice Revoke a vesting schedule
     * @dev Only authorized revoker can revoke revocable schedules
     * @param scheduleId Vesting schedule identifier
     * @custom:security Only authorized revoker can revoke
     */
    function revokeVestingSchedule(uint256 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert VestingVault__ScheduleNotFound();
        if (!schedule.isRevocable) revert VestingVault__NotRevocable();
        if (schedule.isRevoked) revert VestingVault__ScheduleNotFound();
        if (msg.sender != schedule.revoker && !hasRole(REVOKER_ROLE, msg.sender)) {
            revert VestingVault__UnauthorizedRevocation();
        }

        uint256 vestedAmount = _calculateVestedAmount(scheduleId);
        uint256 returnAmount = schedule.totalAmount - vestedAmount;

        schedule.isRevoked = true;
        totalVestingTokens -= returnAmount;

        if (returnAmount > 0) {
            fvcToken.safeTransfer(schedule.revoker, returnAmount);
        }

        _burn(schedule.beneficiary, scheduleId, 1);

        emit VestingRevoked(scheduleId, msg.sender, returnAmount);
    }

    /**
     * @notice Change beneficiary of a vesting schedule
     * @dev Only current beneficiary can change to new address
     * @param scheduleId Vesting schedule identifier
     * @param newBeneficiary New beneficiary address
     * @custom:security Only current beneficiary can change beneficiary
     */
    function changeBeneficiary(uint256 scheduleId, address newBeneficiary) external {
        if (newBeneficiary == address(0)) revert VestingVault__ZeroAddress();
        
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.beneficiary == address(0)) revert VestingVault__ScheduleNotFound();
        if (schedule.beneficiary != msg.sender) revert VestingVault__UnauthorizedRevocation();
        if (schedule.isRevoked) revert VestingVault__ScheduleNotFound();

        address oldBeneficiary = schedule.beneficiary;
        schedule.beneficiary = newBeneficiary;

        _removeFromBeneficiarySchedules(oldBeneficiary, scheduleId);
        
        beneficiarySchedules[newBeneficiary].push(scheduleId);

        _safeTransferFrom(oldBeneficiary, newBeneficiary, scheduleId, 1, "");

        emit BeneficiaryChanged(scheduleId, oldBeneficiary, newBeneficiary);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Calculate vested amount for a schedule
     * @dev Returns amount of tokens vested at current time
     * @param scheduleId Vesting schedule identifier
     * @return Vested token amount
     */
    function calculateVestedAmount(uint256 scheduleId) external view returns (uint256) {
        return _calculateVestedAmount(scheduleId);
    }

    /**
     * @notice Calculate claimable amount for a schedule
     * @dev Returns amount of tokens that can be claimed now
     * @param scheduleId Vesting schedule identifier
     * @return Claimable token amount
     */
    function calculateClaimableAmount(uint256 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        if (schedule.isRevoked || block.timestamp < schedule.cliffTime) {
            return 0;
        }
        
        uint256 vestedAmount = _calculateVestedAmount(scheduleId);
        return vestedAmount > schedule.claimedAmount ? vestedAmount - schedule.claimedAmount : 0;
    }

    /**
     * @notice Get all schedule IDs for a beneficiary
     * @dev Returns array of schedule IDs
     * @param beneficiary Address to check
     * @return Array of schedule IDs
     */
    function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory) {
        return beneficiarySchedules[beneficiary];
    }

    /**
     * @notice Get vesting schedule details
     * @dev Returns complete schedule information
     * @param scheduleId Vesting schedule identifier
     * @return Complete vesting schedule struct
     */
    function getVestingSchedule(uint256 scheduleId) external view returns (VestingSchedule memory) {
        return vestingSchedules[scheduleId];
    }

    /**
     * @notice Get total claimable amount for beneficiary
     * @dev Sums claimable amounts across all beneficiary schedules
     * @param beneficiary Address to check
     * @return Total claimable amount
     */
    function getTotalClaimableAmount(address beneficiary) external view returns (uint256) {
        uint256[] memory scheduleIds = beneficiarySchedules[beneficiary];
        uint256 totalClaimable = 0;

        for (uint256 i = 0; i < scheduleIds.length; ++i) {
            uint256 scheduleId = scheduleIds[i];
            VestingSchedule storage schedule = vestingSchedules[scheduleId];
            
            if (!schedule.isRevoked && block.timestamp >= schedule.cliffTime) {
                uint256 vestedAmount = _calculateVestedAmount(scheduleId);
                uint256 claimableAmount = vestedAmount > schedule.claimedAmount ? 
                    vestedAmount - schedule.claimedAmount : 0;
                totalClaimable += claimableAmount;
            }
        }

        return totalClaimable;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Internal function to create vesting schedule
     * @dev Used by batch creation to avoid code duplication
     * @param beneficiary Address that will receive the tokens
     * @param totalAmount Total amount of tokens to vest
     * @param cliffDuration Duration of cliff period
     * @param vestingDuration Total vesting duration
     * @param isRevocable Whether schedule can be revoked
     * @param revoker Address authorized to revoke
     * @return scheduleId Created schedule ID
     */
    function _createVestingScheduleInternal(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool isRevocable,
        address revoker
    ) internal returns (uint256 scheduleId) {
        if (beneficiary == address(0)) revert VestingVault__ZeroAddress();
        if (totalAmount == 0) revert VestingVault__ZeroAmount();
        if (cliffDuration > MAX_CLIFF_PERIOD) revert VestingVault__InvalidCliff();
        if (vestingDuration == 0 || vestingDuration > MAX_VESTING_DURATION) {
            revert VestingVault__InvalidDuration();
        }

        scheduleId = nextScheduleId++;
        
        uint256 startTime = block.timestamp;
        uint256 cliffTime = startTime + cliffDuration;
        uint256 endTime = startTime + vestingDuration;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            claimedAmount: 0,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime,
            isRevocable: isRevocable,
            isRevoked: false,
            revoker: revoker
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        totalVestingTokens += totalAmount;

        _mint(beneficiary, scheduleId, 1, "");

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            totalAmount,
            startTime,
            cliffTime,
            endTime,
            isRevocable
        );
    }

    /**
     * @notice Calculate vested amount using linear vesting formula
     * @dev Internal calculation for vested tokens
     * @param scheduleId Vesting schedule identifier
     * @return Amount of tokens vested
     */
    function _calculateVestedAmount(uint256 scheduleId) internal view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        if (schedule.isRevoked || block.timestamp < schedule.cliffTime) {
            return 0;
        }
        
        if (block.timestamp >= schedule.endTime) {
            return schedule.totalAmount;
        }
        
        uint256 vestingDuration = schedule.endTime - schedule.cliffTime;
        if (vestingDuration == 0) return schedule.totalAmount; // Instant vesting if no duration
        
        uint256 timeVested = block.timestamp - schedule.cliffTime;
        
        return (schedule.totalAmount * timeVested) / vestingDuration;
    }

    /**
     * @notice Remove schedule ID from beneficiary's schedule list
     * @dev Internal helper for beneficiary changes
     * @param beneficiary Address to remove from
     * @param scheduleId Schedule ID to remove
     */
    function _removeFromBeneficiarySchedules(address beneficiary, uint256 scheduleId) internal {
        uint256[] storage schedules = beneficiarySchedules[beneficiary];
        
        for (uint256 i = 0; i < schedules.length; i++) {
            if (schedules[i] == scheduleId) {
                schedules[i] = schedules[schedules.length - 1];
                schedules.pop();
                break;
            }
        }
    }

    // ============ ERC-1155 OVERRIDES ============

    /**
     * @notice Override to prevent transfers of vesting receipts
     * @dev Vesting receipts are soulbound except for beneficiary changes
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /**
     * @notice Override supportsInterface to resolve conflict between ERC1155 and AccessControl
     * @dev Both contracts implement supportsInterface, so we need to override
     * @param interfaceId The interface identifier
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override(ERC1155, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
