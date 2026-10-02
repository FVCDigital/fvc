// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Staking} from "../src/staking/Staking.sol";
import {MockStable} from "../src/mocks/MockStable.sol";

/// @dev Owns Staking (reward distributor role) and drives stakers with clamped random input.
///      Reward top-ups are always funded before notifyRewardAmount, which is the operational
///      rule the Safe must follow; see INVARIANTS.md for what happens when it is not.
contract StakingHandler is Test {
    Staking public immutable staking;
    MockStable public immutable fvc;
    MockStable public immutable usdc;

    address[3] public actors;

    uint256 public ghostStaked;
    uint256 public ghostWithdrawn;
    uint256 public ghostRewardsFunded;
    uint256 public ghostRewardsPaid;

    uint256 public ghostLastRewardPerToken;
    bool public ghostRewardPerTokenDecreased;
    bool public ghostEarnedDecreased;
    bool public ghostClaimMismatch;
    bool public ghostProtectedTokenRecovered;

    constructor() {
        fvc = new MockStable("Mock FVC", "mFVC", 18);
        usdc = new MockStable("USD Coin", "USDC", 6);
        staking = new Staking(address(fvc), address(usdc));
        actors[0] = address(0xA11CE);
        actors[1] = address(0xB0B);
        actors[2] = address(0xC0FFEE);
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % 3];
    }

    function _earnedSnapshot() internal view returns (uint256[3] memory e) {
        for (uint256 i = 0; i < 3; i++) {
            e[i] = staking.earned(actors[i]);
        }
    }

    /// Records monotonicity breaks. `claimer` is the only account allowed to see earned drop.
    function _afterCall(uint256[3] memory earnedBefore, address claimer) internal {
        for (uint256 i = 0; i < 3; i++) {
            if (actors[i] != claimer && staking.earned(actors[i]) < earnedBefore[i]) {
                ghostEarnedDecreased = true;
            }
        }
        uint256 rpt = staking.rewardPerToken();
        if (rpt < ghostLastRewardPerToken) ghostRewardPerTokenDecreased = true;
        ghostLastRewardPerToken = rpt;
    }

    function stake(uint256 actorSeed, uint256 amount) external {
        address a = _actor(actorSeed);
        amount = bound(amount, 1, 10_000_000e18);
        uint256[3] memory before = _earnedSnapshot();

        fvc.mint(a, amount);
        vm.startPrank(a);
        fvc.approve(address(staking), amount);
        try staking.stake(amount) {
            ghostStaked += amount;
        } catch {}
        vm.stopPrank();

        _afterCall(before, address(0));
    }

    function withdraw(uint256 actorSeed, uint256 amount) external {
        address a = _actor(actorSeed);
        uint256 bal = staking.balanceOf(a);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);
        uint256[3] memory before = _earnedSnapshot();

        vm.prank(a);
        try staking.withdraw(amount) {
            ghostWithdrawn += amount;
        } catch {}

        _afterCall(before, address(0));
    }

    function getReward(uint256 actorSeed) external {
        address a = _actor(actorSeed);
        uint256[3] memory before = _earnedSnapshot();
        uint256 expected = staking.earned(a);
        uint256 usdcBefore = usdc.balanceOf(a);

        vm.prank(a);
        try staking.getReward() {
            uint256 received = usdc.balanceOf(a) - usdcBefore;
            ghostRewardsPaid += received;
            if (received != expected || staking.rewards(a) != 0) ghostClaimMismatch = true;
        } catch {}

        _afterCall(before, a);
    }

    function exit(uint256 actorSeed) external {
        address a = _actor(actorSeed);
        uint256[3] memory before = _earnedSnapshot();
        uint256 expected = staking.earned(a);
        uint256 stakeBefore = staking.balanceOf(a);
        uint256 usdcBefore = usdc.balanceOf(a);

        vm.prank(a);
        try staking.exit() {
            uint256 received = usdc.balanceOf(a) - usdcBefore;
            ghostRewardsPaid += received;
            ghostWithdrawn += stakeBefore;
            if (received != expected || staking.rewards(a) != 0 || staking.balanceOf(a) != 0) {
                ghostClaimMismatch = true;
            }
        } catch {}

        _afterCall(before, a);
    }

    function notifyRewardAmount(uint256 reward) external {
        reward = bound(reward, 0, 1_000_000e6);
        uint256[3] memory before = _earnedSnapshot();

        usdc.mint(address(staking), reward);
        ghostRewardsFunded += reward;
        try staking.notifyRewardAmount(reward) {} catch {}

        _afterCall(before, address(0));
    }

    function setRewardsDuration(uint256 duration) external {
        duration = bound(duration, 1 days, 60 days);
        uint256[3] memory before = _earnedSnapshot();
        try staking.setRewardsDuration(duration) {} catch {}
        _afterCall(before, address(0));
    }

    function tryRecoverProtected(bool rewardsSide) external {
        address token = rewardsSide ? address(usdc) : address(fvc);
        try staking.recoverERC20(token, 1) {
            ghostProtectedTokenRecovered = true;
        } catch {}
    }

    function warp(uint256 secs) external {
        uint256[3] memory before = _earnedSnapshot();
        vm.warp(block.timestamp + bound(secs, 1, 30 days));
        _afterCall(before, address(0));
    }

    // ============ PROPERTIES ============

    /// _totalSupply equals the sum of every staker's balance, and no balance exceeds it.
    function prop_totalSupplyIsSumOfBalances() public view returns (bool) {
        uint256 sum;
        uint256 total = staking.totalSupply();
        for (uint256 i = 0; i < 3; i++) {
            uint256 bal = staking.balanceOf(actors[i]);
            if (bal > total) return false;
            sum += bal;
        }
        return sum == total;
    }

    /// Staked FVC is fully backed and only moves through stake, withdraw and exit.
    function prop_stakeBackedAndConserved() public view returns (bool) {
        uint256 held = fvc.balanceOf(address(staking));
        return held >= staking.totalSupply() && held == ghostStaked - ghostWithdrawn;
    }

    /// USDC held equals what was funded minus what was paid out.
    function prop_rewardTokenConserved() public view returns (bool) {
        return usdc.balanceOf(address(staking)) == ghostRewardsFunded - ghostRewardsPaid;
    }

    /// Every unpaid reward can be paid from the contract's USDC balance.
    function prop_rewardsSolvent() public view returns (bool) {
        uint256 owed;
        for (uint256 i = 0; i < 3; i++) {
            owed += staking.earned(actors[i]);
        }
        return owed <= usdc.balanceOf(address(staking));
    }

    function prop_rewardPerTokenNeverDecreases() public view returns (bool) {
        return !ghostRewardPerTokenDecreased && staking.rewardPerToken() >= ghostLastRewardPerToken;
    }

    /// earned(user) only drops for the user who just claimed.
    function prop_earnedNeverDecreasesForOthers() public view returns (bool) {
        return !ghostEarnedDecreased;
    }

    /// A claim pays exactly earned() and zeroes the stored reward.
    function prop_claimPaysExactlyEarned() public view returns (bool) {
        return !ghostClaimMismatch;
    }

    function prop_rewardWindowBounded() public view returns (bool) {
        uint256 t = staking.lastTimeRewardApplicable();
        return t <= block.timestamp && t <= staking.periodFinish();
    }

    function prop_protectedTokensNeverRecovered() public view returns (bool) {
        return !ghostProtectedTokenRecovered;
    }
}

