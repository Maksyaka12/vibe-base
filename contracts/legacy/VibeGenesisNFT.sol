// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VibeGenesisNFT
 * @dev Genesis NFT Collection for VibeVerse on Base (Total 333 NFTs).
 * 
 * Features:
 * - 333 Total Supply.
 * - 1 NFT max per standard wallet.
 * - Random O(1) Fisher-Yates Minting for public users.
 * - VIP Address-Reserved Mints:
 *     - 0x1D78fB87CC62FeBe02CA05beFcc30E71Ca04810C -> Token #1 (Jerry Vibe)
 *     - 0xb18c220c813F5A1578F08F7aEcA7fBaAa574e9CA -> Token #2 (DD Vibe)
 *     - 0x2211d1D0020DAEA8039E46Cf1367962070d77DA9 -> Token #4 (Jesse Vibe)
 * - Admin Special Mint Privileges:
 *     - Admin wallet can mint any specific available Token ID to any address (adminMint).
 *     - Admin public mint priority: 1st mint = Token #3 (MKS Vibe), 2nd mint = Token #4 (Jesse Vibe).
 * - Payment Options:
 *     - $VIBE: 80% auto-burn to 0x00...dEaD, 20% stays in contract.
 *     - ETH: 100% ETH swapped to $VIBE via O1 Router, 80% burned to 0x00...dEaD, 20% stays in contract.
 * - ERC-8021 / Base Builder Code: bc_wsbqqe2u.
 */
