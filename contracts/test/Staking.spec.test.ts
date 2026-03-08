import { ethers } from "hardhat";
import { expect } from "chai";

/**
 * Staking — spec, structural, and mutation test suite
 *
 * Covers every function and branch in Staking.sol:
 *
 * SPEC: observable behaviour from a user/owner perspective
 * STRUCTURAL: every revert path, zero-supply edge cases, boundary conditions
 * MUTATION GUARDS (labelled S01–S14):
 *   S01 — remove "amount > 0" guard in stake(): zero stake must revert
 *   S02 — remove "amount > 0" guard in withdraw(): zero withdraw must revert
 *   S03 — remove "balance >= amount" guard: over-withdraw must revert
 *   S04 — swap _totalSupply +/- in stake/withdraw: balances must be consistent
 *   S05 — remove rewardRate = 0 branch in notifyRewardAmount: rate must update correctly
 *   S06 — remove leftover calculation in notifyRewardAmount mid-period: rollover must work
 *   S07 — remove "rewardRate <= balance / duration" guard: over-funded notify must revert
 *   S08 — remove periodFinish check in setRewardsDuration: change during active period must revert
 *   S09 — remove stakingToken guard in recoverERC20: recovering staking token must revert
 *   S10 — remove rewardsToken guard in recoverERC20: recovering rewards token must revert
 *   S11 — flip < to <= in lastTimeRewardApplicable: boundary must return periodFinish
 *   S12 — remove rewards[account] = 0 in getReward: double-claim must not pay twice
 *   S13 — remove exit() balance check: exit with zero stake must not revert
 *   S14 — remove updateReward(address(0)) from notifyRewardAmount: rewardPerTokenStored must update
 */

async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function latestTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

