// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VibeRoyaltyDistributor (Flattened)
 * @dev Distributes $VIBE royalty rewards to verified Vibe Club NFT holders via Merkle Proofs.
 * Each epoch (every 10 days) represents a distinct royalty round with dynamic pool sizes.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

library MerkleProof {
    function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        return processProof(proof, leaf) == root;
    }

    function processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}

contract VibeRoyaltyDistributor is Ownable {
    IERC20 public immutable token;

    // epochId => Merkle root hash
    mapping(uint256 => bytes32) public merkleRoots;

    // epochId => account => claimed status
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event MerkleRootSet(uint256 indexed epochId, bytes32 merkleRoot);
    event RoyaltyClaimed(uint256 indexed epochId, address indexed account, uint256 amount);
    event EmergencyWithdraw(address indexed token, uint256 amount, address indexed recipient);

    /**
     * @param _token Address of $VIBE token on Base (0xb200000000000000000000df24ecb8bf51100a01)
     */
    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @notice Set or update the Merkle root for a specific Royalty epoch (Owner only)
     * @param epochId The index of the royalty round (1, 2, 3, etc.)
     * @param _merkleRoot The 32-byte cryptographic root calculated from the snapshot
     */
    function setMerkleRoot(uint256 epochId, bytes32 _merkleRoot) external onlyOwner {
        require(_merkleRoot != bytes32(0), "Empty merkle root");
        merkleRoots[epochId] = _merkleRoot;
        emit MerkleRootSet(epochId, _merkleRoot);
    }

    /**
     * @notice Claim royalty rewards for a given epoch with valid Merkle proof
     * @param epochId The index of the royalty round
     * @param amount The exact amount of $VIBE in wei allocated in the snapshot
     * @param merkleProof Array of 32-byte hashes verifying eligibility
     */
    function claim(uint256 epochId, uint256 amount, bytes32[] calldata merkleProof) external {
        require(!hasClaimed[epochId][msg.sender], "Already claimed");
        bytes32 root = merkleRoots[epochId];
        require(root != bytes32(0), "Epoch not active");

        // Verify Merkle Proof: leaf = keccak256(abi.encodePacked(msg.sender, epochId, amount))
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, epochId, amount));
        require(MerkleProof.verify(merkleProof, root, leaf), "Invalid proof");

        hasClaimed[epochId][msg.sender] = true;
        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit RoyaltyClaimed(epochId, msg.sender, amount);
    }

    /**
     * @notice Check if a user has already claimed rewards for a specific epoch
     */
    function isClaimed(uint256 epochId, address account) external view returns (bool) {
        return hasClaimed[epochId][account];
    }

    /**
     * @notice Emergency withdraw or sweep unclaimed tokens after claim deadline (Owner only)
     * @param _tokenAddress Address of the token to withdraw
     * @param amount Amount to withdraw to owner wallet
     */
    function emergencyWithdraw(address _tokenAddress, uint256 amount) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token");
        require(IERC20(_tokenAddress).transfer(owner(), amount), "Emergency transfer failed");
        emit EmergencyWithdraw(_tokenAddress, amount, owner());
    }
}
