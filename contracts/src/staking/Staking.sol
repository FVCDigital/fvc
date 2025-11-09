// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingRewards
 * @notice Proportional staking rewards based on Synthetix StakingRewards pattern
 * @dev Battle-tested pattern used by Synthetix, Curve, Uniswap V2, SushiSwap
 * 
 * PATTERN SOURCE: Synthetix StakingRewards.sol
 * Audited by: Sigma Prime (2019), Iosiro (2020)
 * TVL: Billions across multiple protocols
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Checks-Effects-Interactions pattern
 * - Proven reward calculation math
 */
contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============

    /// @notice Token users stake (FVC)
    IERC20 public immutable stakingToken;
    
    /// @notice Token users earn as rewards (USDC)
    IERC20 public immutable rewardsToken;

    /// @notice Reward rate per second
    uint256 public rewardRate;
    
    /// @notice Duration of rewards distribution (default 7 days)
    uint256 public rewardsDuration = 7 days;
    
    /// @notice Timestamp when current reward period ends
    uint256 public periodFinish;
    
    /// @notice Last time rewards were updated
    uint256 public lastUpdateTime;
    
    /// @notice Accumulated reward per token stored
    uint256 public rewardPerTokenStored;

    /// @notice Total staked tokens
    uint256 private _totalSupply;
    
    /// @notice User staked balances
    mapping(address => uint256) private _balances;
    
    /// @notice User reward per token paid
    mapping(address => uint256) public userRewardPerTokenPaid;
    
    /// @notice User accumulated rewards
    mapping(address => uint256) public rewards;

    // ============ EVENTS ============

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardAdded(uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize staking contract
     * @param _stakingToken Token to stake (FVC)
     * @param _rewardsToken Token to earn (USDC)
     */
    constructor(
        address _stakingToken,
        address _rewardsToken
    ) {
        require(_stakingToken != address(0), "Zero address");
        require(_rewardsToken != address(0), "Zero address");
        
        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
    }

    // ============ VIEWS ============

    /**
     * @notice Total staked tokens
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice User's staked balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Last time rewards are applicable
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /**
     * @notice Reward per token calculation (Synthetix formula)
     * @dev This is the core of the proportional distribution
     */
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / _totalSupply);
    }

    /**
     * @notice Calculate earned rewards for account
     * @param account User address
     */
    function earned(address account) public view returns (uint256) {
        return
            ((_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) +
            rewards[account];
    }

    /**
     * @notice Get reward for duration
     */
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * rewardsDuration;
    }

    // ============ MUTATIVE FUNCTIONS ============

    /**
     * @notice Stake tokens
     * @param amount Amount to stake
     */
    function stake(uint256 amount) 
        external 
        nonReentrant 
        updateReward(msg.sender) 
    {
        require(amount > 0, "Cannot stake 0");
        
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraw staked tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
        updateReward(msg.sender) 
    {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        
        stakingToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Claim earned rewards
     */
    function getReward() 
        external 
        nonReentrant 
        updateReward(msg.sender) 
    {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @notice Withdraw all and claim rewards
     */
    function exit() external nonReentrant updateReward(msg.sender) {
        uint256 balance = _balances[msg.sender];
        if (balance > 0) {
            _totalSupply -= balance;
            _balances[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, balance);
            emit Withdrawn(msg.sender, balance);
        }
        
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // ============ RESTRICTED FUNCTIONS ============

    /**
     * @notice Notify contract of reward amount
     * @param reward Amount of rewards to distribute
     * @dev Called by reward distributor (MockYieldDistributor on testnet)
     */
    function notifyRewardAmount(uint256 reward) 
        external 
        onlyOwner 
        updateReward(address(0)) 
    {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance / rewardsDuration, "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        
        emit RewardAdded(reward);
    }

    /**
     * @notice Update rewards duration
     * @param _rewardsDuration New duration in seconds
     */
    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsDuration);
    }

    /**
     * @notice Recover ERC20 tokens sent by mistake
     * @param tokenAddress Token to recover
     * @param tokenAmount Amount to recover
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "Cannot withdraw staking token");
        require(tokenAddress != address(rewardsToken), "Cannot withdraw rewards token");
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
    }

    // ============ MODIFIERS ============

    /**
     * @notice Update reward for account
     * @param account Account to update
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
}
