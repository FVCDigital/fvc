// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {FVC} from "../src/core/FVC.sol";
import {Sale} from "../src/sale/Sale.sol";
import {Vesting} from "../src/vesting/Vesting.sol";
import {MockStable} from "../src/mocks/MockStable.sol";

/// @dev Sale owner (treasury) driving purchases and admin calls with clamped random input.
contract SaleHandler is Test {
    Sale public immutable sale;
    FVC public immutable fvc;
    MockStable public immutable usdc;
    Vesting public immutable vesting;

    address public immutable treasury;
    address[3] public actors;

    uint256 public ghostBuyRaised;

    uint256 internal constant RATE = 30_000; // 0.03 USD (6 dec) per 1 FVC
    uint256 internal constant INITIAL_CAP = 100_000_000 * 1e6;

    constructor() {
        treasury = address(this);
        actors[0] = address(0xA11CE);
        actors[1] = address(0xB0B);
        actors[2] = address(0xC0FFEE);

        fvc = new FVC(address(this));
        sale = new Sale(address(fvc), treasury, RATE, INITIAL_CAP, address(0));
        vesting = new Vesting(address(fvc));
        vesting.transferOwnership(address(sale));

        usdc = new MockStable("USD Coin", "USDC", 6);
        fvc.grantRole(fvc.MINTER_ROLE(), address(sale));

        sale.setAcceptedToken(address(usdc), true, 6);
        sale.setVestingConfig(address(vesting), 0, 365 days, 730 days);
        sale.setActive(true);

        for (uint256 i = 0; i < 3; i++) {
            usdc.mint(actors[i], 10_000_000 * 1e6);
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % 3];
    }

    function buy(uint256 actorSeed, uint256 amount) external {
        address actor = _actor(actorSeed);
        amount = bound(amount, 1, 2_000_000 * 1e6);

        vm.startPrank(actor);
        usdc.approve(address(sale), amount);
        uint256 raisedBefore = sale.raised();
        try sale.buy(address(usdc), amount) {
            ghostBuyRaised += sale.raised() - raisedBefore;
        } catch {}
        vm.stopPrank();
    }

    function setCap(uint256 newCap) external {
        newCap = bound(newCap, 1, INITIAL_CAP * 2);
        try sale.setCap(newCap) {} catch {}
    }

    function setAllowlist(uint256 actorSeed, uint256 maxUsd) external {
        maxUsd = bound(maxUsd, 1e6, 5_000_000 * 1e6);
        try sale.setInvestorTerms(_actor(actorSeed), maxUsd, 0, 365 days, 730 days) {} catch {}
    }

    function mintOtc(uint256 actorSeed, uint256 fvcAmount) external {
        fvcAmount = bound(fvcAmount, 1e18, 500_000 ether);
        try sale.mintOTC(_actor(actorSeed), fvcAmount, 365 days, 730 days) {} catch {}
    }

    function setActive(bool on) external {
        try sale.setActive(on) {} catch {}
    }

    // ============ PROPERTIES ============

    /// raised must never exceed cap.
    function prop_raisedNeverExceedsCap() public view returns (bool) {
        return sale.raised() <= sale.cap();
    }

    /// Only buy/buyWithETH increment raised; ghost tracker must match.
    function prop_raisedMatchesBuyGhost() public view returns (bool) {
        return sale.raised() == ghostBuyRaised;
    }

    /// Allowlisted investors must not exceed their per-wallet USD cap.
    function prop_allowlistSpentWithinMax() public view returns (bool) {
        for (uint256 i = 0; i < 3; i++) {
            (uint256 maxAmount,,,, uint256 spent, bool termsActive) = sale.investorTerms(actors[i]);
            if (termsActive && maxAmount > 0 && spent > maxAmount) return false;
        }
        return true;
    }

    /// Sale must not custody FVC after operations (mints go to vesting or buyer).
    function prop_saleHoldsNoFvc() public view returns (bool) {
        return fvc.balanceOf(address(sale)) == 0;
    }

    /// Sale must not custody USDC (payments forwarded to treasury).
    function prop_saleHoldsNoUsdc() public view returns (bool) {
        return usdc.balanceOf(address(sale)) == 0;
    }

    /// Vesting solvency when sale is owner (production-like wiring).
    function prop_vestingSolvent() public view returns (bool) {
        return vesting.totalVesting() <= fvc.balanceOf(address(vesting));
    }
}

contract SaleInvariants is Test {
    SaleHandler internal handler;

    function setUp() public {
        handler = new SaleHandler();
        targetContract(address(handler));
    }

    function invariant_A_raisedNeverExceedsCap() public view {
        assertTrue(handler.prop_raisedNeverExceedsCap(), "raised exceeds cap");
    }

    function invariant_B_raisedMatchesBuyGhost() public view {
        assertTrue(handler.prop_raisedMatchesBuyGhost(), "raised does not match buy ghost");
    }

    function invariant_C_allowlistSpentWithinMax() public view {
        assertTrue(handler.prop_allowlistSpentWithinMax(), "allowlist spent exceeds max");
    }

    function invariant_D_saleHoldsNoFvc() public view {
        assertTrue(handler.prop_saleHoldsNoFvc(), "sale holds FVC");
    }

    function invariant_E_saleHoldsNoUsdc() public view {
        assertTrue(handler.prop_saleHoldsNoUsdc(), "sale holds USDC");
    }

    function invariant_F_vestingSolvent() public view {
        assertTrue(handler.prop_vestingSolvent(), "vesting insolvent");
    }
}