contract VibeGenesisNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 333;
    uint256 public constant MAX_PER_WALLET = 1;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // Base Mainnet Checksummed Addresses
    address public constant VIBE_TOKEN = 0xb200000000000000000000DF24eCb8bF51100a01;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public swapRouter = 0x498581fF718922c3f8e6A244956aF099B2652b2b; // O1 Core Pool on Base
    address public aggregatorRouter = 0x6fF5693b99212Da76ad316178A184AB56D299b43; // KyberSwap / O1 Aggregator Router on Base

    // VIP Reserved Wallets
    address public constant VIP_JERRY = 0x1D78fB87CC62FeBe02CA05beFcc30E71Ca04810C;
    address public constant VIP_DD    = 0xb18c220c813F5A1578F08F7aEcA7fBaAa574e9CA;
    address public constant VIP_JESSE = 0x2211d1D0020DAEA8039E46Cf1367962070d77DA9;
    address public constant ADMIN_DEV = 0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a;

    // Pricing & State
    uint256 public ethPrice = 0.005 ether;
    uint256 public vibePrice = 1_000_000 * 10**18;
    bool public mintLive = true;
    bool public autoSwapEnabled = true;
    string public baseURI;
    string public baseExtension = ".json";

    uint256 public totalMintedCount;
    mapping(address => uint256) public walletMintCount;
    mapping(uint256 => bool) public isTokenMinted;

    // O(1) Random Drawing State (Fisher-Yates)
    mapping(uint256 => uint256) private _availableTokens;
    uint256 private _numAvailableTokens;

    // Events
    event Minted(address indexed minter, address indexed recipient, uint256 indexed tokenId, string paymentMethod);
    event VibeBurned(uint256 amount);
    event BaseURISet(string newBaseURI);

    constructor(
        string memory _initBaseURI
    ) ERC721("Vibe Club Genesis", "VIBECLUB") Ownable(msg.sender) {
        baseURI = _initBaseURI;
        _numAvailableTokens = MAX_SUPPLY;
    }

    // ─────────────────────────────────────────────────────────────
    // 🚀 PUBLIC MINT (WITH ETH)
    // ─────────────────────────────────────────────────────────────
    function mintWithETH() external payable nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");
        require(msg.value >= ethPrice, "Insufficient ETH sent");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "ETH");

        // Swap 100% ETH to $VIBE & Burn 80%
        if (autoSwapEnabled && ethPrice > 0) {
            _swapEthAndBurn(ethPrice);
        }

        // Refund any excess ETH sent
        if (msg.value > ethPrice) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - ethPrice}("");
            require(refundOk, "Refund failed");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 🚀 PUBLIC MINT (WITH ETH & DYNAMIC AGGREGATOR SWAP DATA)
    // ─────────────────────────────────────────────────────────────
    function mintWithETHAndSwap(bytes calldata swapData) external payable nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");
        require(msg.value >= ethPrice, "Insufficient ETH sent");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "ETH_SWAP");

        // Execute dynamic swap via aggregator router with provided calldata
        if (swapData.length > 0 && aggregatorRouter != address(0)) {
            uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));
            (bool ok, ) = aggregatorRouter.call{value: ethPrice}(swapData);
            if (ok) {
                uint256 gainedVibe = IERC20(VIBE_TOKEN).balanceOf(address(this)) - initialVibe;
                if (gainedVibe > 0) {
                    uint256 burnAmt = (gainedVibe * 80) / 100;
                    IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmt);
                    emit VibeBurned(burnAmt);
                }
            }
        } else if (autoSwapEnabled && ethPrice > 0) {
            _swapEthAndBurn(ethPrice);
        }

        // Refund any excess ETH sent
        if (msg.value > ethPrice) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - ethPrice}("");
            require(refundOk, "Refund failed");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 🚀 PUBLIC MINT (WITH $VIBE)
    // ─────────────────────────────────────────────────────────────
    function mintWithVIBE() external nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "VIBE");

        // Transfer $VIBE from user
        uint256 burnAmount = (vibePrice * 80) / 100;
        uint256 treasuryAmount = vibePrice - burnAmount;

        // 80% sent directly to burn address
        IERC20(VIBE_TOKEN).transferFrom(msg.sender, BURN_ADDRESS, burnAmount);
        // 20% stays in contract
        IERC20(VIBE_TOKEN).transferFrom(msg.sender, address(this), treasuryAmount);

        emit VibeBurned(burnAmount);
    }

    // ─────────────────────────────────────────────────────────────
    // 👑 ADMIN MINT SPECIFIC TOKEN TO ANY ADDRESS
    // ─────────────────────────────────────────────────────────────
    function adminMint(address to, uint256 tokenId) external onlyOwner nonReentrant {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid tokenId (1-333)");
        require(!isTokenMinted[tokenId], "Token already minted");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");

        _removeTokenFromPool(tokenId);
        _mintToken(to, tokenId, "ADMIN_DIRECT");
    }

    // ─────────────────────────────────────────────────────────────
    // 🎲 TOKEN SELECTION LOGIC
    // ─────────────────────────────────────────────────────────────
    function _selectTokenForAddress(address minter) internal returns (uint256) {
        // VIP 1: Jerry Vibe (#1)
        if (minter == VIP_JERRY && !isTokenMinted[1]) {
            _removeTokenFromPool(1);
            return 1;
        }

        // VIP 2: DD Vibe (#2)
        if (minter == VIP_DD && !isTokenMinted[2]) {
            _removeTokenFromPool(2);
            return 2;
        }

        // VIP 4: Jesse Vibe (#4)
        if (minter == VIP_JESSE && !isTokenMinted[4]) {
            _removeTokenFromPool(4);
            return 4;
        }

        // Admin public flow: 1st mint = #3, 2nd mint = #4 (if not already minted)
        if (minter == owner() || minter == ADMIN_DEV) {
            if (!isTokenMinted[3]) {
                _removeTokenFromPool(3);
                return 3;
            }
            if (!isTokenMinted[4]) {
                _removeTokenFromPool(4);
                return 4;
            }
        }

        // Standard Random Draw for all other users
        return _drawRandomToken();
    }

    function _drawRandomToken() internal returns (uint256) {
        require(_numAvailableTokens > 0, "No tokens remaining");

        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    totalMintedCount,
                    _numAvailableTokens
                )
            )
        );

        uint256 randomIndex = seed % _numAvailableTokens;
        uint256 valAtIndex = _availableTokens[randomIndex];
        uint256 chosenTokenId = valAtIndex == 0 ? (randomIndex + 1) : valAtIndex;

        // Swap with last available token
        uint256 lastIndex = _numAvailableTokens - 1;
        uint256 valAtLast = _availableTokens[lastIndex];
        uint256 lastTokenId = valAtLast == 0 ? (lastIndex + 1) : valAtLast;

        _availableTokens[randomIndex] = lastTokenId;
        _numAvailableTokens--;

        return chosenTokenId;
    }

    function _removeTokenFromPool(uint256 tokenId) internal {
        for (uint256 i = 0; i < _numAvailableTokens; i++) {
            uint256 current = _availableTokens[i] == 0 ? (i + 1) : _availableTokens[i];
            if (current == tokenId) {
                uint256 lastIndex = _numAvailableTokens - 1;
                uint256 lastToken = _availableTokens[lastIndex] == 0 ? (lastIndex + 1) : _availableTokens[lastIndex];
                _availableTokens[i] = lastToken;
                _numAvailableTokens--;
                return;
            }
        }
    }

    function _mintToken(address to, uint256 tokenId, string memory paymentMethod) internal {
        isTokenMinted[tokenId] = true;
        totalMintedCount++;
        walletMintCount[to]++;

        _safeMint(to, tokenId);
        emit Minted(msg.sender, to, tokenId, paymentMethod);
    }

    // ─────────────────────────────────────────────────────────────
    // 🔄 O1 ROUTER ETH -> $VIBE SWAP & 80% BURN
    // ─────────────────────────────────────────────────────────────
    function _swapEthAndBurn(uint256 ethAmount) internal {
        if (ethAmount == 0 || swapRouter == address(0)) return;

        uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));

        // Call O1 router swap method
        (bool success, ) = swapRouter.call{value: ethAmount}(
            abi.encodeWithSignature(
                "swap(address,address,uint256,uint256,address)",
                0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, // ETH
                VIBE_TOKEN,
                ethAmount,
                0,
                address(this)
            )
        );

        if (success) {
            uint256 currentVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));
            if (currentVibe > initialVibe) {
                uint256 received = currentVibe - initialVibe;
                uint256 burnAmount = (received * 80) / 100;
                IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmount);
                emit VibeBurned(burnAmount);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ⚙️ ADMIN SETTERS, MANUAL SWAP & WITHDRAWALS
    // ─────────────────────────────────────────────────────────────
    function setPrices(uint256 _ethPrice, uint256 _vibePrice) external onlyOwner {
        ethPrice = _ethPrice;
        vibePrice = _vibePrice;
    }

    function setMintLive(bool _live) external onlyOwner {
        mintLive = _live;
    }

    function setAutoSwapEnabled(bool _enabled) external onlyOwner {
        autoSwapEnabled = _enabled;
    }

    function setSwapRouter(address _newRouter) external onlyOwner {
        swapRouter = _newRouter;
    }

    function setAggregatorRouter(address _newAggregator) external onlyOwner {
        aggregatorRouter = _newAggregator;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    function setBaseExtension(string memory _ext) external onlyOwner {
        baseExtension = _ext;
    }

    function adminSwapAndBurn(uint256 ethAmount, bytes calldata swapData) external onlyOwner nonReentrant {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        if (swapData.length > 0 && aggregatorRouter != address(0)) {
            uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));
            (bool ok, ) = aggregatorRouter.call{value: ethAmount}(swapData);
            require(ok, "Aggregator swap failed");
            uint256 gained = IERC20(VIBE_TOKEN).balanceOf(address(this)) - initialVibe;
            if (gained > 0) {
                uint256 burnAmt = (gained * 80) / 100;
                IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmt);
                emit VibeBurned(burnAmt);
            }
        } else {
            _swapEthAndBurn(ethAmount);
        }
    }

    function executeManualBurn(uint256 vibeAmount) external onlyOwner {
        require(vibeAmount > 0, "Zero amount");
        IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, vibeAmount);
        emit VibeBurned(vibeAmount);
    }

    function withdrawETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "ETH transfer failed");
    }

    function withdrawVIBE() external onlyOwner nonReentrant {
        uint256 balance = IERC20(VIBE_TOKEN).balanceOf(address(this));
        require(balance > 0, "No VIBE to withdraw");
        IERC20(VIBE_TOKEN).transfer(owner(), balance);
    }

    function withdrawERC20(address token) external onlyOwner nonReentrant {
        require(token != address(0), "Invalid token address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        IERC20(token).transfer(owner(), balance);
    }

    // ─────────────────────────────────────────────────────────────
    // 🖼️ METADATA TOKEN URI
    // ─────────────────────────────────────────────────────────────
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, tokenId.toString(), baseExtension))
            : "";
    }

    function getRemainingTokens() external view returns (uint256) {
        return _numAvailableTokens;
    }

    receive() external payable {}
}
