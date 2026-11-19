// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LoanRegistry} from "../src/loan/LoanRegistry.sol";
import {ILoanRegistry} from "../src/loan/ILoanRegistry.sol";
import {MockStable} from "../src/mocks/MockStable.sol";

/// @dev Plays the Safe (every operating role and the guardian) and, through `admin`, the timelock.
///      Inputs are clamped to realistic ranges; a compromised Safe is modelled by `drain`, which
///      tries to move as much as it can to the partner every call.
contract LoanRegistryHandler is Test {
    LoanRegistry public immutable reg;
    MockStable[2] public tokens;

    address public immutable admin = address(0xAD);
    address public immutable partner = address(0xBEEF);
    address public immutable outsider = address(0xBAD);

    uint256 public constant MAX_FACILITY = 50_000_00;
    uint256 public constant RATE = 12_700;
    uint256 public constant MAX_PAYOUT = 32_000e6;
    uint256 public constant DAILY_LIMIT = 65_000e6;

    uint256 internal nonce;

    /// @dev Outflow per token per UTC day, counted from successful calls only.
    mapping(address => mapping(uint256 => uint256)) public ghostOutflow;
    uint256 public ghostMaxDayOutflow;
    uint256 public ghostOutsiderSuccesses;
    uint256 public ghostMovedWhilePaused;
    uint256 public ghostOutsiderBalance;

    constructor() {
        reg = new LoanRegistry(admin, address(this), MAX_FACILITY);
        tokens[0] = new MockStable("USD Coin", "USDC", 6);
        tokens[1] = new MockStable("Tether USD", "USDT", 6);
        vm.startPrank(admin);
        for (uint256 i = 0; i < 2; i++) {
            reg.allowToken(address(tokens[i]), 11_000, 15_000, MAX_PAYOUT, DAILY_LIMIT);
        }
        reg.addDestination(partner);
        vm.stopPrank();
        for (uint256 i = 0; i < 2; i++) {
            tokens[i].mint(address(this), 1e15);
            tokens[i].approve(address(reg), type(uint256).max);
        }
    }

    // ------------------------------------------------------------------ helpers

    function _token(uint256 seed) internal view returns (address) {
        return address(tokens[seed % 2]);
    }

    function _loan(uint256 seed) internal view returns (uint256) {
        uint256 count = reg.loanCount();
        return count == 0 ? 0 : 1 + (seed % count);
    }

    function _ref() internal returns (bytes32) {
        return keccak256(abi.encode("ref", nonce++));
    }

    function _countOutflow(address token, uint256 amount) internal {
        uint256 day = block.timestamp / 1 days;
        uint256 total = ghostOutflow[token][day] + amount;
        ghostOutflow[token][day] = total;
        if (total > ghostMaxDayOutflow) ghostMaxDayOutflow = total;
    }

    function _notePaused(bool wasPaused) internal {
        if (wasPaused) ghostMovedWhilePaused++;
    }

    // ------------------------------------------------------------------ Safe actions

    function createLoan(uint256 facility, uint256 feeBps) external {
        facility = bound(facility, 1, MAX_FACILITY);
        uint256 fee = (facility * bound(feeBps, 0, 5_000)) / 10_000;
        bool wasPaused = reg.paused();
        try reg.createLoan(_ref(), _ref(), facility, fee) {
            _notePaused(wasPaused);
        } catch {}
    }

    function disburse(uint256 loanSeed, uint256 pence, uint256 tokenSeed, uint256 rate) external {
        pence = bound(pence, 1, MAX_FACILITY);
        uint256 amount = pence * bound(rate, 11_000, 15_000);
        address token = _token(tokenSeed);
        bool wasPaused = reg.paused();
        try reg.recordDisbursement(_loan(loanSeed), pence, token, amount, _ref(), partner) {
            _countOutflow(token, amount);
            _notePaused(wasPaused);
        } catch {}
    }

    function repay(uint256 loanSeed, uint256 pence, uint256 tokenSeed, uint256 rate) external {
        pence = bound(pence, 1, MAX_FACILITY);
        uint256 amount = pence * bound(rate, 11_000, 15_000);
        bool wasPaused = reg.paused();
        try reg.recordRepayment(_loan(loanSeed), pence, _token(tokenSeed), amount, _ref()) {
            _notePaused(wasPaused);
        } catch {}
    }

    function deposit(uint256 loanSeed, uint256 pence, uint256 tokenSeed) external {
        pence = bound(pence, 1, MAX_FACILITY);
        bool wasPaused = reg.paused();
        try reg.depositCollateral(_loan(loanSeed), _token(tokenSeed), pence * RATE, pence, _ref()) {
            _notePaused(wasPaused);
        } catch {}
    }

    function claim(uint256 loanSeed, uint256 pence, uint256 tokenSeed) external {
        pence = bound(pence, 1, MAX_FACILITY);
        bool wasPaused = reg.paused();
        try reg.claimCollateral(_loan(loanSeed), _token(tokenSeed), pence * RATE, pence, _ref()) {
            _notePaused(wasPaused);
        } catch {}
    }

    function release(uint256 loanSeed, uint256 amount, uint256 tokenSeed, bool toSafe) external {
        uint256 id = _loan(loanSeed);
        address token = _token(tokenSeed);
        amount = bound(amount, 1, reg.collateralHeld(id, token) + 1);
        bool wasPaused = reg.paused();
        try reg.releaseCollateral(id, token, amount, toSafe ? address(this) : partner) {
            _countOutflow(token, amount);
            _notePaused(wasPaused);
        } catch {}
    }

    function forward(uint256 amount, uint256 tokenSeed) external {
        address token = _token(tokenSeed);
        amount = bound(amount, 1, reg.totalReceived(token) - reg.totalForwarded(token) + 1);
        bool wasPaused = reg.paused();
        try reg.forward(token, amount, address(this)) {
            _countOutflow(token, amount);
            _notePaused(wasPaused);
        } catch {}
    }

    function lifecycle(uint256 loanSeed, uint256 action) external {
        uint256 id = _loan(loanSeed);
        bool wasPaused = reg.paused();
        action = action % 4;
        if (action == 0) {
            try reg.closeFacility(id) {
                _notePaused(wasPaused);
            } catch {}
        } else if (action == 1) {
            try reg.markDefault(id) {
                _notePaused(wasPaused);
            } catch {}
        } else if (action == 2) {
            try reg.cure(id) {
                _notePaused(wasPaused);
            } catch {}
        } else {
            try reg.writeOff(id) {
                _notePaused(wasPaused);
            } catch {}
        }
    }

    function togglePause(bool pauseIt) external {
        if (pauseIt) {
            try reg.pause() {} catch {}
        } else {
            vm.prank(admin);
            try reg.unpause() {} catch {}
        }
    }

    function lowerLimits(uint256 tokenSeed, uint256 maxPayout, uint256 daily) external {
        address token = _token(tokenSeed);
        (,,,,, uint256 curPayout, uint256 curDaily) = reg.tokenConfig(token);
        try reg.lowerTokenLimits(token, bound(maxPayout, 0, curPayout), bound(daily, 0, curDaily)) {} catch {}
    }

    function donate(uint256 amount, uint256 tokenSeed) external {
        MockStable(_token(tokenSeed)).mint(address(reg), bound(amount, 1, 1e12));
    }

    function recover(uint256 tokenSeed) external {
        vm.prank(admin);
        try reg.recoverSurplus(_token(tokenSeed)) {} catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 2 days));
    }

    // ------------------------------------------------------------------ compromised Safe

    /// @dev Tries to pull the largest amounts it can out to the partner in one go.
    function drain(uint256 tokenSeed) external {
        address token = _token(tokenSeed);
        uint256 pence = 25_000_00;
        for (uint256 i = 0; i < 3; i++) {
            try reg.createLoan(_ref(), _ref(), MAX_FACILITY, 0) returns (uint256 id) {
                try reg.recordDisbursement(id, pence, token, pence * 12_800, _ref(), partner) {
                    _countOutflow(token, pence * 12_800);
                } catch {}
            } catch {}
        }
        uint256 spare = reg.totalReceived(token) - reg.totalForwarded(token);
        if (spare > 0) {
            try reg.forward(token, spare, partner) {
                _countOutflow(token, spare);
            } catch {}
        }
    }

    // ------------------------------------------------------------------ outsider

    function outsiderAttempt(uint256 which, uint256 loanSeed, uint256 tokenSeed) external {
        uint256 id = _loan(loanSeed);
        address token = _token(tokenSeed);
        vm.startPrank(outsider);
        bool ok;
        which = which % 8;
        if (which == 0) (ok,) = address(reg).call(abi.encodeCall(reg.createLoan, (_ref(), _ref(), 1_000_00, 0)));
        else if (which == 1) (ok,) = address(reg).call(abi.encodeCall(reg.recordDisbursement, (id, 100, token, 1_270_000, _ref(), outsider)));
        else if (which == 2) (ok,) = address(reg).call(abi.encodeCall(reg.forward, (token, 1, outsider)));
        else if (which == 3) (ok,) = address(reg).call(abi.encodeCall(reg.releaseCollateral, (id, token, 1, outsider)));
        else if (which == 4) (ok,) = address(reg).call(abi.encodeCall(reg.addDestination, (outsider)));
        else if (which == 5) (ok,) = address(reg).call(abi.encodeCall(reg.recoverSurplus, (token)));
        else if (which == 6) (ok,) = address(reg).call(abi.encodeCall(reg.unpause, ()));
        else (ok,) = address(reg).call(abi.encodeCall(reg.setTokenLimits, (token, type(uint128).max, type(uint128).max)));
        vm.stopPrank();
        if (ok) ghostOutsiderSuccesses++;
        ghostOutsiderBalance = tokens[0].balanceOf(outsider) + tokens[1].balanceOf(outsider);
    }
}

