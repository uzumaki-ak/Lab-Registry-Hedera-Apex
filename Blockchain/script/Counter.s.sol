// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {LabRegistry} from "../contracts/LabRegistry.sol";

contract LabRegistryScript is Script {
    function run() external {
        vm.startBroadcast();
        new LabRegistry();
        vm.stopBroadcast();
    }
}
