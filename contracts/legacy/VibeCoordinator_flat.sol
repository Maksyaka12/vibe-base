// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721Minimal {
    function balanceOf(address owner) external view returns (uint256);
}

interface IVibeDailyCheckIn {
    function checkIn() external;
    function checkInFor(address user) external;
    function getCheckInInfo(address user) external view returns (
        uint256 currentStreak,
        uint256 longestStreak,
        uint256 totalCheckIns,
        uint256 lastCheckInTimestamp,
        bool canCheckInToday,
        uint256 secondsUntilNextCheckIn
    );
    function totalUsers() external view returns (uint256);
    function totalGlobalCheckIns() external view returns (uint256);
}

interface IVibeAchievements {
    function claimAchievement(uint256 achievementId) external;
    function claimAchievements(uint256[] calldata achievementIds) external;
    function claimAchievementFor(address user, uint256 achievementId) external;
    function hasUserClaimed(address user, uint256 achievementId) external view returns (bool);
    function getUserAchievements(address user, uint256[] calldata ids) external view returns (bool[] memory);
    function totalAchievements() external view returns (uint256);
    function totalGlobalClaims() external view returns (uint256);
}

interface IVibeDistributor {
    function claim(uint256 epochId, uint256 amount, bytes32[] calldata merkleProof) external;
    function hasClaimed(uint256 epochId, address user) external view returns (bool);
}

interface IVibeClub {
    function mint(uint256 amount) external payable;
}

/**
 * @title VibeCoordinator
 * @notice Central Master Coordinator & Registry Contract for the Vibe Hub Ecosystem on Base.
 *         Provides a single unified gateway for AI Agents, autonomous bots, smart accounts,
 *         and users to aggregate on-chain state in 1 call and coordinate ecosystem actions.
 */