contract LoanRegistryInvariants is Test {
    LoanRegistryHandler internal handler;
    LoanRegistry internal reg;

    function setUp() public {
        vm.warp(1_763_510_400);
        handler = new LoanRegistryHandler();
        reg = handler.reg();
        targetContract(address(handler));
    }

    function _tokens() internal view returns (address[2] memory t) {
        t[0] = address(handler.tokens(0));
        t[1] = address(handler.tokens(1));
    }

    /// S10, invariants 6 to 8: the registry always holds what it owes.
    function invariant_A_solvent() public view {
        address[2] memory t = _tokens();
        for (uint256 i = 0; i < 2; i++) {
            uint256 owed = reg.totalReceived(t[i]) - reg.totalForwarded(t[i]) + reg.totalCollateralHeld(t[i]);
            assertGe(MockStable(t[i]).balanceOf(address(reg)), owed, "balance below what is owed");
            assertLe(reg.totalForwarded(t[i]), reg.totalReceived(t[i]), "forwarded more than received");
        }
    }

    /// Totals equal the sum of per-loan entries.
    function invariant_B_totalsMatchLoans() public view {
        address[2] memory t = _tokens();
        uint256 count = reg.loanCount();
        uint256 repaid;
        uint256[2] memory received;
        uint256[2] memory collateral;
        for (uint256 id = 1; id <= count; id++) {
            (,,,,, uint256 r,,,) = reg.loans(id);
            repaid += r;
            for (uint256 i = 0; i < 2; i++) {
                received[i] += reg.loanReceived(id, t[i]);
                collateral[i] += reg.collateralHeld(id, t[i]);
            }
        }
        assertEq(repaid, reg.totalRepaidGbp(), "totalRepaidGbp");
        for (uint256 i = 0; i < 2; i++) {
            assertEq(received[i], reg.totalReceived(t[i]), "totalReceived");
            assertEq(collateral[i], reg.totalCollateralHeld(t[i]), "totalCollateralHeld");
        }
    }

    /// Invariants 2, 14, 15a, S13 for every loan.
    function invariant_C_loanBounds() public view {
        uint256 count = reg.loanCount();
        for (uint256 id = 1; id <= count; id++) {
            (,, uint256 facility, uint256 fee, uint256 disbursed, uint256 repaid,, ILoanRegistry.Status status, bool closed) =
                reg.loans(id);
            assertLe(disbursed, facility, "disbursed past the facility");
            assertLe(repaid, disbursed + fee, "repaid past what is owed");
            assertLe(fee * 10_000, 5_000 * facility, "fee above the limit");
            if (disbursed == 0) assertEq(repaid, 0, "repaid before any payout");
            bool settled = closed && repaid == disbursed + fee;
            if (status == ILoanRegistry.Status.Repaid) assertTrue(settled, "Repaid without settling");
            if (settled) {
                assertTrue(
                    status == ILoanRegistry.Status.Repaid || status == ILoanRegistry.Status.WrittenOff,
                    "settled loan left open"
                );
            }
        }
    }

    /// S2: no token ever leaves faster than the daily limit, even for a compromised Safe.
    function invariant_D_dailyLimitHolds() public view {
        assertLe(handler.ghostMaxDayOutflow(), handler.DAILY_LIMIT(), "daily limit exceeded");
    }

    /// S1, S7: an address with no role can change nothing and receive nothing.
    function invariant_E_outsiderPowerless() public view {
        assertEq(handler.ghostOutsiderSuccesses(), 0, "outsider call succeeded");
        assertEq(handler.ghostOutsiderBalance(), 0, "outsider received tokens");
    }

    /// S9: nothing that moves tokens or changes a loan succeeds while paused.
    function invariant_F_pauseHolds() public view {
        assertEq(handler.ghostMovedWhilePaused(), 0, "state changed while paused");
    }

    /// S1: tokens only ever reach approved addresses (the Safe, the partner).
    function invariant_G_onlyApprovedDestinations() public view {
        assertTrue(reg.approvedDestination(address(handler)), "Safe removed as a destination");
    }
}

