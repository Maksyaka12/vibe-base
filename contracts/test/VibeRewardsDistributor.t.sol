// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VibeRewardsDistributor} from "../src/VibeRewardsDistributor.sol";

contract MockVibe is ERC20 {
    constructor() ERC20("Vibe", "VIBE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract VibeRewardsDistributorTest is Test {
    MockVibe token;
    VibeRewardsDistributor dist;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address agent = makeAddr("agent");

    uint64 constant START = 1_800_000_000; // claim opens
    uint64 constant END = START + 30 days; // claim closes (exclusive)

    // small 3-leaf tree built like the Vibe Hub snapshot tool: sorted pairs, odd node carried up
    bytes32 rootSmall;
    bytes32 leafA;
    bytes32 leafB;
    bytes32 leafC;
    uint256 constant AMOUNT_A = 100e18;
    uint256 constant AMOUNT_B = 250e18;
    uint256 constant AMOUNT_C = 50e18;
    uint128 constant POOL_SMALL = 400e18;

    function setUp() public {
        vm.warp(START - 1 days);
        token = new MockVibe();
        dist = new VibeRewardsDistributor(IERC20(address(token)), owner);

        leafA = keccak256(abi.encodePacked(alice, uint256(1), AMOUNT_A));
        leafB = keccak256(abi.encodePacked(bob, uint256(1), AMOUNT_B));
        leafC = keccak256(abi.encodePacked(carol, uint256(1), AMOUNT_C));
        rootSmall = _hashPair(_hashPair(leafA, leafB), leafC);
    }

    // ───────────── helpers ─────────────

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function _proofA() internal view returns (bytes32[] memory p) {
        p = new bytes32[](2);
        p[0] = leafB;
        p[1] = leafC;
    }

    function _proofB() internal view returns (bytes32[] memory p) {
        p = new bytes32[](2);
        p[0] = leafA;
        p[1] = leafC;
    }

    function _proofC() internal view returns (bytes32[] memory p) {
        p = new bytes32[](1);
        p[0] = _hashPair(leafA, leafB);
    }

    function _openSmall() internal {
        vm.prank(owner);
        dist.openRound(1, rootSmall, POOL_SMALL, START, END);
        token.mint(address(dist), POOL_SMALL);
    }

    // ───────────── compatibility with the real snapshot tool ─────────────

    function test_RealRoyalty6SnapshotProofs() public {
        string memory json = vm.readFile("./test/fixtures/royalty6.json");
        bytes32 root = vm.parseJsonBytes32(json, ".root");
        uint256 pool = vm.parseJsonUint(json, ".pool");
        address[] memory accounts = vm.parseJsonAddressArray(json, ".accounts");
        string[] memory amountsStr = vm.parseJsonStringArray(json, ".amounts");
        bytes32[][] memory proofs = new bytes32[][](3);
        proofs[0] = vm.parseJsonBytes32Array(json, ".proof0");
        proofs[1] = vm.parseJsonBytes32Array(json, ".proof1");
        proofs[2] = vm.parseJsonBytes32Array(json, ".proof2"); // odd node carried up (shorter proof)

        vm.prank(owner);
        dist.openRound(6, root, uint128(pool), START, END);
        token.mint(address(dist), pool);
        vm.warp(START);

        for (uint256 i; i < 3; ++i) {
            uint256 amount = vm.parseUint(amountsStr[i]);
            assertTrue(dist.canClaim(accounts[i], 6, amount, proofs[i]));
            dist.claimFor(accounts[i], 6, amount, proofs[i]);
            assertEq(token.balanceOf(accounts[i]), amount);
        }
    }

    // ───────────── claim window ─────────────

    function test_ClaimBeforeStartReverts() public {
        _openSmall();
        vm.warp(START - 1);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.ClaimNotOpen.selector, 1, START));
        vm.prank(alice);
        dist.claim(1, AMOUNT_A, _proofA());
    }

    function test_ClaimAtStartAndLastSecond() public {
        _openSmall();
        vm.warp(START);
        vm.prank(alice);
        dist.claim(1, AMOUNT_A, _proofA());
        vm.warp(END - 1);
        vm.prank(bob);
        dist.claim(1, AMOUNT_B, _proofB());
        assertEq(token.balanceOf(alice), AMOUNT_A);
        assertEq(token.balanceOf(bob), AMOUNT_B);
    }

    function test_ClaimAtEndReverts() public {
        _openSmall();
        vm.warp(END);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.ClaimWindowClosed.selector, 1, END));
        vm.prank(alice);
        dist.claim(1, AMOUNT_A, _proofA());
    }

    function test_ClaimForAfterEndReverts() public {
        _openSmall();
        vm.warp(END + 365 days);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.ClaimWindowClosed.selector, 1, END));
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
    }

    // ───────────── claim rules ─────────────

    function test_DoubleClaimReverts() public {
        _openSmall();
        vm.warp(START);
        vm.prank(alice);
        dist.claim(1, AMOUNT_A, _proofA());
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.AlreadyClaimed.selector, 1, alice));
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
    }

    function test_WrongAmountOrAccountReverts() public {
        _openSmall();
        vm.warp(START);
        vm.expectRevert(VibeRewardsDistributor.InvalidProof.selector);
        vm.prank(alice);
        dist.claim(1, AMOUNT_A + 1, _proofA());
        // bob cannot use alice's allocation
        vm.expectRevert(VibeRewardsDistributor.InvalidProof.selector);
        vm.prank(bob);
        dist.claim(1, AMOUNT_A, _proofA());
    }

    function test_UnknownRoundReverts() public {
        vm.warp(START);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.RoundNotFound.selector, 9));
        vm.prank(alice);
        dist.claim(9, AMOUNT_A, _proofA());
    }

    function test_ClaimForSendsToAccountNotCaller() public {
        _openSmall();
        vm.warp(START);
        vm.expectEmit(true, true, true, true);
        emit VibeRewardsDistributor.Claimed(1, alice, AMOUNT_A, agent);
        vm.prank(agent);
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
        assertEq(token.balanceOf(alice), AMOUNT_A);
        assertEq(token.balanceOf(agent), 0);
    }

    function test_ClaimBatchFor() public {
        // second round where alice also has an allocation
        bytes32 leaf2 = keccak256(abi.encodePacked(alice, uint256(2), uint256(7e18)));
        bytes32 other = keccak256(abi.encodePacked(bob, uint256(2), uint256(3e18)));
        bytes32 root2 = _hashPair(leaf2, other);
        _openSmall();
        vm.prank(owner);
        dist.openRound(2, root2, 10e18, START, END);
        token.mint(address(dist), 10e18);
        vm.warp(START);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = AMOUNT_A;
        amounts[1] = 7e18;
        bytes32[][] memory proofs = new bytes32[][](2);
        proofs[0] = _proofA();
        proofs[1] = new bytes32[](1);
        proofs[1][0] = other;

        vm.prank(agent);
        dist.claimBatchFor(alice, ids, amounts, proofs);
        assertEq(token.balanceOf(alice), AMOUNT_A + 7e18);
    }

    function test_PoolCannotBeExceeded() public {
        // pool smaller than the tree total: the last claimer is refused instead of draining other rounds
        vm.prank(owner);
        dist.openRound(1, rootSmall, uint128(AMOUNT_A + AMOUNT_B), START, END);
        token.mint(address(dist), 1_000e18); // plenty of balance from other rounds
        vm.warp(START);
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
        dist.claimFor(bob, 1, AMOUNT_B, _proofB());
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.PoolExceeded.selector, 1));
        dist.claimFor(carol, 1, AMOUNT_C, _proofC());
    }

    // ───────────── expired rounds ─────────────

    function test_WithdrawExpiredOnlyAfterEndAndOnlyThatRound() public {
        _openSmall();
        // a second, still active round funded on the same contract
        vm.prank(owner);
        dist.openRound(2, keccak256("r2"), 500e18, START, END + 30 days);
        token.mint(address(dist), 500e18);

        vm.warp(START);
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.RoundNotEnded.selector, 1, END));
        dist.withdrawExpired(1, owner);

        vm.warp(END);
        vm.prank(owner);
        dist.withdrawExpired(1, owner);
        assertEq(token.balanceOf(owner), POOL_SMALL - AMOUNT_A); // only round 1's rest
        assertEq(token.balanceOf(address(dist)), 500e18); // round 2 untouched

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.AlreadyWithdrawn.selector, 1));
        dist.withdrawExpired(1, owner);
    }

    function test_EmergencyWithdrawAnytimeOnlyOwner() public {
        _openSmall();
        vm.warp(START);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        dist.emergencyWithdraw(IERC20(address(token)), alice, 1);

        vm.prank(owner);
        dist.emergencyWithdraw(IERC20(address(token)), owner, POOL_SMALL);
        assertEq(token.balanceOf(owner), POOL_SMALL);
    }

    // ───────────── admin ─────────────

    function test_OnlyOwnerOpensRounds() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vm.prank(alice);
        dist.openRound(1, rootSmall, POOL_SMALL, START, END);
    }

    function test_OpenRoundValidation() public {
        vm.startPrank(owner);
        vm.expectRevert(VibeRewardsDistributor.InvalidRoot.selector);
        dist.openRound(1, bytes32(0), POOL_SMALL, START, END);
        vm.expectRevert(VibeRewardsDistributor.InvalidPool.selector);
        dist.openRound(1, rootSmall, 0, START, END);
        vm.expectRevert(VibeRewardsDistributor.InvalidWindow.selector);
        dist.openRound(1, rootSmall, POOL_SMALL, END, START);
        dist.openRound(1, rootSmall, POOL_SMALL, START, END);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.RoundExists.selector, 1));
        dist.openRound(1, rootSmall, POOL_SMALL, START, END);
        vm.stopPrank();
    }

    function test_UpdateRoundRules() public {
        _openSmall();
        // before any claim: root/pool/window can change
        vm.prank(owner);
        dist.updateRound(1, rootSmall, POOL_SMALL, START, END + 1 days);
        assertEq(dist.getRound(1).claimEnd, END + 1 days);

        vm.warp(START);
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
        // after a claim the root and pool are fixed, the window can still move
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.RoundAlreadyClaimedFrom.selector, 1));
        dist.updateRound(1, keccak256("other"), POOL_SMALL, START, END);
        vm.prank(owner);
        dist.updateRound(1, rootSmall, POOL_SMALL, START, END);

        vm.warp(END);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(VibeRewardsDistributor.RoundEnded.selector, 1));
        dist.updateRound(1, rootSmall, POOL_SMALL, START, END + 10 days); // a closed round cannot be reopened
    }

    function test_OwnershipTransferNeedsAcceptance() public {
        vm.prank(owner);
        dist.transferOwnership(alice);
        assertEq(dist.owner(), owner);
        vm.prank(alice);
        dist.acceptOwnership();
        assertEq(dist.owner(), alice);
    }

    function test_ViewsReflectWindow() public {
        _openSmall();
        assertFalse(dist.isOpen(1));
        vm.warp(START);
        assertTrue(dist.isOpen(1));
        assertTrue(dist.canClaim(alice, 1, AMOUNT_A, _proofA()));
        assertFalse(dist.canClaim(alice, 1, AMOUNT_A + 1, _proofA()));
        vm.warp(END);
        assertFalse(dist.isOpen(1));
        assertFalse(dist.canClaim(alice, 1, AMOUNT_A, _proofA()));
        assertEq(dist.roundCount(), 1);
    }

    // ───────────── fuzz ─────────────

    function testFuzz_NoClaimOutsideWindow(uint64 t) public {
        _openSmall();
        vm.assume(t < START || t >= END);
        vm.warp(t);
        vm.expectRevert();
        dist.claimFor(alice, 1, AMOUNT_A, _proofA());
    }

    function testFuzz_AnyAmountButTheRightOneFails(uint256 amount) public {
        _openSmall();
        vm.assume(amount != AMOUNT_A);
        vm.warp(START);
        vm.expectRevert(VibeRewardsDistributor.InvalidProof.selector);
        dist.claimFor(alice, 1, amount, _proofA());
    }
}
