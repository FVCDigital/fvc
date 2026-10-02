// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Vesting} from "../src/vesting/Vesting.sol";

contract MockFVC is ERC20 {
    constructor() ERC20("Mock FVC", "mFVC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Owns the Vesting contract and drives it with clamped random input.
///      Properties live here (prop_*) so Foundry and Medusa check the same rules;
///      the constructor takes no arguments because Medusa deploys it directly.
contract VestingHandler is Test {
    Vesting public immutable vesting;
    MockFVC public immutable token;

    address[3] public actors;

    uint256 public ghostMintedIn;
    uint256 public ghostReleased;
    uint256 public ghostRefunded;

    constructor() {
        token = new MockFVC();
        vesting = new Vesting(address(token));
        actors[0] = address(0xA11CE);
        actors[1] = address(0xB0B);
        actors[2] = address(0xC0FFEE);
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % 3];
    }

    function createSchedule(
        uint256 actorSeed,
        uint256 amount,
        uint256 cliffPct,
        uint256 duration,
        uint256 startDelay
    ) external {
        address b = _actor(actorSeed);
        amount = bound(amount, 1e18, 1_000_000e18);
        duration = bound(duration, 1 days, 4 * 365 days);
        uint256 cliff = (duration * bound(cliffPct, 0, 100)) / 100;
        uint256 start = block.timestamp + bound(startDelay, 0, 30 days);

        token.mint(address(vesting), amount);
        ghostMintedIn += amount;

        try vesting.createVestingSchedule(b, amount, start, cliff, duration) {} catch {}
    }

    function modifySchedule(
        uint256 actorSeed,
        uint256 scheduleSeed,
        uint256 newAmount,
        uint256 cliffPct,
        uint256 newDuration
    ) external {
        address b = _actor(actorSeed);
        uint256 count = vesting.scheduleCount(b);
        if (count == 0) return;

        newAmount = bound(newAmount, 1e18, 2_000_000e18);
        newDuration = bound(newDuration, 1 days, 4 * 365 days);
        uint256 newCliff = (newDuration * bound(cliffPct, 0, 100)) / 100;

        try vesting.modifyVestingSchedule(b, scheduleSeed % count, newAmount, newCliff, newDuration) {} catch {}
    }

    function revoke(uint256 actorSeed, uint256 scheduleSeed) external {
        address b = _actor(actorSeed);
        uint256 count = vesting.scheduleCount(b);
        if (count == 0) return;

        uint256 ownerBefore = token.balanceOf(address(this));
        uint256 beneficiaryBefore = token.balanceOf(b);
        try vesting.revokeVesting(b, scheduleSeed % count) {
            ghostRefunded += token.balanceOf(address(this)) - ownerBefore;
            // revoke settles vested-but-unclaimed straight to the beneficiary
            ghostReleased += token.balanceOf(b) - beneficiaryBefore;
        } catch {}
    }

    function release(uint256 actorSeed, uint256 scheduleSeed) external {
        address b = _actor(actorSeed);
        uint256 count = vesting.scheduleCount(b);
        if (count == 0) return;

        uint256 before = token.balanceOf(b);
        vm.prank(b);
        try vesting.release(scheduleSeed % count) {
            ghostReleased += token.balanceOf(b) - before;
        } catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1 hours, 120 days));
    }

    // ============ PROPERTIES ============

    /// Never owe more than you hold.
    function prop_neverOwesMoreThanItHolds() public view returns (bool) {
        return vesting.totalVesting() <= token.balanceOf(address(vesting));
    }

    /// The aggregate counter must equal the sum of live per-schedule obligations.
    function prop_totalVestingReconciles() public view returns (bool) {
        uint256 sum;
        for (uint256 a = 0; a < 3; a++) {
            address b = actors[a];
            uint256 count = vesting.scheduleCount(b);
            for (uint256 i = 0; i < count; i++) {
                (uint256 totalAmount, uint256 released,,,, bool revoked) = vesting.schedules(b, i);
                if (!revoked) sum += totalAmount - released;
            }
        }
        return sum == vesting.totalVesting();
    }

    /// Dashboard reads must never revert on a reachable state.
    function prop_viewsNeverRevert() public view returns (bool) {
        for (uint256 a = 0; a < 3; a++) {
            address b = actors[a];
            uint256 count = vesting.scheduleCount(b);
            for (uint256 i = 0; i < count; i++) {
                try vesting.releasableAmount(b, i) {} catch {
                    return false;
                }
            }
        }
        return true;
    }

    /// Nothing is created or destroyed.
    function prop_tokensConserved() public view returns (bool) {
        return token.balanceOf(address(vesting)) + ghostReleased + ghostRefunded == ghostMintedIn;
    }
}

contract VestingInvariants is Test {
    VestingHandler internal handler;

    function setUp() public {
        handler = new VestingHandler();
        targetContract(address(handler));
    }

    function invariant_A_neverOwesMoreThanItHolds() public view {
        assertTrue(handler.prop_neverOwesMoreThanItHolds(), "totalVesting exceeds contract balance");
    }

    function invariant_B_totalVestingReconciles() public view {
        assertTrue(handler.prop_totalVestingReconciles(), "totalVesting does not match live obligations");
    }

    function invariant_C_viewsNeverRevert() public view {
        assertTrue(handler.prop_viewsNeverRevert(), "releasableAmount reverted on a live schedule");
    }

    function invariant_D_tokensConserved() public view {
        assertTrue(handler.prop_tokensConserved(), "tokens created or destroyed");
    }
}
