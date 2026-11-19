// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ILoanRegistry
 * @notice External surface of the FVC Loan Registry v1, as frozen in contracts/LOAN_REGISTRY.md.
 * @dev Interface only. Role checks and pause follow OpenZeppelin 4.9 AccessControl and Pausable,
 *      whose functions (hasRole, grantRole, revokeRole, paused) are inherited by the contract.
 */
interface ILoanRegistry {
    enum Status {
        Active,
        Repaid,
        Defaulted,
        WrittenOff
    }

    // ---------------------------------------------------------------- errors

    error LoanRegistry__ZeroAddress();
    error LoanRegistry__ZeroAmount();
    error LoanRegistry__ZeroHash();
    error LoanRegistry__ZeroRef();
    error LoanRegistry__RefAlreadyUsed();
    error LoanRegistry__LoanNotFound();
    error LoanRegistry__InvalidStatus(Status current);
    error LoanRegistry__DrawingClosed();
    error LoanRegistry__FacilityExceeded();
    error LoanRegistry__MaxFacilityExceeded();
    error LoanRegistry__OwedExceeded();
    error LoanRegistry__CollateralExceeded();
    error LoanRegistry__OutstandingExceeded();
    error LoanRegistry__ForwardExceeded();
    error LoanRegistry__TokenNotAllowed();
    error LoanRegistry__TokenUnknown();
    error LoanRegistry__InvalidRateBand();
    error LoanRegistry__RateOutOfBand();
    error LoanRegistry__BalanceMismatch();
    error LoanRegistry__DestinationNotApproved();
    error LoanRegistry__DestinationAlreadyApproved();
    error LoanRegistry__CannotRemoveSafe();
    error LoanRegistry__PayoutLimitExceeded();
    error LoanRegistry__DailyLimitExceeded();
    error LoanRegistry__InvalidLimits();
    error LoanRegistry__NotALowering();
    error LoanRegistry__NoSurplus();

    // ---------------------------------------------------------------- events

    event LoanCreated(uint256 indexed loanId, bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp);
    event TrancheDisbursed(
        uint256 indexed loanId,
        uint256 gbpAmount,
        address indexed token,
        uint256 tokenAmount,
        bytes32 indexed payoutRef,
        address to
    );
    event FacilityClosed(uint256 indexed loanId, uint256 disbursedGbp);
    event RepaymentRecorded(
        uint256 indexed loanId,
        uint256 gbpAmount,
        address indexed token,
        uint256 tokenAmount,
        bytes32 indexed settlementRef
    );
    event LoanRepaid(uint256 indexed loanId, uint256 repaidGbp);
    event LoanStatusChanged(uint256 indexed loanId, Status from, Status to);
    event CollateralDeposited(
        uint256 indexed loanId,
        address indexed token,
        uint256 tokenAmount,
        uint256 gbpAmount,
        bytes32 indexed ref
    );
    event CollateralClaimed(
        uint256 indexed loanId,
        address indexed token,
        uint256 tokenAmount,
        uint256 gbpAmount,
        bytes32 indexed ref
    );
    event CollateralReleased(uint256 indexed loanId, address indexed token, uint256 tokenAmount, address to);
    event Forwarded(address indexed token, uint256 amount, address indexed to);
    event DestinationAdded(address indexed to);
    event DestinationRemoved(address indexed to);
    event TokenAllowed(
        address indexed token,
        uint8 decimals,
        uint32 minRateBps,
        uint32 maxRateBps,
        uint256 maxPayout,
        uint256 dailyLimit
    );
    event TokenDisallowed(address indexed token);
    event RateBandSet(address indexed token, uint32 minRateBps, uint32 maxRateBps);
    event TokenLimitsSet(address indexed token, uint256 maxPayout, uint256 dailyLimit);
    event MaxFacilitySet(uint256 maxFacilityGbp);
    event SurplusRecovered(address indexed token, uint256 amount);

    // ---------------------------------------------------------------- roles

    function ORIGINATOR_ROLE() external view returns (bytes32);
    function RECORDER_ROLE() external view returns (bytes32);
    function RISK_ROLE() external view returns (bytes32);
    function DISTRIBUTOR_ROLE() external view returns (bytes32);
    function GUARDIAN_ROLE() external view returns (bytes32);

    // ---------------------------------------------------------------- originator

    function createLoan(bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp)
        external
        returns (uint256 loanId);

    function recordDisbursement(
        uint256 loanId,
        uint256 gbpAmount,
        address token,
        uint256 tokenAmount,
        bytes32 payoutRef,
        address to
    ) external;

    function closeFacility(uint256 loanId) external;

    // ---------------------------------------------------------------- recorder

    function recordRepayment(
        uint256 loanId,
        uint256 gbpAmount,
        address token,
        uint256 tokenAmount,
        bytes32 settlementRef
    ) external;

    function depositCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)
        external;

    // ---------------------------------------------------------------- risk

    function markDefault(uint256 loanId) external;
    function cure(uint256 loanId) external;
    function writeOff(uint256 loanId) external;

    function claimCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)
        external;

    function releaseCollateral(uint256 loanId, address token, uint256 tokenAmount, address to) external;

    // ---------------------------------------------------------------- distributor

    function forward(address token, uint256 amount, address to) external;

    // ---------------------------------------------------------------- guardian (reduce only)

    function pause() external;
    function removeDestination(address to) external;
    function disallowToken(address token) external;
    function lowerTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit) external;
    function lowerMaxFacility(uint256 newMax) external;

    // ---------------------------------------------------------------- admin (timelock)

    function unpause() external;
    function addDestination(address to) external;

    function allowToken(
        address token,
        uint32 minRateBps,
        uint32 maxRateBps,
        uint256 maxPayout,
        uint256 dailyLimit
    ) external;

    function setRateBand(address token, uint32 minRateBps, uint32 maxRateBps) external;
    function setTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit) external;
    function setMaxFacility(uint256 newMax) external;
    function recoverSurplus(address token) external;

    // ---------------------------------------------------------------- views

    function safe() external view returns (address);
    function maxFacilityGbp() external view returns (uint256);
    function loanCount() external view returns (uint256);

    function loans(uint256 loanId)
        external
        view
        returns (
            bytes32 agreementHash,
            bytes32 smeRef,
            uint256 facilityGbp,
            uint256 feeGbp,
            uint256 disbursedGbp,
            uint256 repaidGbp,
            uint64 createdAt,
            Status status,
            bool drawingClosed
        );

    function tokenConfig(address token)
        external
        view
        returns (
            bool allowed,
            bool known,
            uint8 decimals,
            uint32 minRateBps,
            uint32 maxRateBps,
            uint256 maxPayout,
            uint256 dailyLimit
        );

    function approvedDestination(address to) external view returns (bool);
    function refUsed(bytes32 ref) external view returns (bool);
    function loanReceived(uint256 loanId, address token) external view returns (uint256);
    function collateralHeld(uint256 loanId, address token) external view returns (uint256);
    function totalReceived(address token) external view returns (uint256);
    function totalForwarded(address token) external view returns (uint256);
    function totalCollateralHeld(address token) external view returns (uint256);
    function totalRepaidGbp() external view returns (uint256);
    function outflowDay(address token) external view returns (uint256);

    function owedGbp(uint256 loanId) external view returns (uint256);
    function outstandingGbp(uint256 loanId) external view returns (uint256);
    function outflowUsedToday(address token) external view returns (uint256);
    function surplus(address token) external view returns (uint256);
}