/// @dev Property fuzzing of single rules, each against a plain reference.
contract LoanRegistryFuzz is Test {
    LoanRegistry internal reg;
    MockStable internal usdc;
    address internal constant ADMIN = address(0xAD);
    address internal constant PARTNER = address(0xBEEF);
    uint256 internal constant DAILY = 40_000e6;

    function setUp() public {
        vm.warp(1_763_510_400);
        reg = new LoanRegistry(ADMIN, address(this), 50_000_00);
        usdc = new MockStable("USD Coin", "USDC", 6);
        vm.startPrank(ADMIN);
        reg.allowToken(address(usdc), 11_000, 15_000, 32_000e6, DAILY);
        reg.addDestination(PARTNER);
        vm.stopPrank();
        usdc.mint(address(this), 1e15);
        usdc.approve(address(reg), type(uint256).max);
    }

    function _openLoan() internal returns (uint256 id) {
        id = reg.createLoan(keccak256("a"), keccak256("s"), 50_000_00, 0);
        reg.recordDisbursement(id, 25_000_00, address(usdc), 25_000_00 * 12_700, keccak256("p1"), PARTNER);
        vm.warp(block.timestamp + 1 days);
        reg.recordDisbursement(id, 25_000_00, address(usdc), 25_000_00 * 12_700, keccak256("p2"), PARTNER);
    }

    /// Section 5.1: accepted exactly when 11_000 * pence <= tokens <= 15_000 * pence (6 decimals).
    function testFuzz_rateBand(uint256 pence, uint256 amount) public {
        uint256 id = _openLoan();
        pence = bound(pence, 1, 50_000_00);
        amount = bound(amount, 1, pence * 20_000);
        bool inBand = amount >= 11_000 * pence && amount <= 15_000 * pence;
        if (!inBand) vm.expectRevert(ILoanRegistry.LoanRegistry__RateOutOfBand.selector);
        reg.recordRepayment(id, pence, address(usdc), amount, keccak256("s"));
    }

    /// S13: a fee above half the facility always reverts; at or below always passes.
    function testFuzz_feeLimit(uint256 facility, uint256 fee) public {
        facility = bound(facility, 1, 50_000_00);
        fee = bound(fee, 0, facility * 2);
        if (fee * 10_000 > 5_000 * facility) vm.expectRevert(ILoanRegistry.LoanRegistry__FeeExceeded.selector);
        reg.createLoan(keccak256("a"), keccak256("s"), facility, fee);
    }

    /// S2: two tranches on the same UTC day cannot pass the daily limit; on different days each
    /// starts from zero.
    function testFuzz_dailyLimitAcrossMidnight(uint256 start, uint256 gap, uint256 firstPence, uint256 secondPence)
        public
    {
        vm.warp(bound(start, 1_763_510_400, 1_763_510_400 + 365 days));
        uint256 a = reg.createLoan(keccak256("a"), keccak256("s"), 50_000_00, 0);
        uint256 b = reg.createLoan(keccak256("b"), keccak256("t"), 50_000_00, 0);
        firstPence = bound(firstPence, 1, 21_000_00);
        secondPence = bound(secondPence, 1, 21_000_00);
        uint256 first = firstPence * 15_000;
        uint256 second = secondPence * 15_000;
        uint256 dayBefore = block.timestamp / 1 days;
        reg.recordDisbursement(a, firstPence, address(usdc), first, keccak256("p1"), PARTNER);

        vm.warp(block.timestamp + bound(gap, 0, 2 days));
        bool sameDay = block.timestamp / 1 days == dayBefore;
        if (sameDay && first + second > DAILY) {
            vm.expectRevert(ILoanRegistry.LoanRegistry__DailyLimitExceeded.selector);
        }
        reg.recordDisbursement(b, secondPence, address(usdc), second, keccak256("p2"), PARTNER);
    }
}
