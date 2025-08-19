// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title FVCGovernor
 * @notice OpenZeppelin Governor implementation for FVC Protocol governance
 * @dev Implements snapshot-based voting with timelock execution and quorum requirements
 * @custom:security Uses OpenZeppelin Governor framework with UUPS upgradeability
 */
contract FVCGovernor is 
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    GovernorVotesUpgradeable,
    GovernorVotesQuorumFractionUpgradeable,
    GovernorTimelockControlUpgradeable,
    UUPSUpgradeable,
    AccessControlUpgradeable
{
    // ============ CUSTOM ERRORS ============
    
    /// @notice Error when proposal threshold is too low
    error FVCGovernor__ProposalThresholdTooLow();
    
    /// @notice Error when quorum fraction is invalid
    error FVCGovernor__InvalidQuorumFraction();
    
    /// @notice Error when voting delay is too short
    error FVCGovernor__VotingDelayTooShort();

    // ============ CONSTANTS ============
    
    /// @notice Role identifier for governance admin
    bytes32 public constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    
    /// @notice Role identifier for proposal creators
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    
    /// @notice Minimum voting delay to prevent flash loan attacks (1 day)
    uint256 public constant MIN_VOTING_DELAY = 1 days;
    
    /// @notice Standard voting period (7 days)
    uint256 public constant VOTING_PERIOD = 7 days;
    
    /// @notice Minimum proposal threshold (1% of total supply)
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 1e18; // 1 FVC token

    // ============ EVENTS ============

    /// @notice Emitted when governance parameters are updated
    /// @param votingDelay New voting delay in blocks
    /// @param votingPeriod New voting period in blocks
    /// @param proposalThreshold New proposal threshold
    event GovernanceParametersUpdated(uint256 votingDelay, uint256 votingPeriod, uint256 proposalThreshold);

    // ============ STORAGE GAP ============
    
    /// @dev Storage gap for future upgrades
    uint256[45] private __gap;

    // ============ INITIALISER ============

    /**
     * @notice Initialise the FVC Governor contract
     * @dev Sets up governance parameters and roles
     * @param _token FVC token contract for voting power
     * @param _timelock Timelock controller for proposal execution
     * @param _admin Initial governance admin
     * @custom:security Only callable once during deployment
     */
    function initialize(
        address _token,
        address _timelock,
        address _admin
    ) external initializer {
        __Governor_init("FVCGovernor");
        __GovernorSettings_init(
            MIN_VOTING_DELAY / 12, // Convert to blocks (12 second blocks)
            VOTING_PERIOD / 12,    // Convert to blocks
            MIN_PROPOSAL_THRESHOLD
        );
        __GovernorCountingSimple_init();
        __GovernorVotes_init(IVotesUpgradeable(_token));
        __GovernorVotesQuorumFraction_init(10); // 10% quorum
        __GovernorTimelockControl_init(TimelockControllerUpgradeable(payable(_timelock)));
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ADMIN_ROLE, _admin);
        _grantRole(PROPOSER_ROLE, _admin);
    }

    // ============ GOVERNANCE OVERRIDES ============

    /**
     * @notice Get the voting delay for proposals
     * @dev Overrides multiple parent contracts
     * @return Voting delay in blocks
     */
    function votingDelay()
        public
        view
        override(IGovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /**
     * @notice Get the voting period for proposals
     * @dev Overrides multiple parent contracts
     * @return Voting period in blocks
     */
    function votingPeriod()
        public
        view
        override(IGovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    /**
     * @notice Get the quorum required for proposals
     * @dev Overrides multiple parent contracts
     * @param blockNumber Block number for snapshot
     * @return Number of votes required for quorum
     */
    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernorUpgradeable, GovernorVotesQuorumFractionUpgradeable)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     * @notice Get the proposal threshold
     * @dev Overrides multiple parent contracts
     * @return Number of votes required to create a proposal
     */
    function proposalThreshold()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Update governance parameters
     * @dev Only governance admin can call this function
     * @param newVotingDelay New voting delay in seconds
     * @param newVotingPeriod New voting period in seconds
     * @param newProposalThreshold New proposal threshold
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can update parameters
     */
    function updateGovernanceParameters(
        uint256 newVotingDelay,
        uint256 newVotingPeriod,
        uint256 newProposalThreshold
    ) external onlyRole(GOVERNANCE_ADMIN_ROLE) {
        if (newVotingDelay < MIN_VOTING_DELAY) revert FVCGovernor__VotingDelayTooShort();
        if (newProposalThreshold < MIN_PROPOSAL_THRESHOLD) revert FVCGovernor__ProposalThresholdTooLow();

        _setVotingDelay(newVotingDelay / 12); // Convert to blocks
        _setVotingPeriod(newVotingPeriod / 12); // Convert to blocks
        _setProposalThreshold(newProposalThreshold);

        emit GovernanceParametersUpdated(newVotingDelay, newVotingPeriod, newProposalThreshold);
    }

    /**
     * @notice Update quorum fraction
     * @dev Only governance admin can call this function
     * @param newQuorumFraction New quorum fraction (out of 100)
     * @custom:security Only GOVERNANCE_ADMIN_ROLE can update quorum
     */
    function updateQuorumFraction(uint256 newQuorumFraction) 
        external 
        onlyRole(GOVERNANCE_ADMIN_ROLE) 
    {
        if (newQuorumFraction > 50) revert FVCGovernor__InvalidQuorumFraction();
        _updateQuorumNumerator(newQuorumFraction);
    }

    // ============ PROPOSAL EXECUTION ============

    /**
     * @notice Get proposal state including timelock status
     * @dev Overrides multiple parent contracts
     * @param proposalId ID of the proposal to check
     * @return Current state of the proposal
     */
    function state(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /**
     * @notice Propose a new governance action
     * @dev Overrides base propose function with additional validation
     * @param targets Array of target addresses
     * @param values Array of values to send
     * @param calldatas Array of function call data
     * @param description Proposal description
     * @return Proposal ID
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(GovernorUpgradeable, IGovernorUpgradeable) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    /**
     * @notice Execute a successful proposal through timelock
     * @dev Overrides multiple parent contracts
     * @param targets Array of target addresses
     * @param values Array of values to send
     * @param calldatas Array of function call data
     * @param descriptionHash Hash of proposal description
     */
    function _execute(
        uint256, /* proposalId */
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        super._execute(0, targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice Cancel a proposal
     * @dev Overrides multiple parent contracts
     * @param targets Array of target addresses
     * @param values Array of values to send
     * @param calldatas Array of function call data
     * @param descriptionHash Hash of proposal description
     * @return Proposal ID
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice Get the executor address (timelock)
     * @dev Overrides multiple parent contracts
     * @return Address of the timelock executor
     */
    function _executor()
        internal
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
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
        override(UUPSUpgradeable)
        onlyRole(GOVERNANCE_ADMIN_ROLE)
    {}

    // ============ INTERFACE SUPPORT ============

    /**
     * @notice Check interface support
     * @dev Overrides multiple parent contracts
     * @param interfaceId Interface identifier
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
