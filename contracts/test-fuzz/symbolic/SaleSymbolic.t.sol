// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {FVC} from "../../src/core/FVC.sol";
import {Sale} from "../../src/sale/Sale.sol";
import {Vesting} from "../../src/vesting/Vesting.sol";
import {MockStable} from "../../src/mocks/MockStable.sol";

/// @dev Halmos proofs (check_*). forge test skips these. Proven on every weekly run;
///      a failure here fails CI.
contract SaleSymbolic is Test {
    FVC internal fvc;
    Sale internal sale;
    Vesting internal vesting;
    MockStable internal usdc;

    address internal constant TREASURY = address(0x7EA5);
    address internal constant BUYER = address(0xB0B);
    uint256 internal constant RATE = 30_000;
    uint256 internal constant CAP = 100_000_000 * 1e6;

    function setUp() public {
        fvc = new FVC(address(this));
        sale = new Sale(address(fvc), TREASURY, RATE, CAP, address(0));
        vesting = new Vesting(address(fvc));
        vesting.transferOwnership(address(sale));
        usdc = new MockStable("USD Coin", "USDC", 6);
        fvc.grantRole(fvc.MINTER_ROLE(), address(sale));

        // Sale hands ownership to the beneficiary in its constructor
        vm.startPrank(TREASURY);
        sale.setAcceptedToken(address(usdc), true, 6);
        sale.setVestingConfig(address(vesting), 0, 365 days, 730 days);
        sale.setActive(true);
        vm.stopPrank();
    }

    /// A purchase moves exactly `amount` to the treasury, raises by exactly `amount`,
    /// vests exactly amount * 1e18 / rate FVC, and never breaches the cap.
    function check_buyAccounting(uint256 amount) public {
        vm.assume(amount > 0 && amount <= CAP);
        usdc.mint(BUYER, amount);

        vm.startPrank(BUYER);
        usdc.approve(address(sale), amount);
        sale.buy(address(usdc), amount);
        vm.stopPrank();

        uint256 expectedFvc = (amount * 1e18) / RATE;
        (uint256 totalAmount,,,,,) = vesting.schedules(BUYER, 0);

        assert(usdc.balanceOf(TREASURY) == amount);
        assert(usdc.balanceOf(address(sale)) == 0);
        assert(sale.raised() == amount);
        assert(sale.raised() <= sale.cap());
        assert(totalAmount == expectedFvc);
        assert(fvc.balanceOf(address(vesting)) == expectedFvc);
        assert(fvc.balanceOf(address(sale)) == 0);
    }

    /// A purchase that would push raised past the cap always reverts.
    function check_buyOverCapReverts(uint256 first, uint256 second) public {
        vm.assume(first > 0 && first <= CAP);
        vm.assume(second > 0 && second <= CAP);
        vm.assume(first + second > CAP);
        usdc.mint(BUYER, first + second);

        vm.startPrank(BUYER);
        usdc.approve(address(sale), first + second);
        sale.buy(address(usdc), first);
        try sale.buy(address(usdc), second) {
            assert(false);
        } catch {}
        vm.stopPrank();

        assert(sale.raised() == first);
    }
}
