import { expect } from "chai";
import { ethers } from "hardhat";
import {
  DAY,
  Status,
  USDC,
  createLoan,
  disburse,
  gbp,
  increaseTime,
  loadUnitFixture,
  repay,
  resetFixtureCache,
  tokenFor,
  type Fixture,
} from "./helpers/loanRegistryFixture";

/**
 * S6 end to end with the real Staking contract (spec: contracts/LOAN_REGISTRY.md section 3,
 * docs/specs/system.md 7.3): pay out, repay, forward to the Safe, notifyRewardAmount, and a
 * staker earns the repaid money over 7 days.
 */
describe("LoanRegistry: end to end with Staking", function () {
  before(resetFixtureCache);

  let fx: Fixture;
  let staking: any;
  let fvc: any;

  beforeEach(async function () {
    fx = await loadUnitFixture();
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(fx.admin.address);
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await fvc.getAddress(), await fx.usdc.getAddress());
    await staking.transferOwnership(fx.safe.address);
    await fvc.mint(fx.other.address, ethers.parseUnits("1000000", 18));
    await fvc.connect(fx.other).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(fx.other).stake(ethers.parseUnits("1000000", 18));
  });

  it("repaid money reaches a staker over 7 days, and nothing more", async function () {
    const id = await createLoan(fx, gbp(10_000n), gbp(1_000n));
    await disburse(fx, id, gbp(10_000n), "t1");
    await repay(fx, id, gbp(11_000n), "r1");
    expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);

    const received = tokenFor(gbp(11_000n));
    const registry = await fx.registry.getAddress();
    expect(await fx.usdc.balanceOf(registry)).to.equal(received);

    await expect(fx.registry.connect(fx.safe).forward(await fx.usdc.getAddress(), received + 1n, fx.safe.address))
      .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ForwardExceeded");
    await fx.registry.connect(fx.safe).forward(await fx.usdc.getAddress(), received, fx.safe.address);
    expect(await fx.usdc.balanceOf(registry)).to.equal(0n);

    await fx.usdc.connect(fx.safe).approve(await staking.getAddress(), received);
    await staking.connect(fx.safe).notifyRewardAmount(received);

    await increaseTime(7 * DAY + 1);
    const before = await fx.usdc.balanceOf(fx.other.address);
    await staking.connect(fx.other).getReward();
    const earned = (await fx.usdc.balanceOf(fx.other.address)) - before;

    const dust = USDC(1n);
    expect(earned).to.be.lte(received);
    expect(earned).to.be.gte(received - dust);
  });
});
