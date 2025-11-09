// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IFVC {
    function mint(address to, uint256 amount) external;
}

/// @notice Testnet-only faucet for FVC. Not for mainnet use.
contract FVCFaucet {
    struct UserInfo {
        uint256 claims;
        uint256 lastClaim;
    }

    /// @notice FVC token to mint
    IFVC public immutable FVC;

    /// @notice Amount minted per claim (18 decimals)
    uint256 public immutable CLAIM_AMOUNT;
    /// @notice Cooldown in seconds between claims per address
    uint256 public immutable CLAIM_COOLDOWN;
    /// @notice Max number of claims per address
    uint256 public immutable MAX_CLAIMS_PER_ADDRESS;

    mapping(address => UserInfo) public userInfo;

    event Claimed(address indexed user, uint256 amount, uint256 claimIndex);

    error Faucet__CooldownActive();
    error Faucet__MaxClaimsReached();

    constructor(address fvc, uint256 claimAmount, uint256 cooldown, uint256 maxClaims) {
        require(fvc != address(0), "zero fvc");
        require(claimAmount > 0, "zero amount");
        FVC = IFVC(fvc);
        CLAIM_AMOUNT = claimAmount;
        CLAIM_COOLDOWN = cooldown;
        MAX_CLAIMS_PER_ADDRESS = maxClaims;
    }

    function claim() external {
        UserInfo storage u = userInfo[msg.sender];
        if (u.claims >= MAX_CLAIMS_PER_ADDRESS) revert Faucet__MaxClaimsReached();
        if (u.lastClaim != 0 && block.timestamp < u.lastClaim + CLAIM_COOLDOWN) revert Faucet__CooldownActive();

        u.claims += 1;
        u.lastClaim = block.timestamp;

        FVC.mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, CLAIM_AMOUNT, u.claims);
    }

    function canClaim(address user) external view returns (bool can, uint256 remainingCooldown, uint256 remainingClaims) {
        UserInfo memory u = userInfo[user];
        remainingClaims = MAX_CLAIMS_PER_ADDRESS > u.claims ? (MAX_CLAIMS_PER_ADDRESS - u.claims) : 0;
        uint256 next = u.lastClaim + CLAIM_COOLDOWN;
        if (u.lastClaim == 0 || block.timestamp >= next) {
            can = remainingClaims > 0;
            remainingCooldown = 0;
        } else {
            can = false;
            remainingCooldown = next - block.timestamp;
        }
    }

    function getUserInfo(address user) external view returns (uint256 claims, uint256 lastClaim, uint256 nextClaimTime) {
        UserInfo memory u = userInfo[user];
        claims = u.claims;
        lastClaim = u.lastClaim;
        nextClaimTime = u.lastClaim == 0 ? 0 : (u.lastClaim + CLAIM_COOLDOWN);
    }
}
