// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title VibeRewardsDistributor
/// @notice Merkle-based reward rounds for Vibe Hub (one deployment for holder rewards, one for Vibe Club
///         royalties). Every round has its own pool and its own claim window, and the window is enforced
///         here: outside [claimStart, claimEnd) nobody can claim, neither through the site nor directly.
/// @dev    Leaf = keccak256(abi.encodePacked(account, roundId, amount)), sorted-pair tree. This is exactly what
///         the Vibe Hub snapshot tool produces, so snapshots published from the admin panel work unchanged.
///         The leaf is 84 bytes, so it cannot be confused with an inner node (64 bytes).
///
///         Agent friendly: anyone may trigger a claim for an eligible wallet with claimFor / claimBatchFor,
///         and the tokens always go to that wallet, so an agent (or any relayer) can claim on a user's behalf
///         without holding the user's keys and without being able to redirect the reward.
contract VibeRewardsDistributor is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Round {
        bytes32 merkleRoot;
        uint64 claimStart; // first second claims are accepted (unix time, inclusive)
        uint64 claimEnd; // claims stop at this second (exclusive)
        uint128 pool; // total allocation of the round
        uint128 claimed; // claimed so far
        bool expiredWithdrawn; // the unclaimed rest was withdrawn after claimEnd
    }

    /// @notice The reward token ($VIBE).
    IERC20 public immutable token;

    mapping(uint256 roundId => Round) private _rounds;
    mapping(uint256 roundId => mapping(address account => bool)) public hasClaimed;

    /// @notice Round ids in the order they were opened.
    uint256[] public roundIds;

    event RoundOpened(uint256 indexed roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd);
    event RoundUpdated(uint256 indexed roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd);
    event Claimed(uint256 indexed roundId, address indexed account, uint256 amount, address indexed caller);
    event ExpiredWithdrawn(uint256 indexed roundId, address indexed to, uint256 amount);
    event EmergencyWithdrawn(address indexed token, address indexed to, uint256 amount);

    error RoundExists(uint256 roundId);
    error RoundNotFound(uint256 roundId);
    error InvalidRoot();
    error InvalidPool();
    error InvalidWindow();
    error RoundAlreadyClaimedFrom(uint256 roundId);
    error RoundEnded(uint256 roundId);
    error ClaimNotOpen(uint256 roundId, uint64 claimStart);
    error ClaimWindowClosed(uint256 roundId, uint64 claimEnd);
    error AlreadyClaimed(uint256 roundId, address account);
    error InvalidProof();
    error PoolExceeded(uint256 roundId);
    error RoundNotEnded(uint256 roundId, uint64 claimEnd);
    error AlreadyWithdrawn(uint256 roundId);
    error ZeroAddress();
    error LengthMismatch();

    constructor(IERC20 token_, address owner_) Ownable(owner_) {
        if (address(token_) == address(0)) revert ZeroAddress();
        token = token_;
    }

    // ─────────────────────────────── Admin ───────────────────────────────

    /// @notice Opens a round. The pool tokens can be sent before or after; claims fail while they are missing.
    function openRound(uint256 roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd)
        external
        onlyOwner
    {
        if (_rounds[roundId].merkleRoot != bytes32(0)) revert RoundExists(roundId);
        _validate(merkleRoot, pool, claimStart, claimEnd);
        _rounds[roundId] = Round(merkleRoot, claimStart, claimEnd, pool, 0, false);
        roundIds.push(roundId);
        emit RoundOpened(roundId, merkleRoot, pool, claimStart, claimEnd);
    }

    /// @notice Corrects a round that has not ended yet. The root and pool can only change before the first
    ///         claim (so nobody's allocation changes under them); the window can be moved while it is open.
    function updateRound(uint256 roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd)
        external
        onlyOwner
    {
        Round storage r = _existing(roundId);
        if (block.timestamp >= r.claimEnd) revert RoundEnded(roundId);
        if (r.claimed != 0 && (merkleRoot != r.merkleRoot || pool != r.pool)) revert RoundAlreadyClaimedFrom(roundId);
        _validate(merkleRoot, pool, claimStart, claimEnd);
        r.merkleRoot = merkleRoot;
        r.pool = pool;
        r.claimStart = claimStart;
        r.claimEnd = claimEnd;
        emit RoundUpdated(roundId, merkleRoot, pool, claimStart, claimEnd);
    }

    /// @notice After a round's window closed, sends its unclaimed rest to `to` (the admin then burns it or
    ///         moves it to the pool by hand). Only that round's share is touched.
    function withdrawExpired(uint256 roundId, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        Round storage r = _existing(roundId);
        if (block.timestamp < r.claimEnd) revert RoundNotEnded(roundId, r.claimEnd);
        if (r.expiredWithdrawn) revert AlreadyWithdrawn(roundId);
        r.expiredWithdrawn = true;
        uint256 rest = uint256(r.pool) - r.claimed;
        uint256 balance = token.balanceOf(address(this));
        if (rest > balance) rest = balance;
        token.safeTransfer(to, rest);
        emit ExpiredWithdrawn(roundId, to, rest);
    }

    /// @notice Withdraws any token at any time (admin decision, also during an active round).
    function emergencyWithdraw(IERC20 token_, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        token_.safeTransfer(to, amount);
        emit EmergencyWithdrawn(address(token_), to, amount);
    }

    // ─────────────────────────────── Claims ───────────────────────────────

    /// @notice Claims the caller's allocation of a round.
    function claim(uint256 roundId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        _claim(msg.sender, roundId, amount, proof);
    }

    /// @notice Claims `account`'s allocation for it. Callable by anyone (agents, relayers); the tokens always
    ///         go to `account`.
    function claimFor(address account, uint256 roundId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        _claim(account, roundId, amount, proof);
    }

    /// @notice Several rounds for one account in one transaction (e.g. an agent catching up).
    function claimBatchFor(
        address account,
        uint256[] calldata roundIds_,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external nonReentrant {
        if (roundIds_.length != amounts.length || roundIds_.length != proofs.length) revert LengthMismatch();
        for (uint256 i; i < roundIds_.length; ++i) {
            _claim(account, roundIds_[i], amounts[i], proofs[i]);
        }
    }

    // ─────────────────────────────── Views ───────────────────────────────

    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function roundCount() external view returns (uint256) {
        return roundIds.length;
    }

    /// @notice True while the round accepts claims.
    function isOpen(uint256 roundId) public view returns (bool) {
        Round storage r = _rounds[roundId];
        return r.merkleRoot != bytes32(0) && block.timestamp >= r.claimStart && block.timestamp < r.claimEnd;
    }

    /// @notice Whether `account` could claim `amount` from the round right now with this proof (for the site
    ///         and agents to check before sending a transaction). Does not check the contract balance.
    function canClaim(address account, uint256 roundId, uint256 amount, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        Round storage r = _rounds[roundId];
        return isOpen(roundId) && !hasClaimed[roundId][account] && uint256(r.claimed) + amount <= r.pool
            && MerkleProof.verifyCalldata(proof, r.merkleRoot, _leaf(account, roundId, amount));
    }

    // ─────────────────────────────── Internal ───────────────────────────────

    function _claim(address account, uint256 roundId, uint256 amount, bytes32[] calldata proof) internal {
        if (account == address(0)) revert ZeroAddress();
        Round storage r = _existing(roundId);
        if (block.timestamp < r.claimStart) revert ClaimNotOpen(roundId, r.claimStart);
        if (block.timestamp >= r.claimEnd) revert ClaimWindowClosed(roundId, r.claimEnd);
        if (hasClaimed[roundId][account]) revert AlreadyClaimed(roundId, account);
        if (!MerkleProof.verifyCalldata(proof, r.merkleRoot, _leaf(account, roundId, amount))) revert InvalidProof();
        uint256 claimedAfter = uint256(r.claimed) + amount;
        if (claimedAfter > r.pool) revert PoolExceeded(roundId);

        hasClaimed[roundId][account] = true;
        r.claimed = uint128(claimedAfter);
        token.safeTransfer(account, amount);
        emit Claimed(roundId, account, amount, msg.sender);
    }

    function _existing(uint256 roundId) internal view returns (Round storage r) {
        r = _rounds[roundId];
        if (r.merkleRoot == bytes32(0)) revert RoundNotFound(roundId);
    }

    function _validate(bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd) internal view {
        if (merkleRoot == bytes32(0)) revert InvalidRoot();
        if (pool == 0) revert InvalidPool();
        if (claimEnd <= claimStart || claimEnd <= block.timestamp) revert InvalidWindow();
    }

    function _leaf(address account, uint256 roundId, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, roundId, amount));
    }
}
