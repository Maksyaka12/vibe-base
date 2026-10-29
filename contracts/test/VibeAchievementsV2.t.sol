// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VibeAchievementsV2, IVibeCheckIn, IO1Staking} from "../src/VibeAchievementsV2.sol";

contract MockCheckIn is IVibeCheckIn {
    mapping(address => uint256) public longest;

    function setLongest(address a, uint256 l) external {
        longest[a] = l;
    }

    function getCheckInInfo(address user) external view returns (uint256, uint256, uint256, uint256, bool, uint256) {
        return (0, longest[user], 0, 0, true, 0);
    }
}

contract MockStaking is IO1Staking {
    mapping(bytes32 => mapping(address => uint64)) public lots;
    mapping(bytes32 => mapping(address => uint192)) public staked;
    bytes32 public broken;

    function set(bytes32 v, address a, uint64 l, uint192 s) external {
        lots[v][a] = l;
        staked[v][a] = s;
    }

    function setBroken(bytes32 v) external {
        broken = v;
    }

    function getUserState(bytes32 v, address a) external view returns (uint64, uint192, uint16) {
        require(v != broken, "broken vault");
        return (lots[v][a], staked[v][a], 0);
    }
}

contract VibeAchievementsV2Test is Test {
    MockCheckIn checkIn;
    MockStaking staking;
    VibeAchievementsV2 ach;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address agent = makeAddr("agent");
    bytes32[] vaults;

    function setUp() public {
        checkIn = new MockCheckIn();
        staking = new MockStaking();
        for (uint256 i; i < 6; ++i) vaults.push(keccak256(abi.encode("vault", i)));
        ach = new VibeAchievementsV2(owner, checkIn, staking, vaults);
    }

    function _joinVaults(address a, uint256 n) internal {
        for (uint256 i; i < n; ++i) staking.set(vaults[i], a, 1, 0); // deposited once, withdrawn since
    }

    // ───────────── conditions ─────────────

    function test_StreakAchievements() public {
        checkIn.setLongest(alice, 13);
        assertTrue(ach.isClaimable(alice, 1));
        assertFalse(ach.isClaimable(alice, 2));
        vm.prank(alice);
        ach.claim(1);
        assertEq(ach.balanceOf(alice, 1), 1);
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.NotEligible.selector, alice, 2));
        vm.prank(alice);
        ach.claim(2);
    }

    function test_VaultsJoinedCountsWithdrawnDeposits() public {
        _joinVaults(alice, 3);
        assertTrue(ach.isClaimable(alice, 4));
        assertTrue(ach.isClaimable(alice, 5));
        assertFalse(ach.isClaimable(alice, 6));
        (, uint256 joined,) = ach.progressOf(alice);
        assertEq(joined, 3);
    }

    function test_StakeInVaultUsesCurrentStake() public {
        staking.set(vaults[2], alice, 1, 6_000_000 ether);
        assertTrue(ach.isClaimable(alice, 7));
        assertFalse(ach.isClaimable(alice, 8));
        staking.set(vaults[2], alice, 1, 0); // withdrawn: no longer claimable
        assertFalse(ach.isClaimable(alice, 7));
    }

    function test_UnofficialVaultDoesNotCount() public {
        bytes32 other = keccak256("not official");
        staking.set(other, alice, 1, 20_000_000 ether);
        assertFalse(ach.isClaimable(alice, 4));
        assertFalse(ach.isClaimable(alice, 8));
    }

    function test_BrokenVaultIsSkipped() public {
        _joinVaults(alice, 2);
        staking.setBroken(vaults[0]);
        (, uint256 joined,) = ach.progressOf(alice);
        assertEq(joined, 1);
    }

    // ───────────── claiming ─────────────

    function test_ClaimForByAgentGoesToAccount() public {
        checkIn.setLongest(alice, 7);
        vm.prank(agent);
        ach.claimFor(alice, 1);
        assertEq(ach.balanceOf(alice, 1), 1);
        assertEq(ach.balanceOf(agent, 1), 0);
    }

    function test_NoDoubleClaim() public {
        checkIn.setLongest(alice, 7);
        ach.claimFor(alice, 1);
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.AlreadyClaimed.selector, alice, 1));
        ach.claimFor(alice, 1);
    }

    function test_ClaimAllForClaimsOnlyEarnedOnes() public {
        checkIn.setLongest(alice, 30);
        _joinVaults(alice, 1);
        vm.prank(agent);
        uint256 n = ach.claimAllFor(alice);
        assertEq(n, 4); // streak 1,2,3 + novice staker
        assertEq(ach.totalClaims(), 4);
        assertEq(ach.claimAllFor(alice), 0); // nothing left, no revert
        (uint256[] memory ids, bool[] memory claimed, bool[] memory claimable) = ach.statusOf(alice);
        assertEq(ids.length, 8);
        assertTrue(claimed[0] && claimed[3]);
        assertFalse(claimed[4] || claimable[4]);
    }

    function test_InactiveAndUnknown() public {
        checkIn.setLongest(alice, 7);
        vm.prank(owner);
        ach.setAchievement(1, VibeAchievementsV2.Kind.Streak, 7, false, "STARTER DOG", "");
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.AchievementInactive.selector, 1));
        ach.claimFor(alice, 1);
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.UnknownAchievement.selector, 99));
        ach.claimFor(alice, 99);
    }

    // ───────────── soulbound ─────────────

    function test_Soulbound() public {
        checkIn.setLongest(alice, 7);
        ach.claimFor(alice, 1);
        vm.startPrank(alice);
        vm.expectRevert(VibeAchievementsV2.Soulbound.selector);
        ach.safeTransferFrom(alice, agent, 1, 1, "");
        vm.expectRevert(VibeAchievementsV2.Soulbound.selector);
        ach.safeTransferFrom(address(0), agent, 1, 1, ""); // the old contract minted through this
        vm.expectRevert(VibeAchievementsV2.Soulbound.selector);
        ach.setApprovalForAll(agent, true);
        vm.stopPrank();
        assertEq(ach.balanceOf(agent, 1), 0);
    }

    // ───────────── admin ─────────────

    function test_GrantManualAndOnlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        ach.grant(alice, 8);

        vm.prank(owner);
        ach.grant(alice, 8); // past large deposit, already withdrawn
        assertEq(ach.balanceOf(alice, 8), 1);
    }

    function test_ManualKindCannotBeSelfClaimed() public {
        vm.prank(owner);
        ach.setAchievement(9, VibeAchievementsV2.Kind.Manual, 0, true, "OG", "ipfs://og");
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.NotEligible.selector, alice, 9));
        ach.claimFor(alice, 9);
        vm.prank(owner);
        ach.grant(alice, 9);
        assertEq(ach.balanceOf(alice, 9), 1);
        assertEq(ach.achievementCount(), 9);
    }

    function test_VaultManagement() public {
        bytes32 v7 = keccak256("vault 7");
        vm.startPrank(owner);
        ach.addVault(v7);
        vm.expectRevert(abi.encodeWithSelector(VibeAchievementsV2.VaultExists.selector, v7));
        ach.addVault(v7);
        ach.removeVault(vaults[0]);
        vm.stopPrank();
        assertEq(ach.vaultCount(), 6);
        assertFalse(ach.isVault(vaults[0]));
        assertTrue(ach.isVault(v7));
    }

    function testFuzz_StreakThreshold(uint256 longest) public {
        longest = bound(longest, 0, 365);
        checkIn.setLongest(alice, longest);
        assertEq(ach.isClaimable(alice, 1), longest >= 7);
        assertEq(ach.isClaimable(alice, 3), longest >= 30);
    }
}
