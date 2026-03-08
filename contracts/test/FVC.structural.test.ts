import { ethers } from "hardhat";
import { expect } from "chai";

/**
 * FVC Token — structural + mutation test suite
 *
 * Covers every branch and boundary in FVC.sol that fvc.test.ts (spec only) leaves open:
 *   - Cap exact boundaries (cap-1, cap, cap+1)
 *   - Role revocation blocks mint and burn
 *   - DEFAULT_ADMIN_ROLE can grant/revoke roles
 *   - Non-admin cannot grant roles
 *   - burnFrom allowance exact boundary
 *   - supportsInterface for ERC20 and ERC165
 *   - Transfer and approval are standard ERC20 (no custom overrides)
 *
 * Mutation guards (labelled F01–F08) kill the following mutations:
 *   F01 — remove cap check: mint beyond 1B must revert
 *   F02 — remove MINTER_ROLE gate: non-minter mint must revert
 *   F03 — remove BURNER_ROLE gate on burn: non-burner burn must revert
 *   F04 — remove BURNER_ROLE gate on burnFrom: non-burner burnFrom must revert
 *   F05 — swap MINTER_ROLE and BURNER_ROLE constants: roles must be distinct
 *   F06 — remove revokeRole effect: revoked minter must not mint
 *   F07 — remove revokeRole effect: revoked burner must not burn
 *   F08 — remove zero-admin guard in constructor: deploy with zero address must revert
 */

