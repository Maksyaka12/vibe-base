// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VibeRewardsDistributor} from "../src/VibeRewardsDistributor.sol";

/// Deploys one VibeRewardsDistributor (run it twice: holder rewards and Vibe Club royalties).
///   OWNER=0x... forge script script/DeployRewardsDistributor.s.sol --rpc-url base --broadcast --verify --account <keystore>
contract DeployRewardsDistributor is Script {
    IERC20 constant VIBE = IERC20(0xb200000000000000000000DF24eCb8bF51100a01);

    function run() external returns (VibeRewardsDistributor dist) {
        address owner = vm.envAddress("OWNER");
        vm.startBroadcast();
        dist = new VibeRewardsDistributor(VIBE, owner);
        vm.stopBroadcast();
        console.log("VibeRewardsDistributor:", address(dist));
        console.log("owner:", owner);
    }
}
