// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Governance.sol";

contract GovernanceTest is Test {
    Governance gov;

    function setUp() public {
        gov = new Governance();
    }

    function testStub() public {
        assertTrue(address(gov) != address(0));
    }
} 