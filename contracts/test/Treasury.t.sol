// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Treasury.sol";

contract TreasuryTest is Test {
    Treasury treasury;

    function setUp() public {
        treasury = new Treasury();
    }

    function testStub() public {
        assertTrue(address(treasury) != address(0));
    }
} 