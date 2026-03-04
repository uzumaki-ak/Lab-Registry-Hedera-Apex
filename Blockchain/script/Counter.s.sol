// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {LabRegistry} from "../contracts/LabRegistry.sol";

contract LabRegistryScript is Script {
    function run() external {
        vm.startBroadcast();
        new LabRegistry(0x569f7b65538786c858329b0fE855afcBdf5572E0);
        vm.stopBroadcast();
    }
}
