// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {VibeAchievementsV2, IVibeCheckIn, IO1Staking} from "../src/VibeAchievementsV2.sol";

/// Real check-in and o1 staking contracts on a Base fork:
///   forge test --match-contract AchievementsFork --fork-url <base rpc>
contract VibeAchievementsV2AchievementsForkTest is Test {
    IVibeCheckIn constant CHECK_IN = IVibeCheckIn(0x1938BA215ef556e51eE6AaF909e0970AE0167634);
    IO1Staking constant STAKING = IO1Staking(0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4);
    address constant ADMIN = 0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a; // deposited into staking epochs 1-6

    function _vaults() internal pure returns (bytes32[] memory v) {
        v = new bytes32[](6);
        v[0] = 0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663;
        v[1] = 0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446;
        v[2] = 0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c;
        v[3] = 0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9;
        v[4] = 0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713;
        v[5] = 0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08;
    }

    function test_RealSources() public {
        if (block.chainid != 8453) return;
        VibeAchievementsV2 ach = new VibeAchievementsV2(ADMIN, CHECK_IN, STAKING, _vaults());

        (uint256 longest, uint256 joined, uint256 largest) = ach.progressOf(ADMIN);
        emit log_named_uint("longest streak", longest);
        emit log_named_uint("vaults joined", joined);
        emit log_named_uint("largest current stake", largest);
        assertEq(joined, 6, "deposited into all six vaults");

        // the staking badges for 1/3/5 vaults are earned; the agent claims them for the wallet
        uint256 claimed = ach.claimAllFor(ADMIN);
        assertGe(claimed, 3);
        assertEq(ach.balanceOf(ADMIN, 4), 1);
        assertEq(ach.balanceOf(ADMIN, 5), 1);
        assertEq(ach.balanceOf(ADMIN, 6), 1);
        assertEq(ach.balanceOf(ADMIN, 8), 0, "no 10M stake right now");
    }
}
