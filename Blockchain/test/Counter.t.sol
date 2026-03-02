// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {LabRegistry} from "../contracts/LabRegistry.sol";

contract LabRegistryTest is Test {
    LabRegistry public registry;

    function setUp() public {
        registry = new LabRegistry();
    }

    function test_RegistryExists() public {
        assertEq(address(registry) != address(0), true);
    }
}