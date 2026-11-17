// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Staking} from "../src/staking/Staking.sol";
import {MockStable} from "../src/mocks/MockStable.sol";

/// @dev Fixed scenarios for reward accounting edge cases. See INVARIANTS.md, Staking "Funding".
contract StakingRegression is Test {
    MockStable internal fvc;
    MockStable internal usdc;
    Staking internal staking;
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);
    uint256 internal constant REWARD = 7_000e6;

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

    function _notify(uint256 reward) internal {
        usdc.mint(address(this), reward);
        usdc.approve(address(staking), reward);
        staking.notifyRewardAmount(reward);
    }

    function _dust() internal view returns (uint256) {
        return staking.rewardsDuration();
    }

    function test_notifyPullsReward() public {
        _notify(REWARD);
        assertEq(usdc.balanceOf(address(staking)), REWARD);
        assertEq(usdc.balanceOf(address(this)), 0);
    }

    function test_unfundedNotifyReverts() public {
        _notify(REWARD);
        vm.expectRevert();
        staking.notifyRewardAmount(REWARD);
    }

    /// The case KupiaSec raised: a period funded before anyone stakes.
    function test_rewardsBeforeFirstStakerAreNotLost() public {
        _notify(REWARD);
        vm.warp(block.timestamp + 3 days);

        _stake(ALICE, 1_000e18);
        vm.warp(block.timestamp + staking.rewardsDuration());

        assertApproxEqAbs(staking.earned(ALICE), REWARD, _dust());
    }

    function test_rewardsDuringEmptyGapAreNotLost() public {
        _stake(ALICE, 1_000e18);
        _notify(REWARD);
        vm.warp(block.timestamp + 2 days);

        vm.prank(ALICE);
        staking.withdraw(1_000e18);
        vm.warp(block.timestamp + 10 days);

        _stake(BOB, 1_000e18);
        vm.warp(block.timestamp + staking.rewardsDuration());

        assertApproxEqAbs(staking.earned(ALICE) + staking.earned(BOB), REWARD, _dust() + 2);
        assertApproxEqAbs(staking.earned(ALICE), (REWARD * 2) / 7, _dust());
    }

    function test_periodEndedWhileEmptyIsCarriedIntoNextNotify() public {
        _notify(REWARD);
        vm.warp(block.timestamp + 30 days);

        _notify(REWARD);
        _stake(ALICE, 1_000e18);
        vm.warp(block.timestamp + staking.rewardsDuration());

        assertApproxEqAbs(staking.earned(ALICE), 2 * REWARD, 2 * _dust());
    }

    /// With 1e18 scaling and 10M FVC staked, any accrual under 10 USDC between updates rounded
    /// to zero. Updating every 2 minutes (~1.4 USDC per slice of a 7,000 USDC week) lost it all.
    function test_largeStakeFrequentUpdatesKeepRewards() public {
        _stake(ALICE, 10_000_000e18);
        _notify(REWARD);

        uint256 end = staking.periodFinish();
        while (block.timestamp + 120 < end) {
            vm.warp(block.timestamp + 120);
            _stake(BOB, 1);
        }
        vm.warp(end);

        assertApproxEqAbs(staking.earned(ALICE) + staking.earned(BOB), REWARD, _dust() + 2);
    }
}
