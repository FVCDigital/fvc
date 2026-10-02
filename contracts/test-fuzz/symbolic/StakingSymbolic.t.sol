// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Staking} from "../../src/staking/Staking.sol";
import {MockStable} from "../../src/mocks/MockStable.sol";

/// @dev Halmos proofs (check_*). forge test skips these.
abstract contract StakingSymbolicBase is Test {
    MockStable internal fvc;
    MockStable internal usdc;
    Staking internal staking;
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);

    function setUp() public {
        fvc = new MockStable("Mock FVC", "mFVC", 18);
        usdc = new MockStable("USD Coin", "USDC", 6);
        staking = new Staking(address(fvc), address(usdc));
    }

    function _stake(address who, uint256 amount) internal {
        fvc.mint(who, amount);
        vm.startPrank(who);
        fvc.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    function _fundAndNotify(uint256 reward) internal {
        usdc.mint(address(staking), reward);
        staking.notifyRewardAmount(reward);
    }
}

/// Proven on every weekly run; a failure here fails CI.
contract StakingSymbolic is StakingSymbolicBase {
    /// Claiming pays exactly earned() and leaves nothing claimable behind.
    function check_claimPaysEarnedOnce(uint256 a, uint256 reward, uint256 dt) public {
        vm.assume(a > 0 && a <= 1e27);
        vm.assume(reward <= 1e15);
        vm.assume(dt <= 60 days);

        _stake(ALICE, a);
        _fundAndNotify(reward);
        vm.warp(block.timestamp + dt);

        uint256 owed = staking.earned(ALICE);
        vm.prank(ALICE);
        staking.getReward();

        assert(usdc.balanceOf(ALICE) == owed);
        assert(staking.earned(ALICE) == 0);
    }

    /// Withdrawing never returns more FVC than was staked.
    function check_withdrawBoundedByStake(uint256 a, uint256 w) public {
        vm.assume(a > 0 && a <= 1e27);
        _stake(ALICE, a);

        vm.prank(ALICE);
        try staking.withdraw(w) {
            assert(w <= a);
            assert(fvc.balanceOf(ALICE) == w);
            assert(staking.totalSupply() == a - w);
        } catch {
            assert(w == 0 || w > a);
        }
    }
}

/// Nonlinear and beyond current solvers in reasonable time. Run weekly as best effort;
/// a timeout is reported, not failed. StakingInvariants covers the same rule by fuzzing.
contract StakingSymbolicSlow is StakingSymbolicBase {
    /// Two stakers can never be owed more than the funded reward, however long they wait.
    function check_twoStakersOwedAtMostReward(uint256 a, uint256 b, uint256 reward, uint256 dt) public {
        vm.assume(a > 0 && a <= 1e27);
        vm.assume(b > 0 && b <= 1e27);
        vm.assume(reward <= 1e15);
        vm.assume(dt <= 60 days);

        _stake(ALICE, a);
        _stake(BOB, b);
        _fundAndNotify(reward);
        vm.warp(block.timestamp + dt);

        assert(staking.earned(ALICE) + staking.earned(BOB) <= reward);
    }
}
