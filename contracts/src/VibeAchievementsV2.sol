// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @dev Vibe Hub daily check-in (0x1938BA215ef556e51eE6AaF909e0970AE0167634).
interface IVibeCheckIn {
    function getCheckInInfo(address user)
        external
        view
        returns (
            uint256 currentStreak,
            uint256 longestStreak,
            uint256 totalCheckIns,
            uint256 lastCheckInTimestamp,
            bool canCheckInToday,
            uint256 secondsUntilNextCheckIn
        );
}

/// @dev o1 Exchange staking (0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4). nextLotId never decreases, so it
///      shows that a wallet deposited into a vault even after it withdrew; totalStaked is the current stake.
interface IO1Staking {
    function getUserState(bytes32 vaultId, address user)
        external
        view
        returns (uint64 nextLotId, uint192 totalStaked, uint16 penaltyRemainder);
}

/// @title VibeAchievementsV2
/// @notice Soulbound Vibe Hub achievements (ERC-1155 ids, one per wallet, never transferable). The contract
///         checks every condition itself from onchain data, so a badge always means the wallet earned it:
///         - Streak:       longest daily check-in streak >= threshold
///         - VaultsJoined: deposited into >= threshold of the official $VIBE staking vaults
///         - StakeInVault: currently staking >= threshold $VIBE in one official vault
///         - Manual:       granted by the owner (special cases, e.g. a past large deposit that was withdrawn)
/// @dev    claimFor can be called by anyone (an agent, the owner of the wallet, a relayer): it only mints a
///         badge the wallet has earned, to that wallet. Each wallet is its own participant.
contract VibeAchievementsV2 is Ownable2Step {
    enum Kind {
        None,
        Streak,
        VaultsJoined,
        StakeInVault,
        Manual
    }

    struct Achievement {
        Kind kind;
        bool active;
        uint256 threshold; // days, vault count, or $VIBE in wei (unused for Manual)
        uint256 totalClaimed;
        string name;
        string uri;
    }

    string public constant name = "Vibe Hub Achievements";
    string public constant symbol = "VIBEACH";

    IVibeCheckIn public checkIn;
    IO1Staking public staking;

    mapping(uint256 id => Achievement) private _achievements;
    uint256[] public achievementIds;

    /// @notice Official $VIBE staking vaults (one per staking epoch), added by the owner as epochs start.
    bytes32[] public vaults;
    mapping(bytes32 vaultId => bool) public isVault;

    mapping(address account => mapping(uint256 id => bool)) public hasClaimed;
    uint256 public totalClaims;

    // ERC-1155
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    event AchievementSet(uint256 indexed id, Kind kind, uint256 threshold, bool active, string name, string uri);
    event AchievementClaimed(address indexed account, uint256 indexed id, address indexed caller, bool granted);
    event VaultAdded(bytes32 indexed vaultId);
    event VaultRemoved(bytes32 indexed vaultId);
    event SourcesSet(address checkIn, address staking);

    error Soulbound();
    error UnknownAchievement(uint256 id);
    error AchievementInactive(uint256 id);
    error AlreadyClaimed(address account, uint256 id);
    error NotEligible(address account, uint256 id);
    error InvalidKind();
    error VaultExists(bytes32 vaultId);
    error VaultMissing(bytes32 vaultId);
    error ZeroAddress();

    constructor(address owner_, IVibeCheckIn checkIn_, IO1Staking staking_, bytes32[] memory vaults_) Ownable(owner_) {
        _setSources(checkIn_, staking_);
        for (uint256 i; i < vaults_.length; ++i) {
            _addVault(vaults_[i]);
        }
        string memory base = "https://vibeverse.dog/api/achievements/";
        _set(1, Kind.Streak, 7, true, "STARTER DOG", string.concat(base, "1.json"));
        _set(2, Kind.Streak, 14, true, "LOYAL DOG", string.concat(base, "2.json"));
        _set(3, Kind.Streak, 30, true, "ULTRA-ACTIVE DOG", string.concat(base, "3.json"));
        _set(4, Kind.VaultsJoined, 1, true, "NOVICE STAKER", string.concat(base, "4.json"));
        _set(5, Kind.VaultsJoined, 3, true, "CONFIDENT BANKER", string.concat(base, "5.json"));
        _set(6, Kind.VaultsJoined, 5, true, "WOLF OF WALL ST", string.concat(base, "6.json"));
        _set(7, Kind.StakeInVault, 5_000_000 ether, true, "RICH DOG", string.concat(base, "7.json"));
        _set(8, Kind.StakeInVault, 10_000_000 ether, true, "BANK FOUNDER", string.concat(base, "8.json"));
    }

    // ─────────────────────────────── Claims ───────────────────────────────

    /// @notice Claims an achievement the caller has earned.
    function claim(uint256 id) external {
        _claim(msg.sender, id);
    }

    /// @notice Claims an earned achievement for `account` (anyone may call; the badge goes to `account`).
    function claimFor(address account, uint256 id) external {
        _claim(account, id);
    }

    /// @notice Claims every achievement `account` has earned and not claimed yet. Never reverts on the ones it
    ///         has not earned, so an agent can simply call it regularly. Returns how many were claimed.
    function claimAllFor(address account) external returns (uint256 claimed) {
        if (account == address(0)) revert ZeroAddress();
        for (uint256 i; i < achievementIds.length; ++i) {
            uint256 id = achievementIds[i];
            Achievement storage a = _achievements[id];
            if (a.active && a.kind != Kind.Manual && !hasClaimed[account][id] && _meets(account, a)) {
                _mint(account, id, false);
                ++claimed;
            }
        }
    }

    // ─────────────────────────────── Views ───────────────────────────────

    /// @notice True when `account` meets the condition of `id` and has not claimed it.
    function isClaimable(address account, uint256 id) public view returns (bool) {
        Achievement storage a = _achievements[id];
        return a.active && a.kind != Kind.Manual && !hasClaimed[account][id] && _meets(account, a);
    }

    /// @notice Every achievement id with its state for `account` (for the site and agents in one call).
    function statusOf(address account)
        external
        view
        returns (uint256[] memory ids, bool[] memory claimed, bool[] memory claimable)
    {
        uint256 n = achievementIds.length;
        ids = new uint256[](n);
        claimed = new bool[](n);
        claimable = new bool[](n);
        for (uint256 i; i < n; ++i) {
            uint256 id = achievementIds[i];
            ids[i] = id;
            claimed[i] = hasClaimed[account][id];
            claimable[i] = isClaimable(account, id);
        }
    }

    /// @notice The numbers the conditions are checked against.
    function progressOf(address account)
        external
        view
        returns (uint256 longestStreak, uint256 vaultsJoined, uint256 largestStake)
    {
        longestStreak = _longestStreak(account);
        (vaultsJoined, largestStake) = _stakingStats(account);
    }

    function getAchievement(uint256 id) external view returns (Achievement memory) {
        return _achievements[id];
    }

    function achievementCount() external view returns (uint256) {
        return achievementIds.length;
    }

    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    // ─────────────────────────────── ERC-1155 (soulbound) ───────────────────────────────

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return hasClaimed[account][id] ? 1 : 0;
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory out) {
        out = new uint256[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) {
            out[i] = balanceOf(accounts[i], ids[i]);
        }
    }

    function uri(uint256 id) external view returns (string memory) {
        return _achievements[id].uri;
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function setApprovalForAll(address, bool) external pure {
        revert Soulbound();
    }

    function safeTransferFrom(address, address, uint256, uint256, bytes calldata) external pure {
        revert Soulbound();
    }

    function safeBatchTransferFrom(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external
        pure
    {
        revert Soulbound();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC-165
            || interfaceId == 0xd9b67a26 // ERC-1155
            || interfaceId == 0x0e89341c; // ERC-1155 metadata URI
    }

    // ─────────────────────────────── Admin ───────────────────────────────

    /// @notice Adds or changes an achievement (a new id or new threshold/name/uri; deactivate with active=false).
    function setAchievement(uint256 id, Kind kind, uint256 threshold, bool active, string calldata name_, string calldata uri_)
        external
        onlyOwner
    {
        _set(id, kind, threshold, active, name_, uri_);
    }

    /// @notice Gives an achievement without checking its condition (special cases).
    function grant(address account, uint256 id) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        if (_achievements[id].kind == Kind.None) revert UnknownAchievement(id);
        if (hasClaimed[account][id]) revert AlreadyClaimed(account, id);
        _mint(account, id, true);
    }

    function addVault(bytes32 vaultId) external onlyOwner {
        _addVault(vaultId);
    }

    function removeVault(bytes32 vaultId) external onlyOwner {
        if (!isVault[vaultId]) revert VaultMissing(vaultId);
        isVault[vaultId] = false;
        for (uint256 i; i < vaults.length; ++i) {
            if (vaults[i] == vaultId) {
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                break;
            }
        }
        emit VaultRemoved(vaultId);
    }

    /// @notice Points to new check-in / staking contracts if those are ever replaced.
    function setSources(IVibeCheckIn checkIn_, IO1Staking staking_) external onlyOwner {
        _setSources(checkIn_, staking_);
    }

    // ─────────────────────────────── Internal ───────────────────────────────

    function _claim(address account, uint256 id) internal {
        if (account == address(0)) revert ZeroAddress();
        Achievement storage a = _achievements[id];
        if (a.kind == Kind.None) revert UnknownAchievement(id);
        if (!a.active) revert AchievementInactive(id);
        if (hasClaimed[account][id]) revert AlreadyClaimed(account, id);
        if (a.kind == Kind.Manual || !_meets(account, a)) revert NotEligible(account, id);
        _mint(account, id, false);
    }

    function _mint(address account, uint256 id, bool granted) internal {
        hasClaimed[account][id] = true;
        _achievements[id].totalClaimed += 1;
        totalClaims += 1;
        emit TransferSingle(msg.sender, address(0), account, id, 1);
        emit AchievementClaimed(account, id, msg.sender, granted);
    }

    function _meets(address account, Achievement storage a) internal view returns (bool) {
        if (a.kind == Kind.Streak) return _longestStreak(account) >= a.threshold;
        (uint256 joined, uint256 largest) = _stakingStats(account);
        if (a.kind == Kind.VaultsJoined) return joined >= a.threshold;
        if (a.kind == Kind.StakeInVault) return largest >= a.threshold;
        return false;
    }

    function _longestStreak(address account) internal view returns (uint256 longest) {
        try checkIn.getCheckInInfo(account) returns (uint256, uint256 l, uint256, uint256, bool, uint256) {
            longest = l;
        } catch {}
    }

    function _stakingStats(address account) internal view returns (uint256 joined, uint256 largest) {
        for (uint256 i; i < vaults.length; ++i) {
            try staking.getUserState(vaults[i], account) returns (uint64 nextLotId, uint192 totalStaked, uint16) {
                if (nextLotId > 0) ++joined;
                if (totalStaked > largest) largest = totalStaked;
            } catch {}
        }
    }

    function _set(uint256 id, Kind kind, uint256 threshold, bool active, string memory name_, string memory uri_) internal {
        if (kind == Kind.None) revert InvalidKind();
        if (_achievements[id].kind == Kind.None) achievementIds.push(id);
        Achievement storage a = _achievements[id];
        a.kind = kind;
        a.threshold = threshold;
        a.active = active;
        a.name = name_;
        a.uri = uri_;
        emit AchievementSet(id, kind, threshold, active, name_, uri_);
        emit URI(uri_, id);
    }

    function _addVault(bytes32 vaultId) internal {
        if (isVault[vaultId]) revert VaultExists(vaultId);
        isVault[vaultId] = true;
        vaults.push(vaultId);
        emit VaultAdded(vaultId);
    }

    function _setSources(IVibeCheckIn checkIn_, IO1Staking staking_) internal {
        if (address(checkIn_) == address(0) || address(staking_) == address(0)) revert ZeroAddress();
        checkIn = checkIn_;
        staking = staking_;
        emit SourcesSet(address(checkIn_), address(staking_));
    }
}
