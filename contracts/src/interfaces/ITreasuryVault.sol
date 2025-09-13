// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITreasuryVault
 * @notice Interface for FVC treasury vault functionality
 * @dev Treasury vault interface for fund management and distribution
 */
interface ITreasuryVault {
    /**
     * @notice Treasury proposal structure
     * @dev Proposal details for fund transfers
     * @param id Unique proposal identifier
     * @param target Target address for transfer
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param description Human-readable description
     * @param createdAt Proposal creation timestamp
     * @param approvals Number of approvals received
     * @param isExecuted Whether proposal has been executed
     * @param approvers Mapping of approver addresses
     */
    struct TreasuryProposal {
        uint256 id;
        address target;
        address token;
        uint256 amount;
        string description;
        uint256 createdAt;
        uint256 approvals;
        bool isExecuted;
        mapping(address => bool) approvers;
    }

    /**
     * @notice Distribution rule structure
     * @dev Automatic fund distribution rules
     * @param stakingPercentage Percentage for staking rewards
     * @param treasuryPercentage Percentage for treasury
     * @param operationsPercentage Percentage for operations
     * @param developmentPercentage Percentage for development
     */
    struct DistributionRules {
        uint256 stakingPercentage;
        uint256 treasuryPercentage;
        uint256 operationsPercentage;
        uint256 developmentPercentage;
    }

    /**
     * @notice Create a new treasury proposal
     * @dev Only fund managers can create proposals
     * @param target Target address for fund transfer
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param description Human-readable description
     * @return proposalId Created proposal identifier
     */
    function createProposal(
        address target,
        address token,
        uint256 amount,
        string calldata description
    ) external returns (uint256 proposalId);

    /**
     * @notice Approve a treasury proposal
     * @dev Only fund managers can approve proposals
     * @param proposalId Proposal identifier to approve
     */
    function approveProposal(uint256 proposalId) external;

    /**
     * @notice Execute an approved treasury proposal
     * @dev Only fund managers can execute approved proposals
     * @param proposalId Proposal identifier to execute
     */
    function executeProposal(uint256 proposalId) external;

    /**
     * @notice Distribute funds according to distribution rules
     * @dev Automated fund distribution to different categories
     * @param token Token address to distribute
     * @param amount Total amount to distribute
     */
    function distributeFunds(address token, uint256 amount) external;

    /**
     * @notice Emergency withdrawal function
     * @dev Only emergency role can execute
     * @param token Token address
     * @param amount Amount to withdraw
     * @param destination Destination address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address destination
    ) external;

    /**
     * @notice Pause or unpause treasury operations
     * @dev Only treasury admin can pause/unpause
     * @param _paused New pause status
     */
    function setPaused(bool _paused) external;

    /**
     * @notice Get treasury balance for a token
     * @dev Returns current balance of treasury
     * @param token Token address (address(0) for ETH)
     * @return Current balance
     */
    function getTreasuryBalance(address token) external view returns (uint256);

    /**
     * @notice Get proposal details
     * @dev Returns complete proposal information
     * @param proposalId Proposal identifier
     * @return Complete proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (TreasuryProposal memory);

    /**
     * @notice Check if proposal can be executed
     * @dev Checks all execution requirements
     * @param proposalId Proposal identifier
     * @return True if proposal can be executed
     */
    function canExecuteProposal(uint256 proposalId) external view returns (bool);

    /**
     * @notice Emitted when a new proposal is created
     * @param proposalId Unique proposal identifier
     * @param target Target address for transfer
     * @param token Token address
     * @param amount Amount to transfer
     * @param creator Address that created the proposal
     */
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed target,
        address indexed token,
        uint256 amount,
        address creator
    );

    /**
     * @notice Emitted when a proposal is approved
     * @param proposalId Proposal identifier
     * @param approver Address that approved the proposal
     * @param totalApprovals Total number of approvals
     */
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 totalApprovals
    );

    /**
     * @notice Emitted when a proposal is executed
     * @param proposalId Proposal identifier
     * @param executor Address that executed the proposal
     * @param target Target address
     * @param amount Amount transferred
     */
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed executor,
        address indexed target,
        uint256 amount
    );

    /**
     * @notice Emitted when funds are distributed
     * @param token Token address
     * @param totalAmount Total amount distributed
     * @param stakingAmount Amount to staking
     * @param treasuryAmount Amount to treasury
     * @param operationsAmount Amount to operations
     * @param developmentAmount Amount to development
     */
    event FundsDistributed(
        address indexed token,
        uint256 totalAmount,
        uint256 stakingAmount,
        uint256 treasuryAmount,
        uint256 operationsAmount,
        uint256 developmentAmount
    );

    /**
     * @notice Emitted when emergency withdrawal occurs
     * @param token Token address
     * @param amount Amount withdrawn
     * @param destination Destination address
     * @param executor Address that executed withdrawal
     */
    event EmergencyWithdrawal(
        address indexed token,
        uint256 amount,
        address indexed destination,
        address indexed executor
    );
}
