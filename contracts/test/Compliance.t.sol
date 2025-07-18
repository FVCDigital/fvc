// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Compliance.sol";

contract ComplianceTest is Test {
    Compliance compliance;

    function setUp() public {
        compliance = new Compliance();
    }

    function testStub() public {
        assertTrue(address(compliance) != address(0));
    }
} 