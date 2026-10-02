// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vesting} from "../../src/vesting/Vesting.sol";
import {MockStable} from "../../src/mocks/MockStable.sol";

/// @dev Halmos proofs (check_*). forge test skips these. Bounds keep amounts and times inside
///      realistic ranges so the solver terminates.
abstract contract VestingSymbolicBase is Test {
    MockStable internal token;
    Vesting internal vesting;
    address internal constant BENEFICIARY = address(0xB0B);

    function setUp() public {
        token = new MockStable("Mock FVC", "mFVC", 18);
        vesting = new Vesting(address(token));
    }

    function _create(uint256 amount, uint256 cliff, uint256 duration) internal {
        vm.assume(amount > 0 && amount <= 1e30);
        vm.assume(duration > 0 && duration <= 10 * 365 days);
        vm.assume(cliff <= duration);
        token.mint(address(vesting), amount);
        vesting.createVestingSchedule(BENEFICIARY, amount, block.timestamp, cliff, duration);
    }
}

/// Proven on every weekly run; a failure here fails CI.
contract VestingSymbolic is VestingSymbolicBase {
    /// Nothing is releasable before the cliff, everything is releasable at the end.
    function check_cliffAndEnd(uint256 amount, uint256 cliff, uint256 duration, uint256 dt) public {
        _create(amount, cliff, duration);
        vm.assume(dt <= 20 * 365 days);
        uint256 start = block.timestamp;
        vm.warp(start + dt);
        uint256 r = vesting.releasableAmount(BENEFICIARY, 0);
        if (dt < cliff) assert(r == 0);
        if (dt >= duration) assert(r == amount);
    }

    /// Two releases at any times never pay out more than the total, and accounting stays reconciled.
    function check_releasesNeverOverpay(uint256 amount, uint256 cliff, uint256 duration, uint256 t1, uint256 t2)
        public
    {
        _create(amount, cliff, duration);
        vm.assume(t1 <= t2 && t2 <= 20 * 365 days);
        uint256 start = block.timestamp;

        vm.warp(start + t1);
        if (vesting.releasableAmount(BENEFICIARY, 0) > 0) {
            vm.prank(BENEFICIARY);
            vesting.release(0);
        }
        vm.warp(start + t2);
        if (vesting.releasableAmount(BENEFICIARY, 0) > 0) {
            vm.prank(BENEFICIARY);
            vesting.release(0);
        }

        uint256 paid = token.balanceOf(BENEFICIARY);
        assert(paid <= amount);
        assert(vesting.totalVesting() == amount - paid);
        assert(token.balanceOf(address(vesting)) == amount - paid);
    }
}

/// Nonlinear (symbolic * symbolic / symbolic) and beyond current solvers in reasonable time.
/// Run weekly as best effort; a timeout is reported, not failed. The fuzzers cover the same rules.
contract VestingSymbolicSlow is VestingSymbolicBase {
    /// Releasable never exceeds the schedule total, at any time.
    function check_releasableNeverExceedsTotal(uint256 amount, uint256 cliff, uint256 duration, uint256 dt)
        public
    {
        _create(amount, cliff, duration);
        vm.assume(dt <= 20 * 365 days);
        vm.warp(block.timestamp + dt);
        assert(vesting.releasableAmount(BENEFICIARY, 0) <= amount);
    }

    /// Vested amount never decreases as time moves forward.
    function check_vestingMonotonic(uint256 amount, uint256 cliff, uint256 duration, uint256 t1, uint256 t2)
        public
    {
        _create(amount, cliff, duration);
        vm.assume(t1 <= t2 && t2 <= 20 * 365 days);
        uint256 start = block.timestamp;
        vm.warp(start + t1);
        uint256 r1 = vesting.releasableAmount(BENEFICIARY, 0);
        vm.warp(start + t2);
        uint256 r2 = vesting.releasableAmount(BENEFICIARY, 0);
        assert(r1 <= r2);
    }
}
