import { ethers, upgrades } from "hardhat";
import { expect } from "chai";

describe("FVC Token", function () {
  let fvc: any;
  let admin: any;
  let user: any;

  beforeEach(async () => {
    [admin, user] = await ethers.getSigners();
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", admin.address], {
      initializer: "initialize"
    });
    await fvc.waitForDeployment();
  });

  it("should have correct name and symbol", async () => {
    expect(await fvc.name()).to.equal("First Venture Capital");
    expect(await fvc.symbol()).to.equal("FVC");
  });

  it("admin should have MINTER_ROLE", async () => {
    const role = await fvc.MINTER_ROLE();
    expect(await fvc.hasRole(role, admin.address)).to.be.true;
  });

  it("should mint tokens by minter", async () => {
    await fvc.mint(user.address, 1000);
    expect(await fvc.balanceOf(user.address)).to.equal(1000);
  });

  it("should fail mint by non-minter", async () => {
    await expect(fvc.connect(user).mint(user.address, 1000)).to.be.reverted;
  });
}); 