describe("FVC — structural + mutation coverage", function () {
  let fvc: any;
  let admin: any;
  let minter: any;
  let burner: any;
  let user: any;

  const CAP = ethers.parseEther("1000000000"); // 1 billion

  beforeEach(async () => {
    [admin, minter, burner, user] = await ethers.getSigners();
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(admin.address);
    await fvc.waitForDeployment();
  });

  // ── Constructor ──────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("sets name and symbol correctly", async () => {
      expect(await fvc.name()).to.equal("First Venture Capital");
      expect(await fvc.symbol()).to.equal("FVC");
    });

    it("sets cap to exactly 1 billion FVC (kills F01)", async () => {
      expect(await fvc.cap()).to.equal(CAP);
    });

    it("grants DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE to admin", async () => {
      expect(await fvc.hasRole(await fvc.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await fvc.hasRole(await fvc.MINTER_ROLE(), admin.address)).to.be.true;
      expect(await fvc.hasRole(await fvc.BURNER_ROLE(), admin.address)).to.be.true;
    });

    it("reverts with zero admin address (kills F08)", async () => {
      const FVC = await ethers.getContractFactory("FVC");
      await expect(FVC.deploy(ethers.ZeroAddress)).to.be.reverted;
    });

    it("MINTER_ROLE and BURNER_ROLE are distinct constants (kills F05)", async () => {
      expect(await fvc.MINTER_ROLE()).to.not.equal(await fvc.BURNER_ROLE());
    });

    it("initial total supply is zero", async () => {
      expect(await fvc.totalSupply()).to.equal(0n);
    });
  });

  // ── Cap boundary (kills F01) ─────────────────────────────────────────────

  describe("cap boundary exactness (kills F01)", () => {
    it("mints cap - 1 wei successfully", async () => {
      await fvc.mint(user.address, CAP - 1n);
      expect(await fvc.totalSupply()).to.equal(CAP - 1n);
    });

    it("mints exactly cap successfully", async () => {
      await fvc.mint(user.address, CAP);
      expect(await fvc.totalSupply()).to.equal(CAP);
    });

    it("reverts when minting cap + 1 wei", async () => {
      await expect(fvc.mint(user.address, CAP + 1n)).to.be.reverted;
    });

    it("reverts when cumulative mints exceed cap", async () => {
      await fvc.mint(user.address, CAP - 1n);
      await expect(fvc.mint(user.address, 2n)).to.be.reverted;
    });

    it("minting exactly remaining supply after partial mint succeeds", async () => {
      const partial = ethers.parseEther("500000000");
      await fvc.mint(user.address, partial);
      await fvc.mint(user.address, CAP - partial);
      expect(await fvc.totalSupply()).to.equal(CAP);
    });
  });

  // ── MINTER_ROLE access control (kills F02) ───────────────────────────────

  describe("mint() access control (kills F02)", () => {
    it("address without MINTER_ROLE cannot mint", async () => {
      await expect(fvc.connect(user).mint(user.address, 1n)).to.be.reverted;
    });

    it("granted minter can mint", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      await fvc.connect(minter).mint(user.address, ethers.parseEther("100"));
      expect(await fvc.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    });

    it("revoked minter cannot mint (kills F06)", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      await fvc.revokeRole(await fvc.MINTER_ROLE(), minter.address);
      await expect(fvc.connect(minter).mint(user.address, 1n)).to.be.reverted;
    });

    it("mint emits Transfer event from zero address", async () => {
      await expect(fvc.mint(user.address, ethers.parseEther("1")))
        .to.emit(fvc, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, ethers.parseEther("1"));
    });
  });

  // ── BURNER_ROLE access control on burn() (kills F03) ────────────────────

  describe("burn() access control (kills F03)", () => {
    beforeEach(async () => {
      await fvc.mint(admin.address, ethers.parseEther("1000"));
    });

    it("address without BURNER_ROLE cannot burn their own tokens", async () => {
      await fvc.mint(user.address, ethers.parseEther("100"));
      await expect(fvc.connect(user).burn(ethers.parseEther("100"))).to.be.reverted;
    });

    it("granted burner can burn their own tokens", async () => {
      await fvc.grantRole(await fvc.BURNER_ROLE(), burner.address);
      await fvc.mint(burner.address, ethers.parseEther("100"));
      await fvc.connect(burner).burn(ethers.parseEther("100"));
      expect(await fvc.balanceOf(burner.address)).to.equal(0n);
    });

    it("revoked burner cannot burn (kills F07)", async () => {
      await fvc.grantRole(await fvc.BURNER_ROLE(), burner.address);
      await fvc.mint(burner.address, ethers.parseEther("100"));
      await fvc.revokeRole(await fvc.BURNER_ROLE(), burner.address);
      await expect(fvc.connect(burner).burn(ethers.parseEther("100"))).to.be.reverted;
    });

    it("burn reduces totalSupply by exact amount", async () => {
      const before = await fvc.totalSupply();
      await fvc.burn(ethers.parseEther("100"));
      expect(await fvc.totalSupply()).to.equal(before - ethers.parseEther("100"));
    });

    it("burn emits Transfer event to zero address", async () => {
      await expect(fvc.burn(ethers.parseEther("1")))
        .to.emit(fvc, "Transfer")
        .withArgs(admin.address, ethers.ZeroAddress, ethers.parseEther("1"));
    });
  });

  // ── BURNER_ROLE access control on burnFrom() (kills F04) ────────────────

  describe("burnFrom() access control + allowance boundary (kills F04)", () => {
    const AMOUNT = ethers.parseEther("500");

    beforeEach(async () => {
      await fvc.mint(user.address, AMOUNT);
    });

    it("address without BURNER_ROLE cannot burnFrom", async () => {
      await fvc.connect(user).approve(burner.address, AMOUNT);
      await expect(fvc.connect(burner).burnFrom(user.address, AMOUNT)).to.be.reverted;
    });

    it("burnFrom reverts with zero allowance", async () => {
      await expect(fvc.burnFrom(user.address, AMOUNT)).to.be.reverted;
    });

    it("burnFrom reverts with allowance of amount - 1 (boundary)", async () => {
      await fvc.connect(user).approve(admin.address, AMOUNT - 1n);
      await expect(fvc.burnFrom(user.address, AMOUNT)).to.be.reverted;
    });

    it("burnFrom succeeds with allowance of exactly amount (boundary)", async () => {
      await fvc.connect(user).approve(admin.address, AMOUNT);
      await fvc.burnFrom(user.address, AMOUNT);
      expect(await fvc.balanceOf(user.address)).to.equal(0n);
    });

    it("burnFrom reduces allowance to zero after exact spend", async () => {
      await fvc.connect(user).approve(admin.address, AMOUNT);
      await fvc.burnFrom(user.address, AMOUNT);
      expect(await fvc.allowance(user.address, admin.address)).to.equal(0n);
    });

    it("burnFrom emits Transfer event to zero address", async () => {
      await fvc.connect(user).approve(admin.address, AMOUNT);
      await expect(fvc.burnFrom(user.address, AMOUNT))
        .to.emit(fvc, "Transfer")
        .withArgs(user.address, ethers.ZeroAddress, AMOUNT);
    });
  });

  // ── Role administration ──────────────────────────────────────────────────

  describe("role administration", () => {
    it("admin can grant MINTER_ROLE to a new address", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      expect(await fvc.hasRole(await fvc.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("admin can revoke MINTER_ROLE", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      await fvc.revokeRole(await fvc.MINTER_ROLE(), minter.address);
      expect(await fvc.hasRole(await fvc.MINTER_ROLE(), minter.address)).to.be.false;
    });

    it("non-admin cannot grant roles", async () => {
      await expect(
        fvc.connect(user).grantRole(await fvc.MINTER_ROLE(), user.address)
      ).to.be.reverted;
    });

    it("non-admin cannot revoke roles", async () => {
      await expect(
        fvc.connect(user).revokeRole(await fvc.MINTER_ROLE(), admin.address)
      ).to.be.reverted;
    });

    it("account can renounce its own role", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      await fvc.connect(minter).renounceRole(await fvc.MINTER_ROLE(), minter.address);
      expect(await fvc.hasRole(await fvc.MINTER_ROLE(), minter.address)).to.be.false;
    });

    it("having BURNER_ROLE does not grant MINTER_ROLE", async () => {
      await fvc.grantRole(await fvc.BURNER_ROLE(), burner.address);
      expect(await fvc.hasRole(await fvc.MINTER_ROLE(), burner.address)).to.be.false;
      await expect(fvc.connect(burner).mint(user.address, 1n)).to.be.reverted;
    });

    it("having MINTER_ROLE does not grant BURNER_ROLE", async () => {
      await fvc.grantRole(await fvc.MINTER_ROLE(), minter.address);
      await fvc.mint(minter.address, ethers.parseEther("100"));
      expect(await fvc.hasRole(await fvc.BURNER_ROLE(), minter.address)).to.be.false;
      await expect(fvc.connect(minter).burn(ethers.parseEther("100"))).to.be.reverted;
    });
  });

  // ── supportsInterface ────────────────────────────────────────────────────

  describe("supportsInterface", () => {
    it("returns true for IAccessControl (0x7965db0b)", async () => {
      expect(await fvc.supportsInterface("0x7965db0b")).to.be.true;
    });

    it("returns true for IERC165 (0x01ffc9a7)", async () => {
      expect(await fvc.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("returns false for unknown interface", async () => {
      expect(await fvc.supportsInterface("0xdeadbeef")).to.be.false;
    });
  });

  // ── Standard ERC20 behaviour ─────────────────────────────────────────────

  describe("ERC20 standard behaviour", () => {
    beforeEach(async () => {
      await fvc.mint(user.address, ethers.parseEther("1000"));
    });

    it("transfer moves tokens between accounts", async () => {
      await fvc.connect(user).transfer(minter.address, ethers.parseEther("100"));
      expect(await fvc.balanceOf(minter.address)).to.equal(ethers.parseEther("100"));
      expect(await fvc.balanceOf(user.address)).to.equal(ethers.parseEther("900"));
    });

    it("transfer reverts when balance insufficient", async () => {
      await expect(
        fvc.connect(user).transfer(minter.address, ethers.parseEther("1001"))
      ).to.be.reverted;
    });

    it("approve + transferFrom works correctly", async () => {
      await fvc.connect(user).approve(admin.address, ethers.parseEther("200"));
      await fvc.transferFrom(user.address, minter.address, ethers.parseEther("200"));
      expect(await fvc.balanceOf(minter.address)).to.equal(ethers.parseEther("200"));
    });

    it("transferFrom reverts without sufficient allowance", async () => {
      await expect(
        fvc.transferFrom(user.address, minter.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });

    it("decimals returns 18", async () => {
      expect(await fvc.decimals()).to.equal(18);
    });
  });
});
