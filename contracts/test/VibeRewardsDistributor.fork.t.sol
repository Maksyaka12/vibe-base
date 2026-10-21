// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VibeRewardsDistributor} from "../src/VibeRewardsDistributor.sol";

/// Runs against a Base mainnet fork with the real $VIBE token:
///   forge test --match-contract Fork --fork-url <base rpc>
/// Skipped when no fork is active.
contract VibeRewardsDistributorForkTest is Test {
    IERC20 constant VIBE = IERC20(0xb200000000000000000000DF24eCb8bF51100a01);
    address constant ROYALTY_V1 = 0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1; // holds real $VIBE

    function test_RealVibeTokenClaim() public {
        if (block.chainid != 8453) return;
        string memory json = vm.readFile("./test/fixtures/royalty6.json");
        bytes32 root = vm.parseJsonBytes32(json, ".root");
        uint256 pool = vm.parseJsonUint(json, ".pool");
        address account = vm.parseJsonAddressArray(json, ".accounts")[0];
        uint256 amount = vm.parseUint(vm.parseJsonStringArray(json, ".amounts")[0]);
        bytes32[] memory proof = vm.parseJsonBytes32Array(json, ".proof0");

        address owner = makeAddr("owner");
        VibeRewardsDistributor dist = new VibeRewardsDistributor(VIBE, owner);
        vm.prank(owner);
        dist.openRound(6, root, uint128(pool), uint64(block.timestamp), uint64(block.timestamp + 10 days));

        // fund with real tokens taken from a wallet that holds them
        vm.prank(ROYALTY_V1);
        VIBE.transfer(address(dist), amount);

        uint256 before = VIBE.balanceOf(account);
        dist.claimFor(account, 6, amount, proof);
        assertEq(VIBE.balanceOf(account) - before, amount, "real $VIBE reached the account");
        assertEq(VIBE.balanceOf(address(dist)), 0);
    }
}
