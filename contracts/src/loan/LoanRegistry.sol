// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./ILoanRegistry.sol";

/**
 * @title LoanRegistry
 * @notice On-chain ledger of FVC's GBP loans to UK SMEs: tranches out, repayments and collateral in,
 *         repayments forwarded to the Safe for Staking. Specification: contracts/LOAN_REGISTRY.md.
 * @dev Not upgradeable. DEFAULT_ADMIN_ROLE is held by a 48 hour TimelockController; every other
 *      role is held by the Safe. Every token movement goes through `_pullExact` or `_pushTo`, so
 *      each control lives in one place.
 */
contract LoanRegistry is ILoanRegistry, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ORIGINATOR_ROLE = keccak256("ORIGINATOR_ROLE");
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    bytes32 public constant RISK_ROLE = keccak256("RISK_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    /// @dev 10_000 bps times 100 pence, the scale of the cross-multiplied rate band (section 5.1).
    uint256 private constant RATE_SCALE = 1e6;
    uint256 private constant BPS = 10_000;
    /// @dev The fee may be at most half the facility, a 1.5 times repayment cap (decided 19 Nov).
    uint256 private constant DEFAULT_MAX_FEE_BPS = 5_000;

    struct Loan {
        bytes32 agreementHash;
        bytes32 smeRef;
        uint256 facilityGbp;
        uint256 feeGbp;
        uint256 disbursedGbp;
        uint256 repaidGbp;
        uint64 createdAt;
        Status status;
        bool drawingClosed;
    }

    struct TokenConfig {
        bool allowed;
        bool known;
        uint8 decimals;
        uint32 minRateBps;
        uint32 maxRateBps;
        uint256 maxPayout;
        uint256 dailyLimit;
    }

    address public immutable safe;
    uint256 public maxFacilityGbp;
    uint256 public maxFeeBps;
    uint256 public loanCount;

    mapping(uint256 => Loan) public loans;
    mapping(address => TokenConfig) public tokenConfig;
    mapping(address => bool) public approvedDestination;
    mapping(address => uint256) public minTranche;
    mapping(bytes32 => bool) public refUsed;

    mapping(uint256 => mapping(address => uint256)) public loanReceived;
    mapping(uint256 => mapping(address => uint256)) public collateralHeld;
    mapping(address => uint256) public totalReceived;
    mapping(address => uint256) public totalForwarded;
    mapping(address => uint256) public totalCollateralHeld;
    uint256 public totalRepaidGbp;

    mapping(address => uint256) public outflowDay;
    mapping(address => uint256) internal _outflowUsed;

    constructor(address timelock, address safe_, uint256 maxFacilityGbp_) {
        if (timelock == address(0) || safe_ == address(0)) revert LoanRegistry__ZeroAddress();
        if (maxFacilityGbp_ == 0) revert LoanRegistry__ZeroAmount();

        safe = safe_;
        maxFacilityGbp = maxFacilityGbp_;
        maxFeeBps = DEFAULT_MAX_FEE_BPS;
        approvedDestination[safe_] = true;

        _grantRole(DEFAULT_ADMIN_ROLE, timelock);
        _grantRole(ORIGINATOR_ROLE, safe_);
        _grantRole(RECORDER_ROLE, safe_);
        _grantRole(RISK_ROLE, safe_);
        _grantRole(DISTRIBUTOR_ROLE, safe_);
        _grantRole(GUARDIAN_ROLE, safe_);
    }

    // ---------------------------------------------------------------- originator

    function createLoan(bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp)
        external
        onlyRole(ORIGINATOR_ROLE)
        whenNotPaused
        returns (uint256 loanId)
    {
        if (agreementHash == bytes32(0) || smeRef == bytes32(0)) revert LoanRegistry__ZeroHash();
        if (facilityGbp == 0) revert LoanRegistry__ZeroAmount();
        if (facilityGbp > maxFacilityGbp) revert LoanRegistry__MaxFacilityExceeded();
        if (feeGbp * BPS > maxFeeBps * facilityGbp) revert LoanRegistry__FeeExceeded();

        loanId = ++loanCount;
        Loan storage loan = loans[loanId];
        loan.agreementHash = agreementHash;
        loan.smeRef = smeRef;
        loan.facilityGbp = facilityGbp;
        loan.feeGbp = feeGbp;
        loan.createdAt = uint64(block.timestamp);
        emit LoanCreated(loanId, agreementHash, smeRef, facilityGbp, feeGbp);
    }

    /// @dev Pulls the tranche from the Safe and pushes it to the destination in one call, so the
    ///      registry never holds disbursement funds. A tranche to the Safe would record a payout the
    ///      business never received, so the Safe is not a valid destination here (decided 19 Nov).
    function recordDisbursement(
        uint256 loanId,
        uint256 gbpAmount,
        address token,
        uint256 tokenAmount,
        bytes32 payoutRef,
        address to
    ) external nonReentrant onlyRole(ORIGINATOR_ROLE) whenNotPaused {
        Loan storage loan = _activeLoan(loanId);
        if (loan.drawingClosed) revert LoanRegistry__DrawingClosed();
        if (!tokenConfig[token].allowed) revert LoanRegistry__TokenNotAllowed();
        if (gbpAmount == 0 || tokenAmount == 0) revert LoanRegistry__ZeroAmount();
        if (tokenAmount < minTranche[token]) revert LoanRegistry__BelowMinTranche();
        _useRef(payoutRef);
        uint256 disbursed = loan.disbursedGbp + gbpAmount;
        if (disbursed > loan.facilityGbp) revert LoanRegistry__FacilityExceeded();
        _checkRate(token, gbpAmount, tokenAmount);
        if (to == safe) revert LoanRegistry__DestinationNotApproved();

        loan.disbursedGbp = disbursed;
        bool closes = disbursed == loan.facilityGbp;
        if (closes) loan.drawingClosed = true;

        emit TrancheDisbursed(loanId, gbpAmount, token, tokenAmount, payoutRef, to);
        if (closes) emit FacilityClosed(loanId, disbursed);

        _pullExact(token, tokenAmount);
        _pushTo(token, tokenAmount, to);
    }

    function closeFacility(uint256 loanId) external onlyRole(ORIGINATOR_ROLE) whenNotPaused {
        Loan storage loan = _activeLoan(loanId);
        if (loan.drawingClosed) revert LoanRegistry__DrawingClosed();
        loan.drawingClosed = true;
        emit FacilityClosed(loanId, loan.disbursedGbp);
        _settleIfRepaid(loanId);
    }

    // ---------------------------------------------------------------- recorder

    /// @dev `gbpAmount` is the pound value of the stablecoin that arrived, not what the business
    ///      paid before conversion costs (decided 19 Nov, to confirm with the partner).
    function recordRepayment(
        uint256 loanId,
        uint256 gbpAmount,
        address token,
        uint256 tokenAmount,
        bytes32 settlementRef
    ) external nonReentrant onlyRole(RECORDER_ROLE) whenNotPaused {
        Loan storage loan = _existingLoan(loanId);
        if (loan.status != Status.Active && loan.status != Status.Defaulted) {
            revert LoanRegistry__InvalidStatus(loan.status);
        }
        if (loan.disbursedGbp == 0) revert LoanRegistry__NothingDisbursed();
        if (!tokenConfig[token].allowed) revert LoanRegistry__TokenNotAllowed();
        if (gbpAmount == 0 || tokenAmount == 0) revert LoanRegistry__ZeroAmount();
        _useRef(settlementRef);
        uint256 repaid = loan.repaidGbp + gbpAmount;
        if (repaid > loan.disbursedGbp + loan.feeGbp) revert LoanRegistry__OwedExceeded();
        _checkRate(token, gbpAmount, tokenAmount);

        loan.repaidGbp = repaid;
        loanReceived[loanId][token] += tokenAmount;
        totalReceived[token] += tokenAmount;
        totalRepaidGbp += gbpAmount;
        emit RepaymentRecorded(loanId, gbpAmount, token, tokenAmount, settlementRef);
        _settleIfRepaid(loanId);

        _pullExact(token, tokenAmount);
    }

    function depositCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)
        external
        nonReentrant
        onlyRole(RECORDER_ROLE)
        whenNotPaused
    {
        _activeLoan(loanId);
        if (!tokenConfig[token].allowed) revert LoanRegistry__TokenNotAllowed();
        if (tokenAmount == 0 || gbpAmount == 0) revert LoanRegistry__ZeroAmount();
        _useRef(ref);
        _checkRate(token, gbpAmount, tokenAmount);

        collateralHeld[loanId][token] += tokenAmount;
        totalCollateralHeld[token] += tokenAmount;
        emit CollateralDeposited(loanId, token, tokenAmount, gbpAmount, ref);

        _pullExact(token, tokenAmount);
    }

    // ---------------------------------------------------------------- risk

    function markDefault(uint256 loanId) external onlyRole(RISK_ROLE) whenNotPaused {
        _transition(loanId, Status.Active, Status.Defaulted);
    }

    function cure(uint256 loanId) external onlyRole(RISK_ROLE) whenNotPaused {
        _transition(loanId, Status.Defaulted, Status.Active);
    }

    function writeOff(uint256 loanId) external onlyRole(RISK_ROLE) whenNotPaused {
        _transition(loanId, Status.Defaulted, Status.WrittenOff);
    }

    /// @dev Moves collateral the registry already holds into repayment accounting; no tokens move.
    ///      Works for a token disallowed since the deposit (`known`), so collateral is never stuck.
    function claimCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)
        external
        onlyRole(RISK_ROLE)
        whenNotPaused
    {
        Loan storage loan = _existingLoan(loanId);
        if (loan.status != Status.Defaulted) revert LoanRegistry__InvalidStatus(loan.status);
        if (loan.disbursedGbp == 0) revert LoanRegistry__NothingDisbursed();
        if (!tokenConfig[token].known) revert LoanRegistry__TokenUnknown();
        if (tokenAmount == 0 || gbpAmount == 0) revert LoanRegistry__ZeroAmount();
        uint256 held = collateralHeld[loanId][token];
        if (tokenAmount > held) revert LoanRegistry__CollateralExceeded();
        _useRef(ref);
        if (gbpAmount > outstandingGbp(loanId)) revert LoanRegistry__OutstandingExceeded();
        _checkRate(token, gbpAmount, tokenAmount);

        collateralHeld[loanId][token] = held - tokenAmount;
        totalCollateralHeld[token] -= tokenAmount;
        loanReceived[loanId][token] += tokenAmount;
        totalReceived[token] += tokenAmount;
        loan.repaidGbp += gbpAmount;
        totalRepaidGbp += gbpAmount;
        emit CollateralClaimed(loanId, token, tokenAmount, gbpAmount, ref);

        _settleIfRepaid(loanId);
    }

    function releaseCollateral(uint256 loanId, address token, uint256 tokenAmount, address to)
        external
        nonReentrant
        onlyRole(RISK_ROLE)
        whenNotPaused
    {
        Loan storage loan = _existingLoan(loanId);
        if (loan.status != Status.Repaid && loan.status != Status.WrittenOff) {
            revert LoanRegistry__InvalidStatus(loan.status);
        }
        if (tokenAmount == 0) revert LoanRegistry__ZeroAmount();
        uint256 held = collateralHeld[loanId][token];
        if (tokenAmount > held) revert LoanRegistry__CollateralExceeded();

        collateralHeld[loanId][token] = held - tokenAmount;
        totalCollateralHeld[token] -= tokenAmount;
        emit CollateralReleased(loanId, token, tokenAmount, to);

        _pushTo(token, tokenAmount, to);
    }

    // ---------------------------------------------------------------- distributor

    /// @dev Bounded by repayments received minus forwarded, which excludes collateral by
    ///      construction (invariants 8 and C2).
    function forward(address token, uint256 amount, address to)
        external
        nonReentrant
        onlyRole(DISTRIBUTOR_ROLE)
        whenNotPaused
    {
        if (amount == 0) revert LoanRegistry__ZeroAmount();
        uint256 forwarded = totalForwarded[token] + amount;
        if (forwarded > totalReceived[token]) revert LoanRegistry__ForwardExceeded();

        totalForwarded[token] = forwarded;
        emit Forwarded(token, amount, to);

        _pushTo(token, amount, to);
    }

    // ---------------------------------------------------------------- guardian (reduce only, work while paused)

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function removeDestination(address to) external onlyRole(GUARDIAN_ROLE) {
        if (to == safe) revert LoanRegistry__CannotRemoveSafe();
        if (!approvedDestination[to]) revert LoanRegistry__DestinationNotApproved();
        approvedDestination[to] = false;
        emit DestinationRemoved(to);
    }

    function disallowToken(address token) external onlyRole(GUARDIAN_ROLE) {
        TokenConfig storage config = tokenConfig[token];
        if (!config.allowed) revert LoanRegistry__TokenNotAllowed();
        config.allowed = false;
        emit TokenDisallowed(token);
    }

    function lowerTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit) external onlyRole(GUARDIAN_ROLE) {
        TokenConfig storage config = tokenConfig[token];
        if (!config.known) revert LoanRegistry__TokenUnknown();
        if (maxPayout > config.maxPayout || dailyLimit > config.dailyLimit) revert LoanRegistry__NotALowering();
        config.maxPayout = maxPayout;
        config.dailyLimit = dailyLimit;
        emit TokenLimitsSet(token, maxPayout, dailyLimit);
    }

    function lowerMaxFacility(uint256 newMax) external onlyRole(GUARDIAN_ROLE) {
        if (newMax > maxFacilityGbp) revert LoanRegistry__NotALowering();
        maxFacilityGbp = newMax;
        emit MaxFacilitySet(newMax);
    }

    function lowerMaxFeeBps(uint256 newBps) external onlyRole(GUARDIAN_ROLE) {
        if (newBps > maxFeeBps) revert LoanRegistry__NotALowering();
        maxFeeBps = newBps;
        emit MaxFeeSet(newBps);
    }

    // ---------------------------------------------------------------- admin (timelock, work while paused)

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function addDestination(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert LoanRegistry__ZeroAddress();
        if (approvedDestination[to]) revert LoanRegistry__DestinationAlreadyApproved();
        approvedDestination[to] = true;
        emit DestinationAdded(to);
    }

    function allowToken(
        address token,
        uint32 minRateBps,
        uint32 maxRateBps,
        uint256 maxPayout,
        uint256 dailyLimit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert LoanRegistry__ZeroAddress();
        _checkBand(minRateBps, maxRateBps);
        if (maxPayout > dailyLimit) revert LoanRegistry__InvalidLimits();

        TokenConfig storage config = tokenConfig[token];
        if (!config.known) {
            config.known = true;
            config.decimals = IERC20Metadata(token).decimals();
        }
        config.allowed = true;
        config.minRateBps = minRateBps;
        config.maxRateBps = maxRateBps;
        config.maxPayout = maxPayout;
        config.dailyLimit = dailyLimit;
        emit TokenAllowed(token, config.decimals, minRateBps, maxRateBps, maxPayout, dailyLimit);
    }

    function setRateBand(address token, uint32 minRateBps, uint32 maxRateBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenConfig storage config = tokenConfig[token];
        if (!config.known) revert LoanRegistry__TokenUnknown();
        _checkBand(minRateBps, maxRateBps);
        config.minRateBps = minRateBps;
        config.maxRateBps = maxRateBps;
        emit RateBandSet(token, minRateBps, maxRateBps);
    }

    function setTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenConfig storage config = tokenConfig[token];
        if (!config.known) revert LoanRegistry__TokenUnknown();
        if (maxPayout > dailyLimit || maxPayout < minTranche[token]) revert LoanRegistry__InvalidLimits();
        config.maxPayout = maxPayout;
        config.dailyLimit = dailyLimit;
        emit TokenLimitsSet(token, maxPayout, dailyLimit);
    }

    function setMaxFacility(uint256 newMax) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMax == 0) revert LoanRegistry__ZeroAmount();
        maxFacilityGbp = newMax;
        emit MaxFacilitySet(newMax);
    }

    /// @dev Matches the partner's smallest payout, so a tranche it would reject never leaves the Safe.
    function setMinTranche(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenConfig storage config = tokenConfig[token];
        if (!config.known) revert LoanRegistry__TokenUnknown();
        if (amount > config.maxPayout) revert LoanRegistry__InvalidLimits();
        minTranche[token] = amount;
        emit MinTrancheSet(token, amount);
    }

    function setMaxFeeBps(uint256 newBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newBps > BPS) revert LoanRegistry__InvalidLimits();
        maxFeeBps = newBps;
        emit MaxFeeSet(newBps);
    }

    /// @dev Always pays the Safe and skips the outflow limits: it sits behind the 48 hour delay and
    ///      can only move tokens the registry owes nobody (S10).
    function recoverSurplus(address token) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = surplus(token);
        // slither-disable-next-line incorrect-equality
        if (amount == 0) revert LoanRegistry__NoSurplus();
        IERC20(token).safeTransfer(safe, amount);
        emit SurplusRecovered(token, amount);
    }

    // ---------------------------------------------------------------- views (never revert)

    function owedGbp(uint256 loanId) public view returns (uint256) {
        Loan storage loan = loans[loanId];
        return loan.disbursedGbp + loan.feeGbp;
    }

    function outstandingGbp(uint256 loanId) public view returns (uint256) {
        uint256 owed = owedGbp(loanId);
        uint256 repaid = loans[loanId].repaidGbp;
        return owed > repaid ? owed - repaid : 0;
    }

    function outflowUsedToday(address token) public view returns (uint256) {
        // slither-disable-next-line incorrect-equality
        return outflowDay[token] == _today() ? _outflowUsed[token] : 0;
    }

    function surplus(address token) public view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 received = totalReceived[token];
        uint256 forwarded = totalForwarded[token];
        uint256 held = (received > forwarded ? received - forwarded : 0) + totalCollateralHeld[token];
        return balance > held ? balance - held : 0;
    }

    // ---------------------------------------------------------------- internal

    /// @dev Pulls from `msg.sender` only (S6) and requires the measured increase to equal `amount`,
    ///      which rejects fee-on-transfer tokens (S5). Callers must be `nonReentrant`, or a token
    ///      callback could move the balance between the two reads.
    function _pullExact(address token, uint256 amount) internal {
        assert(_reentrancyGuardEntered());
        uint256 before = IERC20(token).balanceOf(address(this));
        // slither-disable-next-line reentrancy-balance
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        if (afterBalance < before || afterBalance - before != amount) revert LoanRegistry__BalanceMismatch();
    }

    /// @dev The only outbound path besides `recoverSurplus`: destination (S1), per-transfer and UTC
    ///      daily limits (S2, S3) are checked and counted here before the transfer.
    function _pushTo(address token, uint256 amount, address to) internal {
        assert(_reentrancyGuardEntered());
        if (!approvedDestination[to]) revert LoanRegistry__DestinationNotApproved();
        TokenConfig storage config = tokenConfig[token];
        if (amount > config.maxPayout) revert LoanRegistry__PayoutLimitExceeded();

        uint256 today = _today();
        // slither-disable-next-line incorrect-equality
        uint256 used = outflowDay[token] == today ? _outflowUsed[token] : 0;
        if (used + amount > config.dailyLimit) revert LoanRegistry__DailyLimitExceeded();
        outflowDay[token] = today;
        _outflowUsed[token] = used + amount;

        IERC20(token).safeTransfer(to, amount);
    }

    /// @dev Cross-multiplied so nothing is divided or rounded; uses the decimals stored on first
    ///      `allowToken`, never a fresh read (S11).
    function _checkRate(address token, uint256 gbpAmount, uint256 tokenAmount) internal view {
        TokenConfig storage config = tokenConfig[token];
        uint256 scaledGbp = gbpAmount * 10 ** config.decimals;
        uint256 scaledToken = tokenAmount * RATE_SCALE;
        if (scaledToken < config.minRateBps * scaledGbp || scaledToken > config.maxRateBps * scaledGbp) {
            revert LoanRegistry__RateOutOfBand();
        }
    }

    /// @dev Payout, settlement and collateral references share one set, so one partner message
    ///      can never be recorded under two functions.
    function _useRef(bytes32 ref) internal {
        if (ref == bytes32(0)) revert LoanRegistry__ZeroRef();
        if (refUsed[ref]) revert LoanRegistry__RefAlreadyUsed();
        refUsed[ref] = true;
    }

    function _existingLoan(uint256 loanId) private view returns (Loan storage loan) {
        if (loanId == 0 || loanId > loanCount) revert LoanRegistry__LoanNotFound();
        loan = loans[loanId];
    }

    function _activeLoan(uint256 loanId) private view returns (Loan storage loan) {
        loan = _existingLoan(loanId);
        if (loan.status != Status.Active) revert LoanRegistry__InvalidStatus(loan.status);
    }

    /// @dev The only manual status changes (invariant 12); `Repaid` is reached only through
    ///      `_settleIfRepaid`.
    function _transition(uint256 loanId, Status from, Status to) private {
        Loan storage loan = _existingLoan(loanId);
        if (loan.status != from) revert LoanRegistry__InvalidStatus(loan.status);
        loan.status = to;
        emit LoanStatusChanged(loanId, from, to);
    }

    /// @dev Moves `Active` or `Defaulted` to `Repaid` once drawing is closed and everything owed is
    ///      repaid (invariant 14).
    function _settleIfRepaid(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        Status from = loan.status;
        if (from != Status.Active && from != Status.Defaulted) return;
        if (!loan.drawingClosed || loan.repaidGbp != loan.disbursedGbp + loan.feeGbp) return;
        loan.status = Status.Repaid;
        emit LoanStatusChanged(loanId, from, Status.Repaid);
        emit LoanRepaid(loanId, loan.repaidGbp);
    }

    function _checkBand(uint32 minRateBps, uint32 maxRateBps) private pure {
        if (minRateBps == 0 || minRateBps > maxRateBps) revert LoanRegistry__InvalidRateBand();
    }

    function _today() private view returns (uint256) {
        return block.timestamp / 1 days;
    }
}
