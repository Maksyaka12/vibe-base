// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VibeClub (Vibe Club)
 * @author Vibe Verse Team
 * @notice Official Base B20 Genesis NFT Collection for Vibe Verse App.
 * @dev 333 total NFTs. Automatic 4-phase pricing:
 *      Phase 1 (103 NFT): 0.005 ETH
 *      Phase 2 (100 NFT): 0.015 ETH
 *      Phase 3 (100 NFT): 0.05 ETH
 *      Phase 4 (30 NFT): 0.1 ETH
 *      Max 1 NFT per wallet. 80% of revenue auto-swaps and burns $VIBE.
 */
contract VibeClub is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // Constants
    uint256 public constant MAX_SUPPLY = 333;
    uint256 public constant MAX_PER_WALLET = 1;

    // Base Ecosystem Addresses (Checksummed)
    address public constant VIBE_TOKEN = 0xb200000000000000000000DF24eCb8bF51100a01;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // VIP Guaranteed Wallets
    address public constant VIP_JERRY = 0x1D78fB87CC62FeBe02CA05beFcc30E71Ca04810C; // Jerry Vibe (#1)
    address public constant VIP_DD = 0xb18c220c813F5A1578F08F7aEcA7fBaAa574e9CA;    // DD Vibe (#2)
    address public constant VIP_JESSE = 0x2211d1D0020DAEA8039E46Cf1367962070d77DA9; // Jesse Vibe (#4)
    address public constant ADMIN_DEV = 0x4C91d3beD372c11795b9cE9A9017Dfe447Bf050A; // MKS Vibe (#3) & Admin

    // Routing & DEX Addresses
    address public swapRouter = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address public aggregatorRouter = 0x6fF5693b99212Da76ad316178A184AB56D299b43;

    // State Variables
    bool public mintLive = true;
    bool public autoSwapEnabled = true;
    string public baseURI;
    string public baseExtension = ".json";

    // Optional manual price override (if 0, uses automated 4-phase calculation)
    uint256 public overrideEthPrice = 0;
    uint256 public vibePrice = 1_000_000 * 10**18;

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
    event PricesOverridden(uint256 newEthPrice, uint256 newVibePrice);

    constructor(
        string memory _initBaseURI
    ) ERC721("Vibe Club", "VIBECLUB") Ownable(msg.sender) {
        baseURI = _initBaseURI;
        _numAvailableTokens = MAX_SUPPLY;
    }

    // ─────────────────────────────────────────────────────────────
    // 📊 AUTOMATED 4-PHASE PRICING
    // ─────────────────────────────────────────────────────────────
    
    /**
     * @notice Returns current active mint phase (1 to 4).
     */
    function getCurrentPhase() public view returns (uint8) {
        if (totalMintedCount < 103) return 1; // Phase 1: 103 NFTs
        if (totalMintedCount < 203) return 2; // Phase 2: 100 NFTs
        if (totalMintedCount < 303) return 3; // Phase 3: 100 NFTs
        return 4;                            // Phase 4: 30 NFTs
    }

    /**
     * @notice Returns current ETH mint price based on phase.
     */
    function getCurrentEthPrice() public view returns (uint256) {
        if (overrideEthPrice > 0) return overrideEthPrice;
        uint8 phase = getCurrentPhase();
        if (phase == 1) return 0.005 ether;
        if (phase == 2) return 0.015 ether;
        if (phase == 3) return 0.05 ether;
        return 0.1 ether;
    }

    // Legacy getter for frontend compatibility
    function ethPrice() external view returns (uint256) {
        return getCurrentEthPrice();
    }

    // ─────────────────────────────────────────────────────────────
    // 🚀 PUBLIC MINT (WITH ETH)
    // ─────────────────────────────────────────────────────────────
    function mintWithETH() external payable nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");
        
        uint256 requiredEth = getCurrentEthPrice();
        require(msg.value >= requiredEth, "Insufficient ETH sent");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "ETH");

        // Swap 100% required ETH to $VIBE & Burn 80%
        if (autoSwapEnabled && requiredEth > 0) {
            _swapEthAndBurn(requiredEth);
        }

        // Refund any excess ETH sent
        if (msg.value > requiredEth) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - requiredEth}("");
            require(refundOk, "Refund failed");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 🚀 PUBLIC MINT (WITH ETH & DYNAMIC AGGREGATOR SWAP DATA)
    // ─────────────────────────────────────────────────────────────
    function mintWithETHAndSwap(bytes calldata swapData) external payable nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");
        
        uint256 requiredEth = getCurrentEthPrice();
        require(msg.value >= requiredEth, "Insufficient ETH sent");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "ETH_SWAP");

        // Execute dynamic swap via aggregator router with provided calldata
        if (swapData.length > 0 && aggregatorRouter != address(0)) {
            uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));
            (bool ok, ) = aggregatorRouter.call{value: requiredEth}(swapData);
            if (ok) {
                uint256 gainedVibe = IERC20(VIBE_TOKEN).balanceOf(address(this)) - initialVibe;
                if (gainedVibe > 0) {
                    uint256 burnAmt = (gainedVibe * 80) / 100;
                    IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmt);
                    emit VibeBurned(burnAmt);
                }
            }
        } else if (autoSwapEnabled && requiredEth > 0) {
            _swapEthAndBurn(requiredEth);
        }

        // Refund any excess ETH sent
        if (msg.value > requiredEth) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - requiredEth}("");
            require(refundOk, "Refund failed");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 🔥 PUBLIC MINT (WITH $VIBE & SLIPPAGE TOLERANCE)
    // ─────────────────────────────────────────────────────────────
    
    /**
     * @notice Mint with custom/slippage-protected $VIBE token amount.
     * @param vibeAmount The exact amount of $VIBE tokens approved and sent.
     */
    function mintWithVIBE(uint256 vibeAmount) public nonReentrant {
        require(mintLive, "Mint is not active");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");
        require(vibeAmount > 0, "Amount must be > 0");

        if (msg.sender != owner() && msg.sender != ADMIN_DEV) {
            require(walletMintCount[msg.sender] < MAX_PER_WALLET, "Exceeds max per wallet");
        }

        // Transfer $VIBE tokens from minter to contract
        IERC20(VIBE_TOKEN).transferFrom(msg.sender, address(this), vibeAmount);

        // Permanently burn 80% to dead address
        uint256 burnAmount = (vibeAmount * 80) / 100;
        IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmount);
        emit VibeBurned(burnAmount);

        uint256 tokenId = _selectTokenForAddress(msg.sender);
        _mintToken(msg.sender, tokenId, "VIBE");
    }

    /**
     * @notice Standard fallback mint with predefined vibePrice.
     */
    function mintWithVIBE() external {
        mintWithVIBE(vibePrice);
    }

    // ─────────────────────────────────────────────────────────────
    // 👑 ADMIN DIRECT MINT (FOR AIRDROPS & REMAINING TOKENS)
    // ─────────────────────────────────────────────────────────────
    function adminMint(address to, uint256 tokenId) external onlyOwner {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid tokenId (1-333)");
        require(!isTokenMinted[tokenId], "Token already minted");
        require(totalMintedCount < MAX_SUPPLY, "Sold out");

        _removeTokenFromPool(tokenId);
        _mintToken(to, tokenId, "ADMIN");
    }

    // ─────────────────────────────────────────────────────────────
    // 🎲 TOKEN SELECTION (VIP RESERVES & FISHER-YATES DRAW)
    // ─────────────────────────────────────────────────────────────
    function _selectTokenForAddress(address minter) internal returns (uint256) {
        // 1. VIP Reserved Wallets
        if (minter == VIP_JERRY && !isTokenMinted[1]) {
            _removeTokenFromPool(1);
            return 1;
        }
        if (minter == VIP_DD && !isTokenMinted[2]) {
            _removeTokenFromPool(2);
            return 2;
        }
        if (minter == VIP_JESSE && !isTokenMinted[4]) {
            _removeTokenFromPool(4);
            return 4;
        }

        // 2. Admin Priority public mints
        if (minter == ADMIN_DEV) {
            if (!isTokenMinted[3]) {
                _removeTokenFromPool(3);
                return 3;
            }
            if (!isTokenMinted[4]) {
                _removeTokenFromPool(4);
                return 4;
            }
        }

        // 3. Regular Public Mint: Random Draw from remaining pool
        return _drawRandomAvailableToken();
    }

    function _drawRandomAvailableToken() internal returns (uint256) {
        require(_numAvailableTokens > 0, "No tokens remaining");

        // Fisher-Yates with pseudorandom seed
        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    msg.sender,
                    _numAvailableTokens,
                    totalMintedCount
                )
            )
        );

        uint256 randomIndex = randomSeed % _numAvailableTokens;
        uint256 valAtIndex = _availableTokens[randomIndex];
        uint256 chosenTokenId = valAtIndex == 0 ? (randomIndex + 1) : valAtIndex;

        // Move last available item to chosen slot
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
    // 🔄 AUTOMATIC ETH TO $VIBE SWAP & 80% BURN VIA O1 ROUTER
    // ─────────────────────────────────────────────────────────────
    function _swapEthAndBurn(uint256 ethAmount) internal {
        if (swapRouter == address(0) || ethAmount == 0) return;

        uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));

        // Call O1 Swap Router: swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient)
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
    // ⚙️ ADMIN SETTERS & SAFEGUARDS
    // ─────────────────────────────────────────────────────────────
    
    /**
     * @notice Override default phase pricing if ever needed. Set to 0 to resume auto-phases.
     */
    function setOverridePrices(uint256 _ethPrice, uint256 _vibePrice) external onlyOwner {
        overrideEthPrice = _ethPrice;
        vibePrice = _vibePrice;
        emit PricesOverridden(_ethPrice, _vibePrice);
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

    function adminSwapAndBurn(uint256 ethAmount, bytes calldata customSwapCalldata) external onlyOwner {
        require(address(this).balance >= ethAmount, "Insufficient ETH balance");
        
        if (customSwapCalldata.length > 0 && aggregatorRouter != address(0)) {
            uint256 initialVibe = IERC20(VIBE_TOKEN).balanceOf(address(this));
            (bool ok, ) = aggregatorRouter.call{value: ethAmount}(customSwapCalldata);
            require(ok, "Custom swap failed");
            uint256 received = IERC20(VIBE_TOKEN).balanceOf(address(this)) - initialVibe;
            if (received > 0) {
                uint256 burnAmt = (received * 80) / 100;
                IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, burnAmt);
                emit VibeBurned(burnAmt);
            }
        } else {
            _swapEthAndBurn(ethAmount);
        }
    }

    function executeManualBurn(uint256 vibeAmount) external onlyOwner {
        require(IERC20(VIBE_TOKEN).balanceOf(address(this)) >= vibeAmount, "Insufficient VIBE in contract");
        IERC20(VIBE_TOKEN).transfer(BURN_ADDRESS, vibeAmount);
        emit VibeBurned(vibeAmount);
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool ok, ) = payable(owner()).call{value: balance}("");
        require(ok, "ETH transfer failed");
    }

    function withdrawVIBE() external onlyOwner {
        uint256 balance = IERC20(VIBE_TOKEN).balanceOf(address(this));
        require(balance > 0, "No VIBE to withdraw");
        IERC20(VIBE_TOKEN).transfer(owner(), balance);
    }

    function withdrawERC20(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No token balance");
        IERC20(token).transfer(owner(), balance);
    }

    // ─────────────────────────────────────────────────────────────
    // 🌐 METADATA VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
            ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), baseExtension))
            : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function getRemainingTokens() external view returns (uint256) {
        return _numAvailableTokens;
    }

    receive() external payable {}
}
