// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VibeDailyCheckIn
 * @notice Official On-Chain Daily Check-In & Streak Contract for Vibe Hub on Base.
 *         Users perform daily on-chain check-ins to build streaks, participate in leaderboards,
 *         and earn on-chain verifiable activity with ERC-8021 Base Builder Code attribution.
 */
contract VibeDailyCheckIn {
    address public owner;
    bool public paused;

    // Global Statistics
    uint256 public totalUsers;
    uint256 public totalGlobalCheckIns;

    struct UserCheckInInfo {
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 totalCheckIns;
        uint256 lastCheckInTimestamp;
        uint256 lastCheckInDay; // UTC calendar day index: block.timestamp / 86400
    }

    // Mapping from user address => their check-in details
    mapping(address => UserCheckInInfo) public userCheckIns;

    // Authorized operators / relayers (e.g. backend bots or AI agents)
    mapping(address => bool) public operators;

    // Events
    event CheckedIn(
        address indexed user,
        uint256 currentStreak,
        uint256 totalCheckIns,
        uint256 timestamp
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool authorized);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // Errors
    error AlreadyCheckedInToday();
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
    }

    /**
     * @notice Performs the daily on-chain check-in for the caller.
     * @dev Increments streak if consecutive UTC day, resets to 1 if day missed or first time.
     */
    function checkIn() external whenNotPaused {
        _processCheckIn(msg.sender);
    }

    /**
     * @notice Alternative function name alias for claim-style interface.
     */
    function claimCheckIn() external whenNotPaused {
        _processCheckIn(msg.sender);
    }

    /**
     * @notice Performs check-in on behalf of a user (authorized operator/agent only).
     * @param user Target user address.
     */
    function checkInFor(address user) external onlyOperator whenNotPaused {
        if (user == address(0)) revert InvalidAddress();
        _processCheckIn(user);
    }

    /**
     * @dev Internal check-in execution logic.
     */
    function _processCheckIn(address user) internal {
        uint256 currentDay = block.timestamp / 1 days;
        UserCheckInInfo storage info = userCheckIns[user];

        if (info.lastCheckInDay == currentDay) {
            revert AlreadyCheckedInToday();
        }

        if (info.totalCheckIns == 0) {
            totalUsers += 1;
        }

        if (info.lastCheckInDay != 0 && info.lastCheckInDay + 1 == currentDay) {
            // Checked in on the consecutive UTC day -> increment streak
            info.currentStreak += 1;
        } else {
            // First check-in OR missed one or more days -> reset streak to 1
            info.currentStreak = 1;
        }

        if (info.currentStreak > info.longestStreak) {
            info.longestStreak = info.currentStreak;
        }

        info.totalCheckIns += 1;
        info.lastCheckInDay = currentDay;
        info.lastCheckInTimestamp = block.timestamp;
        totalGlobalCheckIns += 1;

        emit CheckedIn(user, info.currentStreak, info.totalCheckIns, block.timestamp);
    }

    /**
     * @notice Returns comprehensive check-in info for a user.
     * @param user Address to inspect.
     * @return currentStreak Current active streak (0 if expired).
     * @return longestStreak Best historical streak recorded.
     * @return totalCheckIns Total count of check-ins completed.
     * @return lastCheckInTimestamp Unix timestamp of last check-in.
     * @return canCheckInToday Boolean indicating if user can check in now.
     * @return secondsUntilNextCheckIn Seconds until next UTC day (0 if canCheckInToday is true).
     */
    function getCheckInInfo(address user) external view returns (
        uint256 currentStreak,
        uint256 longestStreak,
        uint256 totalCheckIns,
        uint256 lastCheckInTimestamp,
        bool canCheckInToday,
        uint256 secondsUntilNextCheckIn
    ) {
        UserCheckInInfo memory info = userCheckIns[user];
        uint256 currentDay = block.timestamp / 1 days;

        canCheckInToday = (info.lastCheckInDay != currentDay);

        // If user missed consecutive day, display active streak as 0 until they check in
        if (info.lastCheckInDay != 0 && currentDay > info.lastCheckInDay + 1) {
            currentStreak = 0;
        } else {
            currentStreak = info.currentStreak;
        }

        longestStreak = info.longestStreak;
        totalCheckIns = info.totalCheckIns;
        lastCheckInTimestamp = info.lastCheckInTimestamp;

        if (!canCheckInToday) {
            uint256 nextDayTimestamp = (info.lastCheckInDay + 1) * 1 days;
            if (nextDayTimestamp > block.timestamp) {
                secondsUntilNextCheckIn = nextDayTimestamp - block.timestamp;
            } else {
                secondsUntilNextCheckIn = 0;
            }
        } else {
            secondsUntilNextCheckIn = 0;
        }
    }

    /**
     * @notice Quick check whether user can check in today.
     * @param user Address to inspect.
     */
    function canCheckIn(address user) external view returns (bool) {
        return userCheckIns[user].lastCheckInDay != (block.timestamp / 1 days);
    }

    // --- Admin Functions ---

    /**
     * @notice Transfers ownership of the contract to a new address.
     * @param newOwner Address of the new owner.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * @notice Authorizes or revokes an operator address (e.g. backend relayer).
     */
    function setOperator(address operator, bool authorized) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();
        operators[operator] = authorized;
        emit OperatorUpdated(operator, authorized);
    }

    /**
     * @notice Emergency pause check-ins.
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Resume check-ins.
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