contract VibeCoordinator {
    string public constant name = "Vibe Master Coordinator";
    string public constant version = "1.0.0";

    address public owner;
    bool public paused;

    // Ecosystem Contract Registry
    address public tokenVibe;
    address public vibeClubNft;
    address public stakingContract;
    address public holderDistributor;
    address public royaltyDistributor;
    address public dailyCheckIn;
    address public achievements;
    address public buybackPool;

    // Authorized AI Agents / Operators
    mapping(address => bool) public operators;

    // Structs for Agent Aggregation
    struct UserDashboard {
        uint256 vibeBalance;
        uint256 nftCount;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 totalCheckIns;
        uint256 lastCheckInTimestamp;
        bool canCheckInToday;
        uint256 secondsUntilNextCheckIn;
        bool[] achievementsClaimed;
    }

    struct EcosystemAddresses {
        address tokenVibe;
        address vibeClubNft;
        address stakingContract;
        address holderDistributor;
        address royaltyDistributor;
        address dailyCheckIn;
        address achievements;
        address buybackPool;
    }

    struct EcosystemStats {
        uint256 totalCheckInUsers;
        uint256 totalGlobalCheckIns;
        uint256 totalUniqueAchievements;
        uint256 totalGlobalAchievementClaims;
    }

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ContractAddressUpdated(string indexed nameKey, address indexed oldAddress, address indexed newAddress);
    event OperatorUpdated(address indexed operator, bool authorized);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event AgentActionExecuted(address indexed caller, string action, bytes data);

    // Errors
    error ContractPaused();
    error InvalidAddress();
    error NotOwner();
    error NotOperator();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner) revert NotOperator();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        // Official Initial Contract Addresses on Base
        tokenVibe = 0xb200000000000000000000DF24eCb8bF51100a01;
        vibeClubNft = 0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886;
        stakingContract = 0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4;
        holderDistributor = 0x77e04DD8c45725D2b2B3C8eebAc2f3F1708Fd089;
        royaltyDistributor = 0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1;
        dailyCheckIn = 0x1938BA215ef556e51eE6AaF909e0970AE0167634;
        achievements = 0x10667fF580e6fc2edfFC35991fACb05C2681E757;
        buybackPool = 0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf;
    }

    // ── 1. AGENT DASHBOARD & AGGREGATE READ VIEWS (0 GAS) ──

    /**
     * @notice Returns comprehensive on-chain profile data for any address in 1 single RPC call.
     *         Designed for AI agents and frontends to eliminate multi-roundtrip RPC overhead.
     * @param user Target user address.
     */
    function getAgentDashboard(address user) external view returns (UserDashboard memory dashboard) {
        if (user == address(0)) return dashboard;

        // 1. $VIBE Token Balance
        if (tokenVibe != address(0)) {
            try IERC20Minimal(tokenVibe).balanceOf(user) returns (uint256 bal) {
                dashboard.vibeBalance = bal;
            } catch {}
        }

        // 2. Vibe Club NFT Count
        if (vibeClubNft != address(0)) {
            try IERC721Minimal(vibeClubNft).balanceOf(user) returns (uint256 count) {
                dashboard.nftCount = count;
            } catch {}
        }

        // 3. Daily Check-In & Streak Info
        if (dailyCheckIn != address(0)) {
            try IVibeDailyCheckIn(dailyCheckIn).getCheckInInfo(user) returns (
                uint256 currentStreak,
                uint256 longestStreak,
                uint256 totalCheckIns,
                uint256 lastCheckInTimestamp,
                bool canCheckInToday,
                uint256 secondsUntilNextCheckIn
            ) {
                dashboard.currentStreak = currentStreak;
                dashboard.longestStreak = longestStreak;
                dashboard.totalCheckIns = totalCheckIns;
                dashboard.lastCheckInTimestamp = lastCheckInTimestamp;
                dashboard.canCheckInToday = canCheckInToday;
                dashboard.secondsUntilNextCheckIn = secondsUntilNextCheckIn;
            } catch {}
        }

        // 4. Achievements Claimed Array (IDs 1 to 8)
        if (achievements != address(0)) {
            uint256[] memory achIds = new uint256[](8);
            for (uint256 i = 0; i < 8; i++) {
                achIds[i] = i + 1;
            }
            try IVibeAchievements(achievements).getUserAchievements(user, achIds) returns (bool[] memory claimed) {
                dashboard.achievementsClaimed = claimed;
            } catch {}
        }

        return dashboard;
    }

    /**
     * @notice Returns all official ecosystem contract addresses for automatic discovery.
     */
    function getEcosystemAddresses() external view returns (EcosystemAddresses memory) {
        return EcosystemAddresses({
            tokenVibe: tokenVibe,
            vibeClubNft: vibeClubNft,
            stakingContract: stakingContract,
            holderDistributor: holderDistributor,
            royaltyDistributor: royaltyDistributor,
            dailyCheckIn: dailyCheckIn,
            achievements: achievements,
            buybackPool: buybackPool
        });
    }

    /**
     * @notice Returns global ecosystem statistics in 1 call.
     */
    function getEcosystemStats() external view returns (EcosystemStats memory stats) {
        if (dailyCheckIn != address(0)) {
            try IVibeDailyCheckIn(dailyCheckIn).totalUsers() returns (uint256 u) {
                stats.totalCheckInUsers = u;
            } catch {}
            try IVibeDailyCheckIn(dailyCheckIn).totalGlobalCheckIns() returns (uint256 c) {
                stats.totalGlobalCheckIns = c;
            } catch {}
        }

        if (achievements != address(0)) {
            try IVibeAchievements(achievements).totalAchievements() returns (uint256 a) {
                stats.totalUniqueAchievements = a;
            } catch {}
            try IVibeAchievements(achievements).totalGlobalClaims() returns (uint256 gc) {
                stats.totalGlobalAchievementClaims = gc;
            } catch {}
        }

        return stats;
    }

    // ── 2. AGENT ACTION EXECUTION & FORWARDING ──

    /**
     * @notice Executes check-in for the caller.
     */
    function executeCheckIn() external whenNotPaused {
        IVibeDailyCheckIn(dailyCheckIn).checkIn();
        emit AgentActionExecuted(msg.sender, "checkIn", "");
    }

    /**
     * @notice Executes check-in on behalf of a user (authorized operator/agent only).
     */
    function executeCheckInFor(address user) external onlyOperator whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        IVibeDailyCheckIn(dailyCheckIn).checkInFor(user);
        emit AgentActionExecuted(msg.sender, "checkInFor", abi.encode(user));
    }

    /**
     * @notice Executes achievement claim for the caller.
     */
    function executeClaimAchievement(uint256 achievementId) external whenNotPaused {
        IVibeAchievements(achievements).claimAchievement(achievementId);
        emit AgentActionExecuted(msg.sender, "claimAchievement", abi.encode(achievementId));
    }

    /**
     * @notice Executes batch achievement claim for the caller.
     */
    function executeClaimAchievements(uint256[] calldata achievementIds) external whenNotPaused {
        IVibeAchievements(achievements).claimAchievements(achievementIds);
        emit AgentActionExecuted(msg.sender, "claimAchievements", abi.encode(achievementIds));
    }

    /**
     * @notice Claims achievement for a user (authorized operator/agent only).
     */
    function executeClaimAchievementFor(address user, uint256 achievementId) external onlyOperator whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        IVibeAchievements(achievements).claimAchievementFor(user, achievementId);
        emit AgentActionExecuted(msg.sender, "claimAchievementFor", abi.encode(user, achievementId));
    }

    /**
     * @notice Claims Holder Rewards from the Distributor.
     */
    function executeClaimHolderRewards(uint256 roundId, uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused {
        IVibeDistributor(holderDistributor).claim(roundId, amount, merkleProof);
        emit AgentActionExecuted(msg.sender, "claimHolderRewards", abi.encode(roundId, amount));
    }

    /**
     * @notice Claims Royalty Rewards from the Royalty Distributor.
     */
    function executeClaimRoyalty(uint256 epochId, uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused {
        IVibeDistributor(royaltyDistributor).claim(epochId, amount, merkleProof);
        emit AgentActionExecuted(msg.sender, "claimRoyalty", abi.encode(epochId, amount));
    }

    /**
     * @notice Mints Vibe Club NFT forwarding payment.
     */
    function executeMintVibeClub(uint256 amount) external payable whenNotPaused {
        IVibeClub(vibeClubNft).mint{value: msg.value}(amount);
        emit AgentActionExecuted(msg.sender, "mintVibeClub", abi.encode(amount, msg.value));
    }

    // ── 3. ADMIN MANAGEMENT (onlyOwner) ──

    function updateContractAddress(string memory nameKey, address newAddress) external onlyOwner {
        if (newAddress == address(0)) revert InvalidAddress();
        bytes32 keyHash = keccak256(bytes(nameKey));

        address oldAddress;
        if (keyHash == keccak256(bytes("tokenVibe"))) {
            oldAddress = tokenVibe;
            tokenVibe = newAddress;
        } else if (keyHash == keccak256(bytes("vibeClubNft"))) {
            oldAddress = vibeClubNft;
            vibeClubNft = newAddress;
        } else if (keyHash == keccak256(bytes("stakingContract"))) {
            oldAddress = stakingContract;
            stakingContract = newAddress;
        } else if (keyHash == keccak256(bytes("holderDistributor"))) {
            oldAddress = holderDistributor;
            holderDistributor = newAddress;
        } else if (keyHash == keccak256(bytes("royaltyDistributor"))) {
            oldAddress = royaltyDistributor;
            royaltyDistributor = newAddress;
        } else if (keyHash == keccak256(bytes("dailyCheckIn"))) {
            oldAddress = dailyCheckIn;
            dailyCheckIn = newAddress;
        } else if (keyHash == keccak256(bytes("achievements"))) {
            oldAddress = achievements;
            achievements = newAddress;
        } else if (keyHash == keccak256(bytes("buybackPool"))) {
            oldAddress = buybackPool;
            buybackPool = newAddress;
        } else {
            revert("Unknown contract key");
        }

        emit ContractAddressUpdated(nameKey, oldAddress, newAddress);
    }

    function setOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();
        operators[operator] = authorized;
        emit OperatorUpdated(operator, authorized);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Allow receiving ETH if refunds occur
    receive() external payable {}
    fallback() external payable {}
}
