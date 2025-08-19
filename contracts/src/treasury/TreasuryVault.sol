// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TreasuryVault
 * @notice Multi-sig controlled treasury with automated distribution rules for FVC Protocol
 * @dev UUPS upgradeable contract managing protocol treasury and fund distribution
 * @custom:security Uses multi-sig governance with role-based access control
 */
contract TreasuryVault is AccessControlUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when amount is zero
    error TreasuryVault__ZeroAmount();
    
    /// @notice Error when address is zero
    error TreasuryVault__ZeroAddress();
    
    /// @notice Error when insufficient balance for operation
    error TreasuryVault__InsufficientBalance();
    
    /// @notice Error when transfer amount exceeds limits
    error TreasuryVault__ExceedsTransferLimit();
    
    /// @notice Error when trying to transfer to blacklisted address
    error TreasuryVault__AddressBlacklisted();
    
    /// @notice Error when unauthorized withdrawal attempt
    error TreasuryVault__UnauthorizedWithdrawal();
    
    /// @notice Error when distribution percentages don't sum to 100%
    error TreasuryVault__InvalidDistributionPercentages();
    
    /// @notice Error when proposal is not ready for execution
    error TreasuryVault__ProposalNotReady();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for treasury admin
    bytes32 public constant TREASURY_ADMIN_ROLE = keccak256("TREASURY_ADMIN_ROLE");
    
    /// @notice Role identifier for fund manager
    bytes32 public constant FUND_MANAGER_ROLE = keccak256("FUND_MANAGER_ROLE");
    
    /// @notice Role identifier for emergency role
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    /// @notice Role identifier for governance
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    /// @notice Maximum single transfer limit (10M USDC)
    uint256 public constant MAX_SINGLE_TRANSFER = 10_000_000 * 1e6;
    
    /// @notice Maximum daily transfer limit (50M USDC)
    uint256 public constant MAX_DAILY_TRANSFER = 50_000_000 * 1e6;
    
    /// @notice Basis points for percentage calculations (100% = 10000)
    uint256 public constant BASIS_POINTS = 10000;

    // ============ STRUCTS ============

    /**
     * @notice Treasury proposal structure
     * @dev Contains proposal details for fund transfers
     * @param id Unique proposal identifier
     * @param proposer Address that created the proposal
     * @param target Target address for fund transfer
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param description Human-readable description
     * @param createdAt Proposal creation timestamp
     * @param executedAt Proposal execution timestamp (0 if not executed)
     * @param isExecuted Whether proposal has been executed
     * @param approvals Number of approvals received
     * @param rejections Number of rejections received
     */
    struct TreasuryProposal {
        uint256 id;
        address proposer;
        address target;
        address token;
        uint256 amount;
        string description;
        uint256 createdAt;
        uint256 executedAt;
        bool isExecuted;
        uint256 approvals;
        uint256 rejections;
    }

    /**
     * @notice Distribution rule structure
     * @dev Defines automatic fund distribution rules
     * @param stakingPercentage Percentage allocated to staking rewards (basis points)
     * @param treasuryPercentage Percentage kept in treasury (basis points)
     * @param operationsPercentage Percentage for operations (basis points)
     * @param developmentPercentage Percentage for development (basis points)
     * @param stakingContract Address of staking contract
     * @param operationsWallet Address of operations wallet
     * @param developmentWallet Address of development wallet
     * @param isActive Whether distribution rules are active
     */
    struct DistributionRules {
        uint256 stakingPercentage;
        uint256 treasuryPercentage;
        uint256 operationsPercentage;
        uint256 developmentPercentage;
        address stakingContract;
        address operationsWallet;
        address developmentWallet;
        bool isActive;
    }

    // ============ STATE VARIABLES ============
    
    /// @notice Counter for proposal IDs
    uint256 public nextProposalId;
    
    /// @notice Required approvals for proposal execution
    uint256 public requiredApprovals;
    
    /// @notice Maximum proposal execution delay
    uint256 public maxExecutionDelay;
    
    /// @notice Mapping of proposal ID to proposal details
    mapping(uint256 => TreasuryProposal) public proposals;
    
    /// @notice Mapping of proposal ID and address to approval status
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Mapping of proposal ID and address to vote (true = approve, false = reject)
    mapping(uint256 => mapping(address => bool)) public votes;
    
    /// @notice Daily transfer amounts by date
    mapping(uint256 => uint256) public dailyTransferAmounts;
    
    /// @notice Blacklisted addresses
    mapping(address => bool) public blacklistedAddresses;
    
    /// @notice Current distribution rules
    DistributionRules public distributionRules;
    
    /// @notice Whether contract is paused
    bool public paused;
    
    /// @notice Revenue router contract address
    address public revenueRouter;

    // ============ EVENTS ============

    /// @notice Emitted when a new proposal is created
    /// @param proposalId Unique proposal identifier
    /// @param proposer Address that created the proposal
    /// @param target Target address for transfer
    /// @param token Token address
    /// @param amount Transfer amount
    /// @param description Proposal description
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        address token,
        uint256 amount,
        string description
    );

    /// @notice Emitted when a proposal receives a vote
    /// @param proposalId Proposal identifier
    /// @param voter Address that voted
    /// @param approved Whether vote was approval or rejection
    event ProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool approved
    );

    /// @notice Emitted when a proposal is executed
    /// @param proposalId Proposal identifier
    /// @param executor Address that executed the proposal
    /// @param target Target address
    /// @param amount Transfer amount
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        address indexed target,
        uint256 amount
    );

    /// @notice Emitted when funds are received
    /// @param from Source address
    /// @param token Token address
    /// @param amount Amount received
    event FundsReceived(
        address indexed from,
        address indexed token,
        uint256 amount
    );

    /// @notice Emitted when distribution rules are updated
    /// @param stakingPercentage New staking percentage
    /// @param treasuryPercentage New treasury percentage
    /// @param operationsPercentage New operations percentage
    /// @param developmentPercentage New development percentage
    event DistributionRulesUpdated(
        uint256 stakingPercentage,
        uint256 treasuryPercentage,
        uint256 operationsPercentage,
        uint256 developmentPercentage
    );

    /// @notice Emitted when emergency withdrawal occurs
    /// @param token Token address
    /// @param amount Amount withdrawn
    /// @param destination Destination address
    /// @param executor Address that executed withdrawal
    event EmergencyWithdrawal(
        address indexed token,
        uint256 amount,
        address indexed destination,
        address indexed executor
    );

    // ============ STORAGE GAP ============
    
    /// @dev Storage gap for future upgrades
    uint256[35] private __gap;

    // ============ INITIALIZER ============

    /**
     * @notice Initialize the Treasury Vault contract
     * @dev Sets up initial configuration and roles
     * @param _admin Initial admin address
     * @param _fundManagers Array of fund manager addresses
     * @param _requiredApprovals Number of approvals required for execution
     * @param _maxExecutionDelay Maximum delay for proposal execution
     * @custom:security Only callable once during deployment
     */
    function initialize(
        address _admin,
        address[] memory _fundManagers,
        uint256 _requiredApprovals,
        uint256 _maxExecutionDelay
    ) external initializer {
        if (_admin == address(0)) revert TreasuryVault__ZeroAddress();
        if (_requiredApprovals == 0) revert TreasuryVault__ZeroAmount();

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        requiredApprovals = _requiredApprovals;
        maxExecutionDelay = _maxExecutionDelay;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TREASURY_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ROLE, _admin);

        // Grant fund manager roles
        for (uint256 i = 0; i < _fundManagers.length; i++) {
            if (_fundManagers[i] != address(0)) {
                _grantRole(FUND_MANAGER_ROLE, _fundManagers[i]);
            }
        }

        nextProposalId = 1;
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to check if contract is not paused
     */
    modifier whenNotPaused() {
        require(!paused, "Treasury is paused");
        _;
    }

    /**
     * @notice Modifier to check if address is not blacklisted
     * @param target Address to check
     */
    modifier notBlacklisted(address target) {
        if (blacklistedAddresses[target]) revert TreasuryVault__AddressBlacklisted();
        _;
    }

    // ============ PROPOSAL FUNCTIONS ============

    /**
     * @notice Create a new treasury proposal
     * @dev Only fund managers can create proposals
     * @param target Target address for fund transfer
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param description Human-readable description
     * @return proposalId Created proposal identifier
     * @custom:security Only FUND_MANAGER_ROLE can create proposals
     */
    function createProposal(
        address target,
        address token,
        uint256 amount,
        string calldata description
    ) external onlyRole(FUND_MANAGER_ROLE) whenNotPaused notBlacklisted(target) returns (uint256 proposalId) {
        if (target == address(0)) revert TreasuryVault__ZeroAddress();
        if (amount == 0) revert TreasuryVault__ZeroAmount();
        if (amount > MAX_SINGLE_TRANSFER) revert TreasuryVault__ExceedsTransferLimit();

        // Check if sufficient balance exists
        uint256 balance = token == address(0) ? 
            address(this).balance : 
            IERC20(token).balanceOf(address(this));
        
        if (amount > balance) revert TreasuryVault__InsufficientBalance();

        proposalId = nextProposalId++;

        proposals[proposalId] = TreasuryProposal({
            id: proposalId,
            proposer: msg.sender,
            target: target,
            token: token,
            amount: amount,
            description: description,
            createdAt: block.timestamp,
            executedAt: 0,
            isExecuted: false,
            approvals: 0,
            rejections: 0
        });

        emit ProposalCreated(proposalId, msg.sender, target, token, amount, description);
    }

    /**
     * @notice Vote on a treasury proposal
     * @dev Only fund managers can vote on proposals
     * @param proposalId Proposal identifier
     * @param approve True for approval, false for rejection
     * @custom:security Only FUND_MANAGER_ROLE can vote
     */
    function voteOnProposal(uint256 proposalId, bool approve) 
        external 
        onlyRole(FUND_MANAGER_ROLE) 
        whenNotPaused 
    {
        TreasuryProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert TreasuryVault__ProposalNotReady();
        if (proposal.isExecuted) revert TreasuryVault__ProposalNotReady();
        if (hasVoted[proposalId][msg.sender]) revert TreasuryVault__ProposalNotReady();

        hasVoted[proposalId][msg.sender] = true;
        votes[proposalId][msg.sender] = approve;

        if (approve) {
            proposal.approvals++;
        } else {
            proposal.rejections++;
        }

        emit ProposalVoted(proposalId, msg.sender, approve);
    }

    /**
     * @notice Execute an approved proposal
     * @dev Anyone can execute a proposal with sufficient approvals
     * @param proposalId Proposal identifier
     * @custom:security Requires sufficient approvals and validation
     */
    function executeProposal(uint256 proposalId) external nonReentrant whenNotPaused {
        TreasuryProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0) revert TreasuryVault__ProposalNotReady();
        if (proposal.isExecuted) revert TreasuryVault__ProposalNotReady();
        if (proposal.approvals < requiredApprovals) revert TreasuryVault__ProposalNotReady();
        
        // Check execution delay
        if (block.timestamp > proposal.createdAt + maxExecutionDelay) {
            revert TreasuryVault__ProposalNotReady();
        }

        // Check daily transfer limits
        uint256 today = block.timestamp / 1 days;
        if (dailyTransferAmounts[today] + proposal.amount > MAX_DAILY_TRANSFER) {
            revert TreasuryVault__ExceedsTransferLimit();
        }

        proposal.isExecuted = true;
        proposal.executedAt = block.timestamp;
        dailyTransferAmounts[today] += proposal.amount;

        // Execute transfer
        if (proposal.token == address(0)) {
            // ETH transfer
            (bool success, ) = proposal.target.call{value: proposal.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(proposal.token).safeTransfer(proposal.target, proposal.amount);
        }

        emit ProposalExecuted(proposalId, msg.sender, proposal.target, proposal.amount);
    }

    // ============ DISTRIBUTION FUNCTIONS ============

    /**
     * @notice Update distribution rules
     * @dev Only treasury admin can update distribution rules
     * @param stakingPercentage Percentage for staking rewards (basis points)
     * @param treasuryPercentage Percentage kept in treasury (basis points)
     * @param operationsPercentage Percentage for operations (basis points)
     * @param developmentPercentage Percentage for development (basis points)
     * @param stakingContract Address of staking contract
     * @param operationsWallet Address of operations wallet
     * @param developmentWallet Address of development wallet
     * @custom:security Only TREASURY_ADMIN_ROLE can update rules
     */
    function updateDistributionRules(
        uint256 stakingPercentage,
        uint256 treasuryPercentage,
        uint256 operationsPercentage,
        uint256 developmentPercentage,
        address stakingContract,
        address operationsWallet,
        address developmentWallet
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        uint256 totalPercentage = stakingPercentage + treasuryPercentage + 
                                  operationsPercentage + developmentPercentage;
        
        if (totalPercentage != BASIS_POINTS) {
            revert TreasuryVault__InvalidDistributionPercentages();
        }

        distributionRules = DistributionRules({
            stakingPercentage: stakingPercentage,
            treasuryPercentage: treasuryPercentage,
            operationsPercentage: operationsPercentage,
            developmentPercentage: developmentPercentage,
            stakingContract: stakingContract,
            operationsWallet: operationsWallet,
            developmentWallet: developmentWallet,
            isActive: true
        });

        emit DistributionRulesUpdated(
            stakingPercentage,
            treasuryPercentage,
            operationsPercentage,
            developmentPercentage
        );
    }

    /**
     * @notice Distribute funds according to rules
     * @dev Can be called by revenue router or fund managers
     * @param token Token address to distribute
     * @param amount Amount to distribute
     * @custom:security Only authorized roles can trigger distribution
     */
    function distributeFunds(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(
            msg.sender == revenueRouter || 
            hasRole(FUND_MANAGER_ROLE, msg.sender),
            "Unauthorized"
        );

        if (amount == 0) revert TreasuryVault__ZeroAmount();
        if (!distributionRules.isActive) return;

        uint256 balance = token == address(0) ? 
            address(this).balance : 
            IERC20(token).balanceOf(address(this));
            
        if (amount > balance) revert TreasuryVault__InsufficientBalance();

        // Calculate distribution amounts
        uint256 stakingAmount = (amount * distributionRules.stakingPercentage) / BASIS_POINTS;
        uint256 operationsAmount = (amount * distributionRules.operationsPercentage) / BASIS_POINTS;
        uint256 developmentAmount = (amount * distributionRules.developmentPercentage) / BASIS_POINTS;
        // Treasury amount is what remains

        // Transfer to staking contract
        if (stakingAmount > 0 && distributionRules.stakingContract != address(0)) {
            _transferFunds(token, distributionRules.stakingContract, stakingAmount);
        }

        // Transfer to operations wallet
        if (operationsAmount > 0 && distributionRules.operationsWallet != address(0)) {
            _transferFunds(token, distributionRules.operationsWallet, operationsAmount);
        }

        // Transfer to development wallet
        if (developmentAmount > 0 && distributionRules.developmentWallet != address(0)) {
            _transferFunds(token, distributionRules.developmentWallet, developmentAmount);
        }
    }

    // ============ EMERGENCY FUNCTIONS ============

    /**
     * @notice Emergency withdrawal function
     * @dev Only emergency role can perform emergency withdrawals
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     * @param destination Destination address
     * @custom:security Only EMERGENCY_ROLE in crisis situations
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address destination
    ) external onlyRole(EMERGENCY_ROLE) nonReentrant {
        if (destination == address(0)) revert TreasuryVault__ZeroAddress();
        if (amount == 0) revert TreasuryVault__ZeroAmount();

        _transferFunds(token, destination, amount);

        emit EmergencyWithdrawal(token, amount, destination, msg.sender);
    }

    /**
     * @notice Pause or unpause treasury operations
     * @dev Only treasury admin can pause/unpause
     * @param _paused New pause status
     * @custom:security Only TREASURY_ADMIN_ROLE can pause
     */
    function setPaused(bool _paused) external onlyRole(TREASURY_ADMIN_ROLE) {
        paused = _paused;
    }

    /**
     * @notice Add or remove address from blacklist
     * @dev Only treasury admin can manage blacklist
     * @param target Address to blacklist/whitelist
     * @param isBlacklisted New blacklist status
     * @custom:security Only TREASURY_ADMIN_ROLE can manage blacklist
     */
    function setBlacklistStatus(address target, bool isBlacklisted) 
        external 
        onlyRole(TREASURY_ADMIN_ROLE) 
    {
        blacklistedAddresses[target] = isBlacklisted;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update treasury configuration
     * @dev Only treasury admin can update configuration
     * @param _requiredApprovals New required approvals count
     * @param _maxExecutionDelay New maximum execution delay
     * @param _revenueRouter New revenue router address
     * @custom:security Only TREASURY_ADMIN_ROLE can update config
     */
    function updateTreasuryConfig(
        uint256 _requiredApprovals,
        uint256 _maxExecutionDelay,
        address _revenueRouter
    ) external onlyRole(TREASURY_ADMIN_ROLE) {
        if (_requiredApprovals == 0) revert TreasuryVault__ZeroAmount();

        requiredApprovals = _requiredApprovals;
        maxExecutionDelay = _maxExecutionDelay;
        revenueRouter = _revenueRouter;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get treasury balance for a token
     * @dev Returns current balance of treasury
     * @param token Token address (address(0) for ETH)
     * @return Current balance
     */
    function getTreasuryBalance(address token) external view returns (uint256) {
        return token == address(0) ? 
            address(this).balance : 
            IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get proposal details
     * @dev Returns complete proposal information
     * @param proposalId Proposal identifier
     * @return Complete proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (TreasuryProposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Check if proposal can be executed
     * @dev Checks all execution requirements
     * @param proposalId Proposal identifier
     * @return True if proposal can be executed
     */
    function canExecuteProposal(uint256 proposalId) external view returns (bool) {
        TreasuryProposal storage proposal = proposals[proposalId];
        
        if (proposal.id == 0 || proposal.isExecuted) return false;
        if (proposal.approvals < requiredApprovals) return false;
        if (block.timestamp > proposal.createdAt + maxExecutionDelay) return false;
        
        uint256 today = block.timestamp / 1 days;
        if (dailyTransferAmounts[today] + proposal.amount > MAX_DAILY_TRANSFER) return false;
        
        return true;
    }

    /**
     * @notice Get daily transfer usage
     * @dev Returns current daily transfer amount
     * @return used Current daily transfer amount
     * @return limit Maximum daily transfer limit
     */
    function getDailyTransferUsage() external view returns (uint256 used, uint256 limit) {
        uint256 today = block.timestamp / 1 days;
        return (dailyTransferAmounts[today], MAX_DAILY_TRANSFER);
    }

    // ============ RECEIVE FUNCTIONS ============

    /**
     * @notice Receive ETH deposits
     * @dev Automatically handles ETH deposits
     */
    receive() external payable {
        emit FundsReceived(msg.sender, address(0), msg.value);
    }

    /**
     * @notice Handle token deposits
     * @dev Called when tokens are transferred to treasury
     * @param token Token address
     * @param amount Amount received
     */
    function onTokenReceived(address token, uint256 amount) external {
        emit FundsReceived(msg.sender, token, amount);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @notice Internal function to transfer funds
     * @dev Handles both ETH and ERC20 transfers
     * @param token Token address (address(0) for ETH)
     * @param to Destination address
     * @param amount Amount to transfer
     */
    function _transferFunds(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            // ETH transfer
            (bool success, ) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // ============ UPGRADE AUTHORIZATION ============

    /**
     * @notice Authorize contract upgrade
     * @dev Only treasury admin can authorize upgrades
     * @param newImplementation Address of new implementation
     * @custom:security Only TREASURY_ADMIN_ROLE can authorize upgrades
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(TREASURY_ADMIN_ROLE)
    {}
}
