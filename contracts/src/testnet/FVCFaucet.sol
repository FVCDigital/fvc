// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/IFVC.sol";

/**
 * @title FVCFaucet
 * @notice Testnet faucet for distributing FVC tokens
 * @dev Allows users to claim testnet FVC with cooldown and lifetime cap
 */
contract FVCFaucet {
    // ============ STATE VARIABLES ============

    /// @notice FVC token contract
    IFVC public immutable fvc;
    
    /// @notice Amount distributed per claim
    uint256 public constant CLAIM_AMOUNT = 10_000 * 1e18; // 10,000 FVC
    
    /// @notice Cooldown period between claims (24 hours)
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    
    /// @notice Maximum lifetime claims per address
    uint256 public constant MAX_CLAIMS_PER_ADDRESS = 5;
    
    /// @notice Last claim timestamp for each address
    mapping(address => uint256) public lastClaimTime;
    
    /// @notice Total claims per address
    mapping(address => uint256) public claimCount;

    // ============ EVENTS ============

    event FVCClaimed(address indexed user, uint256 amount, uint256 claimNumber);

    // ============ ERRORS ============

    error Faucet__CooldownActive(uint256 remainingTime);
    error Faucet__MaxClaimsReached(uint256 maxClaims);
    error Faucet__ZeroAddress();

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize faucet
     * @param _fvc FVC token address
     */
    constructor(address _fvc) {
        if (_fvc == address(0)) revert Faucet__ZeroAddress();
        fvc = IFVC(_fvc);
    }

    // ============ EXTERNAL FUNCTIONS ============

    /**
     * @notice Claim testnet FVC tokens
     * @dev Enforces cooldown and lifetime cap per address
     */
    function claim() external {
        address user = msg.sender;
        
        // Check max claims
        if (claimCount[user] >= MAX_CLAIMS_PER_ADDRESS) {
            revert Faucet__MaxClaimsReached(MAX_CLAIMS_PER_ADDRESS);
        }
        
        // Check cooldown
        uint256 timeSinceLastClaim = block.timestamp - lastClaimTime[user];
        if (lastClaimTime[user] != 0 && timeSinceLastClaim < COOLDOWN_PERIOD) {
            revert Faucet__CooldownActive(COOLDOWN_PERIOD - timeSinceLastClaim);
        }
        
        // Update state
        lastClaimTime[user] = block.timestamp;
        claimCount[user]++;
        
        // Mint FVC to user
        fvc.mint(user, CLAIM_AMOUNT);
        
        emit FVCClaimed(user, CLAIM_AMOUNT, claimCount[user]);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Check if address can claim
     * @param user Address to check
     * @return canClaim Whether user can claim
     * @return remainingCooldown Seconds until next claim (0 if can claim)
     * @return remainingClaims Number of claims remaining
     */
    function canClaim(address user) external view returns (
        bool canClaim,
        uint256 remainingCooldown,
        uint256 remainingClaims
    ) {
        // Check max claims
        if (claimCount[user] >= MAX_CLAIMS_PER_ADDRESS) {
            return (false, 0, 0);
        }
        
        remainingClaims = MAX_CLAIMS_PER_ADDRESS - claimCount[user];
        
        // Check cooldown
        if (lastClaimTime[user] == 0) {
            // Never claimed before
            return (true, 0, remainingClaims);
        }
        
        uint256 timeSinceLastClaim = block.timestamp - lastClaimTime[user];
        if (timeSinceLastClaim >= COOLDOWN_PERIOD) {
            return (true, 0, remainingClaims);
        }
        
        remainingCooldown = COOLDOWN_PERIOD - timeSinceLastClaim;
        return (false, remainingCooldown, remainingClaims);
    }

    /**
     * @notice Get user's claim info
     * @param user Address to check
     * @return claims Total claims made
     * @return lastClaim Timestamp of last claim
     * @return nextClaimTime Timestamp when next claim is available
     */
    function getUserInfo(address user) external view returns (
        uint256 claims,
        uint256 lastClaim,
        uint256 nextClaimTime
    ) {
        claims = claimCount[user];
        lastClaim = lastClaimTime[user];
        
        if (lastClaim == 0 || claims >= MAX_CLAIMS_PER_ADDRESS) {
            nextClaimTime = 0;
        } else {
            nextClaimTime = lastClaim + COOLDOWN_PERIOD;
        }
    }
}
