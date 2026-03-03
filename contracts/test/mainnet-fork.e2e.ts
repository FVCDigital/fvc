/**
 * Mainnet-fork end-to-end test
 *
 * Forks Ethereum mainnet at the current block and exercises the live deployed
 * contracts exactly as a real investor would.
 *
 * Run:
 *   FORK=1 npx hardhat test test/mainnet-fork.e2e.ts --network hardhat
 *
 * Requires ETHEREUM_MAINNET_RPC in contracts/.env
 */

import { expect } from "chai";
import { ethers } from "hardhat";

const FVC_ADDRESS     = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
const SALE_ADDRESS    = "0x0E99482aaA074C72756b78eDbdCA61E438729c54";
const VESTING_ADDRESS = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const TREASURY        = "0xE20c89da2138951655DbbbE6E6db01fe561EBe82";
const USDC            = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT            = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// A known USDC whale on mainnet (Circle's reserve address — always has USDC)
const USDC_WHALE = "0x37305B1cD40574E4C5Ce33f8e8306Be057fD7341";
const USDT_WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";

const CLIFF    = 365 * 24 * 60 * 60;
const DURATION = 730 * 24 * 60 * 60;

describe("Mainnet Fork — FVC Sale E2E", function () {
  this.timeout(120_000);

  let sale: any;
  let vesting: any;
  let fvc: any;
  let usdc: any;
  let usdt: any;
  let treasury: any;
  let buyer: any;

  before(async function () {
    if (!process.env.FORK) {
      console.log("  Skipping mainnet fork test (set FORK=1 to run)");
      this.skip();
    }

    [buyer] = await ethers.getSigners();

    const saleArtifact    = await ethers.getContractFactory("Sale");
    const vestingArtifact = await ethers.getContractFactory("Vesting");
    const fvcArtifact     = await ethers.getContractFactory("FVC");

    sale    = saleArtifact.attach(SALE_ADDRESS);
    vesting = vestingArtifact.attach(VESTING_ADDRESS);
    fvc     = fvcArtifact.attach(FVC_ADDRESS);

    const erc20Abi = [
      "function balanceOf(address) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
    ];
    usdc = new ethers.Contract(USDC, erc20Abi, ethers.provider);
    usdt = new ethers.Contract(USDT, erc20Abi, ethers.provider);

    // Impersonate Treasury to run config txs
    await ethers.provider.send("hardhat_impersonateAccount", [TREASURY]);
    await ethers.provider.send("hardhat_setBalance", [TREASURY, ethers.toBeHex(ethers.parseEther("10"))]);
    treasury = await ethers.getSigner(TREASURY);

    // Impersonate USDC whale to fund buyer
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, ethers.toBeHex(ethers.parseEther("1"))]);
    const whale = await ethers.getSigner(USDC_WHALE);
    await usdc.connect(whale).transfer(buyer.address, ethers.parseUnits("1000", 6)); // $1,000 USDC

    // Impersonate USDT whale to fund buyer
    await ethers.provider.send("hardhat_impersonateAccount", [USDT_WHALE]);
    await ethers.provider.send("hardhat_setBalance", [USDT_WHALE, ethers.toBeHex(ethers.parseEther("1"))]);
    const usdtWhale = await ethers.getSigner(USDT_WHALE);
    await usdt.connect(usdtWhale).transfer(buyer.address, ethers.parseUnits("1000", 6));
  });

  // ── Step 1: Verify pre-config state ──────────────────────────────────────

  it("contracts are deployed with correct ownership", async function () {
    expect(await sale.owner()).to.equal(TREASURY);
    // Vesting ownership transferred to Sale by deployer — confirmed on-chain
    expect(await vesting.owner()).to.equal(SALE_ADDRESS);
    expect(await fvc.hasRole(await fvc.MINTER_ROLE(), SALE_ADDRESS)).to.be.true;
    // DEFAULT_ADMIN_ROLE granted to Treasury by deployer — confirmed on-chain
    expect(await fvc.hasRole(await fvc.DEFAULT_ADMIN_ROLE(), TREASURY)).to.be.true;
  });

  it("sale is not yet active before config batch", async function () {
    expect(await sale.active()).to.be.false;
  });

  // ── Step 2: Execute Safe config batch ────────────────────────────────────

  it("Treasury can setAcceptedToken USDC", async function () {
    await expect(sale.connect(treasury).setAcceptedToken(USDC, true, 6)).to.not.be.reverted;
    expect(await sale.isAccepted(USDC)).to.be.true;
  });

  it("Treasury can setAcceptedToken USDT", async function () {
    await expect(sale.connect(treasury).setAcceptedToken(USDT, true, 6)).to.not.be.reverted;
    expect(await sale.isAccepted(USDT)).to.be.true;
  });

  it("Treasury can setEthUsdRate", async function () {
    const rate = ethers.parseUnits("2000", 6);
    await expect(sale.connect(treasury).setEthUsdRate(rate)).to.not.be.reverted;
    expect(await sale.ethUsdRate()).to.equal(rate);
  });

  it("Treasury can setVestingConfig", async function () {
    await expect(
      sale.connect(treasury).setVestingConfig(VESTING_ADDRESS, 0n, BigInt(CLIFF), BigInt(DURATION))
    ).to.not.be.reverted;
    expect(await sale.vestingContract()).to.equal(VESTING_ADDRESS);
    expect(await sale.vestingThreshold()).to.equal(0n);
    expect(await sale.defaultCliff()).to.equal(BigInt(CLIFF));
    expect(await sale.defaultDuration()).to.equal(BigInt(DURATION));
  });

  it("Treasury can setActive(true)", async function () {
    await expect(sale.connect(treasury).setActive(true)).to.not.be.reverted;
    expect(await sale.active()).to.be.true;
  });

  // ── Step 3: USDC purchase ─────────────────────────────────────────────────

  it("buyer can purchase FVC with USDC — vesting schedule created", async function () {
    const purchaseAmount = ethers.parseUnits("100", 6); // $100 USDC
    const expectedFvc = ethers.parseUnits("100", 18) * 1_000_000n / 30_000n; // $100 / $0.03

    await usdc.connect(buyer).approve(SALE_ADDRESS, purchaseAmount);

    const countBefore = await vesting.scheduleCount(buyer.address);

    await expect(sale.connect(buyer).buy(USDC, purchaseAmount))
      .to.emit(sale, "TokensPurchasedWithVesting");

    const countAfter = await vesting.scheduleCount(buyer.address);
    expect(countAfter).to.equal(countBefore + 1n);

    // getVestingSchedule tuple: [0]=totalAmount [1]=released [2]=startTime [3]=cliff [4]=duration [5]=revoked [6]=releasable
    const scheduleId = countAfter - 1n;
    const s = await vesting.getVestingSchedule(buyer.address, scheduleId);
    expect(s[0]).to.equal(expectedFvc);       // totalAmount
    expect(s[3]).to.equal(BigInt(CLIFF));     // cliff
    expect(s[4]).to.equal(BigInt(DURATION));  // duration
    expect(s[5]).to.be.false;                 // revoked
  });

  it("nothing is releasable before cliff", async function () {
    const count = await vesting.scheduleCount(buyer.address);
    const releasable = await vesting.releasableAmount(buyer.address, count - 1n);
    expect(releasable).to.equal(0n);
  });

  // ── Step 4: USDT purchase ─────────────────────────────────────────────────

  it("buyer can purchase FVC with USDT", async function () {
    const purchaseAmount = ethers.parseUnits("50", 6); // $50 USDT
    const expectedFvc = ethers.parseUnits("50", 18) * 1_000_000n / 30_000n;

    await usdt.connect(buyer).approve(SALE_ADDRESS, purchaseAmount);

    const countBefore = await vesting.scheduleCount(buyer.address);
    await expect(sale.connect(buyer).buy(USDT, purchaseAmount)).to.not.be.reverted;
    const countAfter = await vesting.scheduleCount(buyer.address);
    expect(countAfter).to.equal(countBefore + 1n);

    const s = await vesting.getVestingSchedule(buyer.address, countAfter - 1n);
    expect(s[0]).to.equal(expectedFvc); // totalAmount
  });

  // ── Step 5: ETH purchase ──────────────────────────────────────────────────

  it("buyer can purchase FVC with ETH", async function () {
    const ethAmount = ethers.parseEther("0.1");
    const countBefore = await vesting.scheduleCount(buyer.address);

    await expect(sale.connect(buyer).buyWithETH({ value: ethAmount })).to.not.be.reverted;

    const countAfter = await vesting.scheduleCount(buyer.address);
    expect(countAfter).to.equal(countBefore + 1n);

    const s = await vesting.getVestingSchedule(buyer.address, countAfter - 1n);
    // 0.1 ETH * ~$2000 (Chainlink or fallback) / $0.03 = ~6666 FVC
    expect(s[0]).to.be.gt(ethers.parseEther("3000"));  // totalAmount
    expect(s[0]).to.be.lt(ethers.parseEther("20000"));
  });

  // ── Step 6: Vesting release after cliff ───────────────────────────────────

  it("tokens vest linearly after cliff and are releasable", async function () {
    const scheduleId = 0n; // first USDC purchase

    const s = await vesting.getVestingSchedule(buyer.address, scheduleId);
    // s[2] = startTime (BigInt), convert carefully
    const startTime = Number(s[2]);
    const halfwayPoint = startTime + CLIFF + Math.floor((DURATION - CLIFF) / 2);

    await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayPoint]);
    await ethers.provider.send("evm_mine", []);

    const releasable = await vesting.releasableAmount(buyer.address, scheduleId);
    expect(releasable).to.be.gt(0n);
    expect(releasable).to.be.lt(s[0]); // less than totalAmount

    await expect(vesting.connect(buyer).release(scheduleId))
      .to.emit(vesting, "TokensReleased");

    const fvcBalance = await fvc.balanceOf(buyer.address);
    expect(fvcBalance).to.be.gt(0n);
  });

  it("full amount releasable after full duration", async function () {
    const scheduleId = 0n;
    const s = await vesting.getVestingSchedule(buyer.address, scheduleId);
    const startTime = Number(s[2]); // s[2] = startTime
    const endTime = startTime + DURATION + 1;

    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime]);
    await ethers.provider.send("evm_mine", []);

    const releasable = await vesting.releasableAmount(buyer.address, scheduleId);
    const alreadyReleased = s[1]; // s[1] = released
    expect(releasable + alreadyReleased).to.equal(s[0]); // s[0] = totalAmount
  });

  // ── Step 7: Access control ────────────────────────────────────────────────

  it("non-owner cannot call setActive", async function () {
    await expect(sale.connect(buyer).setActive(false))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("non-owner cannot call setAcceptedToken", async function () {
    await expect(sale.connect(buyer).setAcceptedToken(USDC, false, 6))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("rejected token cannot be used to buy", async function () {
    const randomToken = ethers.Wallet.createRandom().address;
    await expect(sale.connect(buyer).buy(randomToken, ethers.parseUnits("10", 6)))
      .to.be.reverted;
  });
});