describe("Staking — spec + structural + mutation coverage", function () {
  let staking: any;
  let fvc: any;
  let usdc: any;
  let other: any;
  let owner: any;
  let alice: any;
  let bob: any;

  const STAKE    = ethers.parseEther("1000");
  const REWARD   = ethers.parseUnits("700", 6);   // 700 USDC (6 decimals)
  const DURATION = 7 * 24 * 60 * 60;              // 7 days

  beforeEach(async () => {
    [owner, alice, bob, other] = await ethers.getSigners();

    // Deploy mock FVC (staking token, 18 decimals)
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(owner.address);
    await fvc.waitForDeployment();

    // Deploy mock USDC (rewards token, 6 decimals) — reuse MockStable
    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy a third token for recoverERC20 tests
    other = await MockStable.deploy("Other", "OTH", 18);
    await other.waitForDeployment();

    // Deploy Staking
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await fvc.getAddress(), await usdc.getAddress());
    await staking.waitForDeployment();

    // Mint FVC to alice and bob
    await fvc.mint(alice.address, STAKE * 10n);
    await fvc.mint(bob.address, STAKE * 10n);

    // Approve staking contract
    await fvc.connect(alice).approve(await staking.getAddress(), ethers.MaxUint256);
    await fvc.connect(bob).approve(await staking.getAddress(), ethers.MaxUint256);

    // Fund staking contract with USDC rewards
    const [deployer] = await ethers.getSigners();
    await usdc.mint(await staking.getAddress(), REWARD * 100n);
  });

  async function seedReward(amount = REWARD) {
    await staking.notifyRewardAmount(amount);
  }

  // ── Constructor ──────────────────────────────────────────────────────────

  describe("SPEC: constructor", () => {
    it("sets stakingToken and rewardsToken correctly", async () => {
      expect(await staking.stakingToken()).to.equal(await fvc.getAddress());
      expect(await staking.rewardsToken()).to.equal(await usdc.getAddress());
    });

    it("reverts with zero stakingToken address", async () => {
      const Staking = await ethers.getContractFactory("Staking");
      await expect(
        Staking.deploy(ethers.ZeroAddress, await usdc.getAddress())
      ).to.be.reverted;
    });

    it("reverts with zero rewardsToken address", async () => {
      const Staking = await ethers.getContractFactory("Staking");
      await expect(
        Staking.deploy(await fvc.getAddress(), ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("initialises totalSupply to zero", async () => {
      expect(await staking.totalSupply()).to.equal(0n);
    });

    it("initialises rewardsDuration to 7 days", async () => {
      expect(await staking.rewardsDuration()).to.equal(DURATION);
    });
  });

  // ── SPEC: stake ──────────────────────────────────────────────────────────

  describe("SPEC: stake()", () => {
    it("increases user balance and totalSupply", async () => {
      await staking.connect(alice).stake(STAKE);
      expect(await staking.balanceOf(alice.address)).to.equal(STAKE);
      expect(await staking.totalSupply()).to.equal(STAKE);
    });

    it("transfers FVC from user to contract", async () => {
      const before = await fvc.balanceOf(alice.address);
      await staking.connect(alice).stake(STAKE);
      expect(await fvc.balanceOf(alice.address)).to.equal(before - STAKE);
      expect(await fvc.balanceOf(await staking.getAddress())).to.equal(STAKE);
    });

    it("emits Staked event", async () => {
      await expect(staking.connect(alice).stake(STAKE))
        .to.emit(staking, "Staked")
        .withArgs(alice.address, STAKE);
    });

    it("two users staking accumulates totalSupply correctly (kills S04)", async () => {
      await staking.connect(alice).stake(STAKE);
      await staking.connect(bob).stake(STAKE * 2n);
      expect(await staking.totalSupply()).to.equal(STAKE * 3n);
    });
  });

  // ── STRUCTURAL: stake reverts ────────────────────────────────────────────

  describe("STRUCTURAL: stake() reverts (kills S01)", () => {
    it("reverts on zero amount", async () => {
      await expect(staking.connect(alice).stake(0n)).to.be.revertedWith("Cannot stake 0");
    });

    it("reverts when user has insufficient FVC balance", async () => {
      const huge = ethers.parseEther("999999999");
      await expect(staking.connect(alice).stake(huge)).to.be.reverted;
    });

    it("reverts when allowance is insufficient", async () => {
      await fvc.connect(bob).approve(await staking.getAddress(), 0n);
      await expect(staking.connect(bob).stake(STAKE)).to.be.reverted;
    });
  });

  // ── SPEC: withdraw ───────────────────────────────────────────────────────

  describe("SPEC: withdraw()", () => {
    beforeEach(async () => {
      await staking.connect(alice).stake(STAKE);
    });

    it("decreases user balance and totalSupply", async () => {
      await staking.connect(alice).withdraw(STAKE);
      expect(await staking.balanceOf(alice.address)).to.equal(0n);
      expect(await staking.totalSupply()).to.equal(0n);
    });

    it("returns FVC to user", async () => {
      const before = await fvc.balanceOf(alice.address);
      await staking.connect(alice).withdraw(STAKE);
      expect(await fvc.balanceOf(alice.address)).to.equal(before + STAKE);
    });

    it("emits Withdrawn event", async () => {
      await expect(staking.connect(alice).withdraw(STAKE))
        .to.emit(staking, "Withdrawn")
        .withArgs(alice.address, STAKE);
    });

    it("partial withdraw leaves correct balance", async () => {
      await staking.connect(alice).withdraw(STAKE / 2n);
      expect(await staking.balanceOf(alice.address)).to.equal(STAKE / 2n);
    });
  });

  // ── STRUCTURAL: withdraw reverts ─────────────────────────────────────────

  describe("STRUCTURAL: withdraw() reverts (kills S02, S03)", () => {
    it("reverts on zero amount (kills S02)", async () => {
      await staking.connect(alice).stake(STAKE);
      await expect(staking.connect(alice).withdraw(0n)).to.be.revertedWith("Cannot withdraw 0");
    });

    it("reverts when withdrawing more than staked (kills S03)", async () => {
      await staking.connect(alice).stake(STAKE);
      await expect(staking.connect(alice).withdraw(STAKE + 1n)).to.be.revertedWith("Insufficient balance");
    });

    it("reverts when user has never staked", async () => {
      await expect(staking.connect(bob).withdraw(1n)).to.be.reverted;
    });
  });

  // ── SPEC: notifyRewardAmount ─────────────────────────────────────────────

  describe("SPEC: notifyRewardAmount()", () => {
    it("sets rewardRate correctly for fresh period (kills S05)", async () => {
      await seedReward();
      const rate = await staking.rewardRate();
      expect(rate).to.equal(REWARD / BigInt(DURATION));
    });

    it("sets periodFinish to now + rewardsDuration", async () => {
      await seedReward();
      const now = await latestTimestamp();
      const finish = await staking.periodFinish();
      expect(finish).to.be.closeTo(BigInt(now) + BigInt(DURATION), 2n);
    });

    it("emits RewardAdded event", async () => {
      await expect(staking.notifyRewardAmount(REWARD))
        .to.emit(staking, "RewardAdded")
        .withArgs(REWARD);
    });

    it("only owner can call notifyRewardAmount", async () => {
      await expect(staking.connect(alice).notifyRewardAmount(REWARD)).to.be.reverted;
    });

    it("mid-period rollover adds leftover to new rate (kills S06)", async () => {
      await seedReward(REWARD);
      await increaseTime(DURATION / 2);
      const rateBefore = await staking.rewardRate();
      await usdc.mint(await staking.getAddress(), REWARD);
      await staking.notifyRewardAmount(REWARD);
      const rateAfter = await staking.rewardRate();
      // New rate must be higher than original rate due to leftover
      expect(rateAfter).to.be.gt(rateBefore);
    });

    it("reverts when reward exceeds contract balance (kills S07)", async () => {
      const tooMuch = REWARD * 1000n;
      await expect(staking.notifyRewardAmount(tooMuch)).to.be.revertedWith("Provided reward too high");
    });

    it("updates rewardPerTokenStored via updateReward(address(0)) (kills S14)", async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION / 2);
      const stored = await staking.rewardPerTokenStored();
      await staking.notifyRewardAmount(REWARD);
      const storedAfter = await staking.rewardPerTokenStored();
      expect(storedAfter).to.be.gt(stored);
    });
  });

  // ── SPEC: earned + getReward ─────────────────────────────────────────────

  describe("SPEC: earned() and getReward()", () => {
    beforeEach(async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
    });

    it("earned() is zero before any time passes", async () => {
      expect(await staking.earned(alice.address)).to.equal(0n);
    });

    it("earned() accumulates over time", async () => {
      await increaseTime(DURATION / 2);
      const earned = await staking.earned(alice.address);
      expect(earned).to.be.gt(0n);
    });

    it("earned() reaches approximately full reward after full duration (sole staker)", async () => {
      await increaseTime(DURATION + 1);
      const earned = await staking.earned(alice.address);
      // Within 0.1% of full reward — integer division in rewardRate loses up to rewardsDuration wei
      expect(earned).to.be.closeTo(REWARD, REWARD / 1000n);
    });

    it("getReward() transfers earned USDC to user", async () => {
      await increaseTime(DURATION);
      const earned = await staking.earned(alice.address);
      const before = await usdc.balanceOf(alice.address);
      await staking.connect(alice).getReward();
      const after = await usdc.balanceOf(alice.address);
      expect(after - before).to.equal(earned);
    });

    it("getReward() emits RewardPaid event", async () => {
      await increaseTime(DURATION);
      const earned = await staking.earned(alice.address);
      await expect(staking.connect(alice).getReward())
        .to.emit(staking, "RewardPaid")
        .withArgs(alice.address, earned);
    });

    it("getReward() resets rewards[user] to zero — no double-claim (kills S12)", async () => {
      await increaseTime(DURATION);
      await staking.connect(alice).getReward();
      const balAfterFirst = await usdc.balanceOf(alice.address);
      await staking.connect(alice).getReward();
      const balAfterSecond = await usdc.balanceOf(alice.address);
      expect(balAfterSecond).to.equal(balAfterFirst);
    });

    it("getReward() does nothing when no rewards earned", async () => {
      const before = await usdc.balanceOf(bob.address);
      await staking.connect(bob).getReward();
      expect(await usdc.balanceOf(bob.address)).to.equal(before);
    });
  });

  // ── SPEC: proportional reward split ─────────────────────────────────────

  describe("SPEC: proportional reward distribution", () => {
    it("two equal stakers split reward 50/50", async () => {
      await staking.connect(alice).stake(STAKE);
      await staking.connect(bob).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION + 1);

      const aliceEarned = await staking.earned(alice.address);
      const bobEarned   = await staking.earned(bob.address);
      const total = aliceEarned + bobEarned;

      expect(total).to.be.closeTo(REWARD, REWARD / 1000n);
      // Each gets ~50% — allow 0.2% tolerance for rounding
      expect(aliceEarned).to.be.closeTo(REWARD / 2n, REWARD / 500n);
      expect(bobEarned).to.be.closeTo(REWARD / 2n, REWARD / 500n);
    });

    it("2:1 stake ratio yields 2:1 reward split", async () => {
      await staking.connect(alice).stake(STAKE * 2n);
      await staking.connect(bob).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION + 1);

      const aliceEarned = await staking.earned(alice.address);
      const bobEarned   = await staking.earned(bob.address);

      // Alice should earn ~2x bob
      expect(aliceEarned).to.be.closeTo(bobEarned * 2n, REWARD / 100n);
    });

    it("late staker earns only from their stake time", async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION / 2);

      // Bob stakes halfway through
      await staking.connect(bob).stake(STAKE);
      await increaseTime(DURATION / 2 + 1);

      const aliceEarned = await staking.earned(alice.address);
      const bobEarned   = await staking.earned(bob.address);

      // Alice earned full first half + half of second half = 75%
      // Bob earned half of second half = 25%
      expect(aliceEarned).to.be.gt(bobEarned);
    });
  });

  // ── SPEC: exit() ─────────────────────────────────────────────────────────

  describe("SPEC: exit()", () => {
    beforeEach(async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION);
    });

    it("exit() withdraws full stake and claims reward in one call", async () => {
      const fvcBefore  = await fvc.balanceOf(alice.address);
      const usdcBefore = await usdc.balanceOf(alice.address);
      const earned     = await staking.earned(alice.address);

      await staking.connect(alice).exit();

      expect(await fvc.balanceOf(alice.address)).to.equal(fvcBefore + STAKE);
      expect(await usdc.balanceOf(alice.address)).to.equal(usdcBefore + earned);
      expect(await staking.balanceOf(alice.address)).to.equal(0n);
    });

    it("exit() with no stake does not revert (kills S13)", async () => {
      await expect(staking.connect(bob).exit()).to.not.be.reverted;
    });

    it("exit() emits Withdrawn and RewardPaid events", async () => {
      const earned = await staking.earned(alice.address);
      await expect(staking.connect(alice).exit())
        .to.emit(staking, "Withdrawn").withArgs(alice.address, STAKE)
        .and.to.emit(staking, "RewardPaid").withArgs(alice.address, earned);
    });
  });

  // ── SPEC: rewardPerToken + lastTimeRewardApplicable ──────────────────────

  describe("SPEC: rewardPerToken() and lastTimeRewardApplicable() (kills S11)", () => {
    it("rewardPerToken() returns stored value when totalSupply is zero", async () => {
      await seedReward();
      await increaseTime(DURATION);
      expect(await staking.rewardPerToken()).to.equal(await staking.rewardPerTokenStored());
    });

    it("lastTimeRewardApplicable() returns block.timestamp before period ends", async () => {
      await seedReward();
      const now = await latestTimestamp();
      const last = await staking.lastTimeRewardApplicable();
      expect(last).to.be.closeTo(BigInt(now), 2n);
    });

    it("lastTimeRewardApplicable() returns periodFinish after period ends (kills S11)", async () => {
      await seedReward();
      const finish = await staking.periodFinish();
      await increaseTime(DURATION + 100);
      expect(await staking.lastTimeRewardApplicable()).to.equal(finish);
    });

    it("getRewardForDuration() equals rewardRate * rewardsDuration", async () => {
      await seedReward();
      const rate     = await staking.rewardRate();
      const duration = await staking.rewardsDuration();
      expect(await staking.getRewardForDuration()).to.equal(rate * duration);
    });
  });

  // ── SPEC: setRewardsDuration ─────────────────────────────────────────────

  describe("SPEC: setRewardsDuration() (kills S08)", () => {
    it("owner can update duration after period ends", async () => {
      await seedReward();
      await increaseTime(DURATION + 1);
      const newDuration = 14 * 24 * 60 * 60;
      await staking.setRewardsDuration(newDuration);
      expect(await staking.rewardsDuration()).to.equal(newDuration);
    });

    it("emits RewardsDurationUpdated event", async () => {
      await seedReward();
      await increaseTime(DURATION + 1);
      const newDuration = 14 * 24 * 60 * 60;
      await expect(staking.setRewardsDuration(newDuration))
        .to.emit(staking, "RewardsDurationUpdated")
        .withArgs(newDuration);
    });

    it("reverts when period is still active (kills S08)", async () => {
      await seedReward();
      await expect(staking.setRewardsDuration(1)).to.be.revertedWith(
        "Previous rewards period must be complete before changing the duration"
      );
    });

    it("only owner can call setRewardsDuration", async () => {
      await seedReward();
      await increaseTime(DURATION + 1);
      await expect(staking.connect(alice).setRewardsDuration(1)).to.be.reverted;
    });
  });

  // ── SPEC: recoverERC20 ───────────────────────────────────────────────────

  describe("SPEC: recoverERC20() (kills S09, S10)", () => {
    it("owner can recover accidentally sent third-party tokens", async () => {
      const [deployer] = await ethers.getSigners();
      await other.mint(await staking.getAddress(), ethers.parseEther("100"));
      const before = await other.balanceOf(deployer.address);
      await staking.recoverERC20(await other.getAddress(), ethers.parseEther("100"));
      expect(await other.balanceOf(deployer.address)).to.equal(before + ethers.parseEther("100"));
    });

    it("reverts when trying to recover staking token (kills S09)", async () => {
      await expect(
        staking.recoverERC20(await fvc.getAddress(), 1n)
      ).to.be.revertedWith("Cannot withdraw staking token");
    });

    it("reverts when trying to recover rewards token (kills S10)", async () => {
      await expect(
        staking.recoverERC20(await usdc.getAddress(), 1n)
      ).to.be.revertedWith("Cannot withdraw rewards token");
    });

    it("only owner can call recoverERC20", async () => {
      await other.mint(await staking.getAddress(), ethers.parseEther("100"));
      await expect(
        staking.connect(alice).recoverERC20(await other.getAddress(), ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });

  // ── STRUCTURAL: updateReward modifier ────────────────────────────────────

  describe("STRUCTURAL: updateReward modifier", () => {
    it("staking updates userRewardPerTokenPaid to current rewardPerToken for user", async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION / 2);
      // Trigger updateReward by interacting — withdraw zero is not possible, so stake 1 more
      await staking.connect(alice).stake(1n);
      const paid = await staking.userRewardPerTokenPaid(alice.address);
      const current = await staking.rewardPerToken();
      expect(paid).to.equal(current);
    });

    it("reward accumulates correctly across multiple stake/withdraw cycles", async () => {
      await staking.connect(alice).stake(STAKE);
      await seedReward();
      await increaseTime(DURATION / 3);

      await staking.connect(alice).withdraw(STAKE / 2n);
      await increaseTime(DURATION / 3);

      await staking.connect(alice).stake(STAKE / 2n);
      await increaseTime(DURATION / 3 + 1);

      const earned = await staking.earned(alice.address);
      expect(earned).to.be.closeTo(REWARD, REWARD / 100n);
    });
  });
});
