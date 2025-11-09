// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Aave v3 Pool interface (subset)
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @title AaveYieldAdapter
 * @notice Minimal adapter that supplies USDC to Aave v3 and harvests yield to the Treasury
 * @dev MVP: Treasury pushes USDC into the adapter, adapter supplies to Aave, harvest withdraws yield only
 */
contract AaveYieldAdapter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice USDC token (6 decimals)
    IERC20 public immutable usdc;
    /// @notice Aave v3 Pool
    IPool public immutable pool;
    /// @notice aUSDC token corresponding to USDC reserve
    IERC20 public immutable aToken;
    /// @notice Treasury that controls deposits/withdrawals
    address public immutable treasury;

    /// @notice Tracked principal supplied to Aave (in USDC units)
    uint256 public principal;

    /// @notice Emitted when USDC is deposited into Aave
    event Deposited(uint256 amount);
    /// @notice Emitted when principal is withdrawn from Aave back to Treasury
    event PrincipalWithdrawn(uint256 amount);
    /// @notice Emitted when yield is harvested to Treasury
    event Harvested(uint256 yieldAmount);

    error NotTreasury();
    error ZeroAmount();

    modifier onlyTreasury() {
        if (msg.sender != treasury) revert NotTreasury();
        _;
    }

    /**
     * @param _usdc USDC token address
     * @param _pool Aave v3 Pool address
     * @param _aToken aUSDC token address
     * @param _treasury Treasury address that controls the adapter
     */
    constructor(address _usdc, address _pool, address _aToken, address _treasury) {
        require(_usdc != address(0) && _pool != address(0) && _aToken != address(0) && _treasury != address(0), "Zero addr");
        usdc = IERC20(_usdc);
        pool = IPool(_pool);
        aToken = IERC20(_aToken);
        treasury = _treasury;
        // Approve Pool to pull USDC once
        usdc.safeApprove(_pool, 0);
        usdc.safeApprove(_pool, type(uint256).max);
    }

    /**
     * @notice Supply any USDC held by this adapter to Aave, tracking it as principal
     * @dev Treasury should transfer USDC to this contract before calling.
     */
    function depositAll() external onlyTreasury nonReentrant {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance == 0) revert ZeroAmount();
        pool.supply(address(usdc), balance, address(this), 0);
        principal += balance;
        emit Deposited(balance);
    }

    /**
     * @notice Withdraw part of principal back to Treasury
     * @param amount Amount of principal to withdraw
     */
    function withdrawPrincipal(uint256 amount) external onlyTreasury nonReentrant {
        if (amount == 0) revert ZeroAmount();
        require(amount <= principal, "Exceeds principal");
        uint256 withdrawn = pool.withdraw(address(usdc), amount, treasury);
        if (withdrawn > principal) {
            principal = 0;
        } else {
            principal -= withdrawn;
        }
        emit PrincipalWithdrawn(withdrawn);
    }

    /**
     * @notice Harvest accrued yield (aUSDC - principal) to Treasury as USDC
     * @return yieldAmount Amount of USDC harvested
     */
    function harvest() external onlyTreasury nonReentrant returns (uint256 yieldAmount) {
        uint256 currentUnderlying = aToken.balanceOf(address(this));
        if (currentUnderlying <= principal) {
            yieldAmount = 0;
        } else {
            yieldAmount = currentUnderlying - principal;
            uint256 withdrawn = pool.withdraw(address(usdc), yieldAmount, treasury);
            if (withdrawn != yieldAmount) {
                yieldAmount = withdrawn;
            }
        }
        emit Harvested(yieldAmount);
    }

    /**
     * @notice View helper: current underlying balance in Aave (principal + accrued)
     */
    function currentUnderlying() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }
}
