import { ethers } from "hardhat";
import { expect } from "chai";

describe("FVC Token", function () {
  let fvc: any;
  let admin: any;
  let user: any;
  let burner: any;

  beforeEach(async () => {
    [admin, user, burner] = await ethers.getSigners();
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(admin.address);
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

  it("admin should have BURNER_ROLE", async () => {
    const role = await fvc.BURNER_ROLE();
    expect(await fvc.hasRole(role, admin.address)).to.be.true;
  });

  it("should mint tokens by minter", async () => {
    await fvc.mint(user.address, 1000);
    expect(await fvc.balanceOf(user.address)).to.equal(1000);
  });

  it("should fail mint by non-minter", async () => {
    await expect(fvc.connect(user).mint(user.address, 1000)).to.be.reverted;
  });

  it("burner can burn their own tokens", async () => {
    await fvc.mint(admin.address, ethers.parseEther("1000"));
    const before = await fvc.totalSupply();
    await fvc.burn(ethers.parseEther("100"));
    expect(await fvc.totalSupply()).to.equal(before - ethers.parseEther("100"));
    expect(await fvc.balanceOf(admin.address)).to.equal(ethers.parseEther("900"));
  });

  it("non-burner cannot burn", async () => {
    await fvc.mint(user.address, ethers.parseEther("100"));
    await expect(fvc.connect(user).burn(ethers.parseEther("100"))).to.be.reverted;
  });

  it("burner can burnFrom with allowance", async () => {
    await fvc.mint(user.address, ethers.parseEther("1000"));
    await fvc.connect(user).approve(admin.address, ethers.parseEther("200"));
    const before = await fvc.totalSupply();
    await fvc.burnFrom(user.address, ethers.parseEther("200"));
    expect(await fvc.totalSupply()).to.equal(before - ethers.parseEther("200"));
    expect(await fvc.balanceOf(user.address)).to.equal(ethers.parseEther("800"));
  });

  it("burnFrom reverts without sufficient allowance", async () => {
    await fvc.mint(user.address, ethers.parseEther("1000"));
    await expect(fvc.burnFrom(user.address, ethers.parseEther("100"))).to.be.reverted;
  });

  it("non-burner cannot burnFrom", async () => {
    await fvc.mint(user.address, ethers.parseEther("100"));
    await fvc.connect(user).approve(burner.address, ethers.parseEther("100"));
    await expect(fvc.connect(burner).burnFrom(user.address, ethers.parseEther("100"))).to.be.reverted;
  });

  it("supportsInterface returns true for AccessControl", async () => {
    expect(await fvc.supportsInterface("0x7965db0b")).to.be.true;
  });

  it("cannot mint beyond 1B cap", async () => {
    await expect(
      fvc.mint(user.address, ethers.parseEther("1000000001"))
    ).to.be.reverted;
  });

  it("constructor reverts with zero admin", async () => {
    const FVC = await ethers.getContractFactory("FVC");
    await expect(FVC.deploy(ethers.ZeroAddress)).to.be.reverted;
  });
});
