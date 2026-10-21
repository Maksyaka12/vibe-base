// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VibeAchievements
 * @notice Official Soulbound Token (SBT) Achievement Badge Contract for Vibe Hub on Base.
 *         Users earn verifiable on-chain badges by completing in-app milestones.
 *         Badges are non-transferable (Soulbound) to guarantee authenticity.
 */
contract VibeAchievements {
    string public constant name = "Vibe Hub Achievements";
    string public constant symbol = "VIBE_ACHIEVE";

    address public owner;
    bool public paused;

    string public baseURI;
    string public contractURI;

    uint256 public totalAchievementsCount;
    uint256 public totalGlobalClaims;

    struct Achievement {
        uint256 id;
        string name;
        string category;
        string uri;
        bool isActive;
        uint256 totalClaimed;
    }

    // Mapping: achievementId => Achievement details
    mapping(uint256 => Achievement) public achievements;

    // List of achievement IDs for enumeration
    uint256[] public achievementIdsList;

    // Mapping: user => (achievementId => claimed status)
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    // Mapping: user => (achievementId => balance)
    mapping(address => mapping(uint256 => uint256)) private _balances;

    // Authorized operators
    mapping(address => bool) public operators;

    // ERC-1155 Events
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    // Custom Events
    event AchievementClaimed(address indexed user, uint256 indexed achievementId, uint256 timestamp);
    event AchievementCreated(uint256 indexed achievementId, string name, string category, string uri);
    event AchievementUpdated(uint256 indexed achievementId, string name, string category, string uri, bool isActive);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool authorized);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // Errors
    error SoulboundTokenCannotBeTransferred();
    error AchievementAlreadyClaimed();
    error AchievementNotActive();
    error AchievementNotFound();
    error ContractPaused();
    error InvalidAddress();
    error ArrayLengthMismatch();
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

        baseURI = "https://vibeverse.dog/api/achievements/";
        contractURI = "https://vibeverse.dog/api/achievements/contract.json";

        // Pre-initialize initial 8 achievements
        _createAchievement(1, "STARTER DOG", "Active Dog", "https://vibeverse.dog/api/achievements/1.json", true);
        _createAchievement(2, "LOYAL DOG", "Active Dog", "https://vibeverse.dog/api/achievements/2.json", true);
        _createAchievement(3, "ULTRA-ACTIVE DOG", "Active Dog", "https://vibeverse.dog/api/achievements/3.json", true);
        _createAchievement(4, "NOVICE STAKER", "Dog Staker", "https://vibeverse.dog/api/achievements/4.json", true);
        _createAchievement(5, "CONFIDENT BANKER", "Dog Staker", "https://vibeverse.dog/api/achievements/5.json", true);
        _createAchievement(6, "WOLF OF WALL ST", "Dog Staker", "https://vibeverse.dog/api/achievements/6.json", true);
        _createAchievement(7, "RICH DOG", "Dog Staker", "https://vibeverse.dog/api/achievements/7.json", true);
        _createAchievement(8, "BANK FOUNDER", "Dog Staker", "https://vibeverse.dog/api/achievements/8.json", true);
    }

    // ── ERC165 ──
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165 Interface ID
            interfaceId == 0xd9b67a26 || // ERC1155 Interface ID
            interfaceId == 0x0e89341c;   // ERC1155MetadataURI Interface ID
    }

    // ── METADATA ──
    function uri(uint256 id) external view returns (string memory) {
        if (bytes(achievements[id].uri).length > 0) {
            return achievements[id].uri;
        }
        return string(abi.encodePacked(baseURI, _toString(id), ".json"));
    }

    // ── ERC1155 SOULBOUND BALANCES & TRANSFERS ──
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        if (account == address(0)) revert InvalidAddress();
        return _balances[account][id];
    }

    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory) {
        if (accounts.length != ids.length) revert ArrayLengthMismatch();
        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ++i) {
            if (accounts[i] == address(0)) revert InvalidAddress();
            batchBalances[i] = _balances[accounts[i]][ids[i]];
        }
        return batchBalances;
    }

    function setApprovalForAll(address, bool) external pure {
        revert SoulboundTokenCannotBeTransferred();
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata
    ) external {
        if (from != address(0)) {
            revert SoulboundTokenCannotBeTransferred();
        }
        _mint(to, id, amount);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata
    ) external {
        if (from != address(0)) {
            revert SoulboundTokenCannotBeTransferred();
        }
        _mintBatch(to, ids, amounts);
    }

    // ── CLAIM FUNCTIONS ──
    function claimAchievement(uint256 achievementId) external whenNotPaused {
        _processClaim(msg.sender, achievementId);
    }

    function claimAchievements(uint256[] calldata achievementIds) external whenNotPaused {
        for (uint256 i = 0; i < achievementIds.length; ++i) {
            _processClaim(msg.sender, achievementIds[i]);
        }
    }

    function claimAchievementFor(address user, uint256 achievementId) external onlyOperator whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        _processClaim(user, achievementId);
    }

    function _processClaim(address user, uint256 achievementId) internal {
        Achievement storage ach = achievements[achievementId];
        if (ach.id == 0) revert AchievementNotFound();
        if (!ach.isActive) revert AchievementNotActive();
        if (hasClaimed[user][achievementId]) revert AchievementAlreadyClaimed();

        hasClaimed[user][achievementId] = true;
        ach.totalClaimed += 1;
        totalGlobalClaims += 1;

        _mint(user, achievementId, 1);

        emit AchievementClaimed(user, achievementId, block.timestamp);
    }

    function _mint(address to, uint256 id, uint256 amount) internal {
        if (to == address(0)) revert InvalidAddress();

        _balances[to][id] += amount;

        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function _mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) internal {
        if (to == address(0)) revert InvalidAddress();
        if (ids.length != amounts.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < ids.length; ++i) {
            _balances[to][ids[i]] += amounts[i];
        }

        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
    }

    // ── VIEW HELPERS ──
    function hasUserClaimed(address user, uint256 achievementId) external view returns (bool) {
        return hasClaimed[user][achievementId];
    }

    function getUserAchievements(
        address user,
        uint256[] calldata ids
    ) external view returns (bool[] memory) {
        bool[] memory results = new bool[](ids.length);
        for (uint256 i = 0; i < ids.length; ++i) {
            results[i] = hasClaimed[user][ids[i]];
        }
        return results;
    }

    function getAchievement(uint256 achievementId) external view returns (Achievement memory) {
        return achievements[achievementId];
    }

    function getAllAchievements() external view returns (Achievement[] memory) {
        uint256 len = achievementIdsList.length;
        Achievement[] memory all = new Achievement[](len);
        for (uint256 i = 0; i < len; ++i) {
            all[i] = achievements[achievementIdsList[i]];
        }
        return all;
    }

    function totalAchievements() external view returns (uint256) {
        return totalAchievementsCount;
    }

    // ── ADMIN FUNCTIONS ──
    function createAchievement(
        uint256 achievementId,
        string memory achName,
        string memory category,
        string memory achUri,
        bool isActive
    ) external onlyOwner {
        if (achievements[achievementId].id != 0) revert("Achievement ID already exists");
        _createAchievement(achievementId, achName, category, achUri, isActive);
    }

    function updateAchievement(
        uint256 achievementId,
        string memory achName,
        string memory category,
        string memory achUri,
        bool isActive
    ) external onlyOwner {
        if (achievements[achievementId].id == 0) revert AchievementNotFound();

        Achievement storage ach = achievements[achievementId];
        ach.name = achName;
        ach.category = category;
        ach.uri = achUri;
        ach.isActive = isActive;

        emit AchievementUpdated(achievementId, achName, category, achUri, isActive);
    }

    function setAchievementActive(uint256 achievementId, bool isActive) external onlyOwner {
        if (achievements[achievementId].id == 0) revert AchievementNotFound();
        achievements[achievementId].isActive = isActive;
        emit AchievementUpdated(
            achievementId,
            achievements[achievementId].name,
            achievements[achievementId].category,
            achievements[achievementId].uri,
            isActive
        );
    }

    function setAchievementUri(uint256 achievementId, string memory achUri) external onlyOwner {
        if (achievements[achievementId].id == 0) revert AchievementNotFound();
        achievements[achievementId].uri = achUri;
        emit URI(achUri, achievementId);
    }

    function setBaseUri(string memory newBaseUri) external onlyOwner {
        baseURI = newBaseUri;
    }

    function setContractUri(string memory newContractUri) external onlyOwner {
        contractURI = newContractUri;
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

    function _createAchievement(
        uint256 achievementId,
        string memory achName,
        string memory category,
        string memory achUri,
        bool isActive
    ) internal {
        achievements[achievementId] = Achievement({
            id: achievementId,
            name: achName,
            category: category,
            uri: achUri,
            isActive: isActive,
            totalClaimed: 0
        });
        achievementIdsList.push(achievementId);
        totalAchievementsCount += 1;

        emit AchievementCreated(achievementId, achName, category, achUri);
        emit URI(achUri, achievementId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