contract StakingInvariants is Test {
    StakingHandler internal handler;

    function setUp() public {
        handler = new StakingHandler();
        targetContract(address(handler));
    }

    function invariant_A_totalSupplyIsSumOfBalances() public view {
        assertTrue(handler.prop_totalSupplyIsSumOfBalances(), "totalSupply != sum of balances");
    }

    function invariant_B_stakeBackedAndConserved() public view {
        assertTrue(handler.prop_stakeBackedAndConserved(), "staked FVC not backed or not conserved");
    }

    function invariant_C_rewardTokenConserved() public view {
        assertTrue(handler.prop_rewardTokenConserved(), "reward token created or destroyed");
    }

    function invariant_D_rewardsSolvent() public view {
        assertTrue(handler.prop_rewardsSolvent(), "unpaid rewards exceed USDC balance");
    }

    function invariant_E_rewardPerTokenNeverDecreases() public view {
        assertTrue(handler.prop_rewardPerTokenNeverDecreases(), "rewardPerToken decreased");
    }

    function invariant_F_earnedNeverDecreasesForOthers() public view {
        assertTrue(handler.prop_earnedNeverDecreasesForOthers(), "earned decreased without a claim");
    }

    function invariant_G_claimPaysExactlyEarned() public view {
        assertTrue(handler.prop_claimPaysExactlyEarned(), "claim paid a different amount than earned");
    }

    function invariant_H_rewardWindowBounded() public view {
        assertTrue(handler.prop_rewardWindowBounded(), "lastTimeRewardApplicable out of bounds");
    }

    function invariant_I_protectedTokensNeverRecovered() public view {
        assertTrue(handler.prop_protectedTokensNeverRecovered(), "recoverERC20 drained a protected token");
    }
}
