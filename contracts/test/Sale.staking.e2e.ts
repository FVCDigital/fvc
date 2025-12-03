import { expect } from "chai";
import { ethers } from "hardhat";

import type { Contract } from "ethers";

describe("Sale + Staking e2e", function () {
  let deployer: any;
  let buyer: any;
  let beneficiary: any;

  let fvc: Contract;
  let usdc: Contract;
  let usdt: Contract;
  let sale: Contract;
  let staking: Contract;

  beforeEach(async () => {
    [deployer, buyer, beneficiary] = await ethers.getSigners();

    // Deploy FVC (admin = deployer)
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    // Deploy stables (6 decimals)
    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    usdt = await MockStable.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();

    // Mint buyer balances
    await usdc.connect(deployer).mint(buyer.address, ethers.parseUnits("10000", 6));
    await usdt.connect(deployer).mint(buyer.address, ethers.parseUnits("10000", 6));

    // Deploy Sale (beneficiary = beneficiary signer)
    const Sale = await ethers.getContractFactory("Sale");
    const rate = 25_000; // $0.025 per FVC, 6 decimals
    const cap = ethers.parseUnits("1000000", 6); // 1,000,000 stable
    sale = await Sale.deploy(await fvc.getAddress(), beneficiary.address, rate, cap);
    await sale.waitForDeployment();

    // Grant MINTER_ROLE to sale contract
    const MINTER_ROLE = await fvc.getMinterRole();
    await fvc.connect(deployer).grantRole(MINTER_ROLE, await sale.getAddress());

    // Accept USDC and USDT
    await sale.connect(deployer).setAcceptedToken(await usdc.getAddress(), true);
    await sale.connect(deployer).setAcceptedToken(await usdt.getAddress(), true);

    // Activate sale
    await sale.connect(deployer).setActive(true);

    // Deploy Staking: stakingToken = FVC, rewardsToken = USDC
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await fvc.getAddress(), await usdc.getAddress());
    await staking.waitForDeployment();
  });

  it("buys FVC with USDC, then stakes, earned is 0 before notify", async () => {
    // Buyer approves USDC to sale
    const usdcAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
    await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);

    // Buy FVC
    await expect(sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)).to.emit(
      sale,
      "TokensPurchased"
    );

    // Compute expected FVC amount
    const rate = await sale.rate(); // 25,000
    const fvcAmount = (usdcAmount * BigInt(1e18)) / rate;

    // Check balances: beneficiary received USDC, buyer received FVC
    expect(await usdc.balanceOf(beneficiary.address)).to.equal(usdcAmount);
    expect(await fvc.balanceOf(buyer.address)).to.equal(fvcAmount);

    // Stake FVC
    await fvc.connect(buyer).approve(await staking.getAddress(), fvcAmount);
    await expect(staking.connect(buyer).stake(fvcAmount)).to.emit(staking, "Staked");

    // Immediately, with no rewards notified, earned is 0
    const earned = await staking.earned(buyer.address);
    expect(earned).to.equal(0n);
  });
});
