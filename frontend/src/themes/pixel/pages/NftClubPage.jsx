import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther } from 'viem';
import { useUserBalances } from '../../../hooks/useUserBalances';
import { useVibeNftContract, NFT_CONTRACT_ADDRESS, OPENSEA_COLLECTION_URL } from '../../../hooks/useVibeNftContract';
import nftNames from '../../../data/nftNames.json';
import { publicClient } from '../../../config/rpc';
import { findMintedVibeClubNft, findOwnedVibeClubNfts, rememberMintedVibeClubNft, fetchVibePerEth, fetchNftBurned } from '../../../data/vibeClubNft';
import { useVibeWallets } from '../../../hooks/useVibeWallets';

// Pixel SVG Wallet Icon
const WalletSvgIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <rect x="2" y="6" width="20" height="13" rx="2" />
    <path d="M16 12.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" fill="currentColor" />
    <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
  </svg>
);

// NFT Deck strictly from #5 to #35 (31 NFTs)
const NFT_DECK = Array.from({ length: 31 }, (_, i) => i + 5);

export default function NftClubPage({ isEmbeddedInBaseApp = false } = {}) {
  const { login, logout, authenticated, user } = usePrivy();
  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const walletAddress = vibeActiveAddress;
  const balances = useUserBalances(walletAddress);

  const {
    totalMinted,
    remainingTokens,
    maxSupply,
    currentPhase,
    ethPriceFormatted,
    contractEthBalance,
    totalOnChainVibeBurned,
    hasMinted,
    isMintingEth,
    isMintingVibe,
    isApprovingVibe,
    isAdminSwapping,
    adminSwapSuccess,
    adminTxHash,
    aggregatorRouterAddress,
    isSettingRouter,
    setRouterSuccess,
    isWithdrawingEth,
    withdrawSuccess,
    isWithdrawingVibe,
    withdrawVibeSuccess,
    contractVibeBalance,
    isAdminPaidMinting,
    adminPaidMintSuccess,
    adminPaidMintedTokenId,
    adminPaidRecipient,
    txHash,
    lastMintedId,
    errorMessage,
    mintSuccess,
    mintWithETH,
    mintWithVIBE,
    executeAdminSwapAndBurn,
    executeSetAggregatorRouter,
    executeWithdrawEth,
    executeWithdrawVibe,
    executeAdminPaidMintWithEth,
    executeAdminPaidMintWithVibe
  } = useVibeNftContract();

  const [deckIndex, setDeckIndex] = useState(0);
  const [vibePerEthRatio, setVibePerEthRatio] = useState(null); // $VIBE per 1 ETH, null until the pool price loads
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [adminEthInput, setAdminEthInput] = useState('0.005');
  const [adminGiveawayRecipient, setAdminGiveawayRecipient] = useState('');

  const isAdmin = walletAddress?.toLowerCase() === '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

  // Auto show success modal when mint completes
  useEffect(() => {
    if (mintSuccess) {
      setShowSuccessModal(true);
    }
  }, [mintSuccess]);

  // Live $VIBE per ETH from the VIBE/ETH pool; the $VIBE mint stays disabled until it is known.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const ratio = await fetchVibePerEth();
      if (isMounted && ratio) setVibePerEthRatio(ratio);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // $VIBE the contract actually burned (onchain transfers to the burn address, via /api/nft-burned).
  const [burnedOnchain, setBurnedOnchain] = useState(null);
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const burned = await fetchNftBurned();
      if (isMounted && burned !== null) setBurnedOnchain(burned);
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Smooth horizontal slide loop: slides to next card every 2.0s
  useEffect(() => {
    const timer = setInterval(() => {
      setDeckIndex((prev) => (prev + 1) % NFT_DECK.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Current dynamic $VIBE price based on active phase
  const ethPriceNum = parseFloat(ethPriceFormatted) || 0.005;
  const currentDynamicVibeAmount = vibePerEthRatio ? Math.floor(ethPriceNum * vibePerEthRatio) : null;

  // Fixed baseline at 110 mints (Phase 1 + Phase 2 real burns) + exact 4x new 20% VIBE accumulated in contract
  const HISTORICAL_BURNED_VIBE = 16407500;
  const BASELINE_CONTRACT_VIBE = 99140.6;

  const currentContractVibe = parseFloat(contractVibeBalance || 0);
  const newVibeAccumulated = Math.max(0, currentContractVibe - BASELINE_CONTRACT_VIBE);
  // Onchain total when /api/nft-burned answers, otherwise the old estimate
  const totalVibeBurnedByContract = burnedOnchain !== null ? Math.floor(burnedOnchain) : Math.floor(HISTORICAL_BURNED_VIBE + (newVibeAccumulated * 4));

  const currentNftId = NFT_DECK[deckIndex];

  // Clean character name without duplicate numbers
  const rawCharacterName = nftNames[currentNftId] || 'Maltipoo';
  const cleanCharacterName = rawCharacterName.replace(/^#\d+\s*/, '').replace(/#\d+/, '').trim() || 'VIBE';

  const [testMintedId, setTestMintedId] = useState(null);

  // Details for Minted NFT Modal
  // The NFT on the mint card: the one minted in this session, else the one this wallet minted earlier
  // (saved on this device or looked up via /api/minted-nft), else the one it holds now.
  const [knownMintedId, setKnownMintedId] = useState(null);
  useEffect(() => {
    setKnownMintedId(null);
    if (!walletAddress || !hasMinted) return;
    let cancelled = false;
    (async () => {
      let id = await findMintedVibeClubNft(walletAddress);
      if (!id) id = (await findOwnedVibeClubNfts(publicClient, walletAddress).catch(() => null))?.[0] || null;
      if (!cancelled) setKnownMintedId(id);
    })();
    return () => { cancelled = true; };
  }, [walletAddress, hasMinted]);

  // Remember a fresh mint on this device (only the user's own mint, not admin mints for others).
  useEffect(() => {
    if (mintSuccess && lastMintedId) rememberMintedVibeClubNft(walletAddress, lastMintedId);
  }, [mintSuccess, lastMintedId, walletAddress]);

  const modalNftId = testMintedId || lastMintedId || knownMintedId;
  const modalRawName = nftNames[modalNftId] || 'Maltipoo';
  const modalCleanName = modalRawName.replace(/^#\d+\s*/, '').replace(/#\d+/, '').trim() || 'VIBE';

  const formatVibeComma = (amount) => {
    return Math.floor(Number(amount || 0)).toLocaleString('en-US') + ' $VIBE';
  };

  // Download / Save NFT Image to device gallery
  const handleSaveImage = async () => {
    const imageUrl = `/nft/images/${modalNftId}.png`;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `Vibe_Club_${modalNftId}.png`, { type: 'image/png' });

      // 1. Try Native Mobile Web Share (Direct save to iOS Photos / Android Gallery)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Vibe Club #${modalNftId}`,
            text: `Vibe Club #${modalNftId} NFT`
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
        }
      }

      // 2. Standard Browser Download fallback
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Vibe_Club_${modalNftId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      window.open(imageUrl, '_blank');
    }
  };

  // Share on X (Twitter Intent with rich formatting)
  const handleShareOnX = () => {
    const tweetText = `I JOINED 333 VIBE CLUB 🐶🔥\n\nVibe Club Member #${modalNftId} ${modalCleanName} 🐶✅\n\nNow I’m eligible to claim royalties every 10 days\n\nOfficial $VIBE B20 NFT collection with utility\nJoin Club → https://vibeverse.dog/vibeclub`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Target Launch: August 15, 2026 17:00:00 UTC
  const LAUNCH_TIMESTAMP = Date.UTC(2026, 7, 15, 17, 0, 0);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeRemainingMs = Math.max(0, LAUNCH_TIMESTAMP - currentTime);
  const isLaunchLive = timeRemainingMs <= 0;

  const isBypassPreview = typeof window !== 'undefined' && (
    window.location.search.includes('preview') ||
    window.location.search.includes('admin') ||
    window.location.search.includes('dev')
  );

  const showLockScreen = !isLaunchLive && !isAdmin && !isBypassPreview;

  const totalRemainingSec = Math.floor(timeRemainingMs / 1000);
  const countdownHours = String(Math.floor(totalRemainingSec / 3600)).padStart(2, '0');
  const countdownMins = String(Math.floor((totalRemainingSec % 3600) / 60)).padStart(2, '0');
  const countdownSecs = String(totalRemainingSec % 60).padStart(2, '0');

  const handleMintWithVibeClick = () => {
    if (!currentDynamicVibeAmount) return;
    const vibeWei = parseEther(currentDynamicVibeAmount.toString());
    mintWithVIBE(vibeWei);
  };

  // 100% Reliable Image Fallback Handler for Mobile & Web
  const handleImageError = (e, id) => {
    if (!e.target.src.includes('pinata.cloud')) {
      e.target.src = `https://gateway.pinata.cloud/ipfs/bafybeifoc434thlscysnqvy45idxfjn7g7qjtedntek3rckn3vukffczxe/${id}.png`;
    } else if (!e.target.src.includes('ipfs.io')) {
      e.target.src = `https://ipfs.io/ipfs/bafybeifoc434thlscysnqvy45idxfjn7g7qjtedntek3rckn3vukffczxe/${id}.png`;
    }
  };

  if (showLockScreen) {
    return (
      <div style={{
        minHeight: isEmbeddedInBaseApp ? 'calc(100vh - 120px)' : '100vh',
        width: '100%',
        background: isEmbeddedInBaseApp ? 'transparent' : 'radial-gradient(circle at 50% 30%, #041430 0%, #020b1a 70%, #000511 100%)',
        color: '#fff',
        fontFamily: 'var(--vv-pixel)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        textTransform: 'uppercase'
      }}>
        {/* Inline animation keyframes */}
        <style>{`
          @keyframes vvPulseDotAnimation {
            0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00ff88; }
            50% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 12px #00ff88, 0 0 20px #00ff88; }
            100% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00ff88; }
          }
          .vv-lock-pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00ff88;
            display: inline-block;
            animation: vvPulseDotAnimation 1.6s infinite ease-in-out;
          }
          @media (max-width: 768px) {
            .vv-lock-title {
              font-size: 16px !important;
              line-height: 1.4 !important;
            }
            .vv-lock-badge {
              font-size: 8px !important;
              padding: 6px 12px !important;
            }
            .vv-timer-box {
              padding: 12px 14px !important;
              min-width: 58px !important;
            }
            .vv-timer-digit {
              font-size: 20px !important;
            }
          }
        `}</style>

        {/* Top Right Header with Connect Wallet (Allows Admin to connect and instantly bypass) */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10
        }}>
          {authenticated ? (
            <button
              onClick={logout}
              style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '8px',
                background: 'rgba(0, 245, 255, 0.12)',
                border: '1.5px solid #00f5ff',
                color: '#00ff88',
                padding: '8px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <WalletSvgIcon size={12} /> {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={login}
              style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '8px',
                background: 'linear-gradient(135deg, #00f5ff, #00b8ff)',
                color: '#020b1a',
                border: '1.5px solid #ffffff',
                padding: '8px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <WalletSvgIcon size={12} /> CONNECT WALLET
            </button>
          )}
        </div>

        {/* Background Map Glow */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0, 245, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Mascot Logo */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <img
            src="/vibe-logo.png"
            alt="VIBE"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              border: '3px solid #00f5ff',
              boxShadow: '0 0 32px rgba(0, 245, 255, 0.5)'
            }}
          />
        </div>

        {/* Title */}
        <h1 className="vv-lock-title" style={{
          fontFamily: 'var(--vv-pixel)',
          fontSize: '22px',
          color: '#00f5ff',
          textShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
          marginBottom: '14px',
          maxWidth: '750px',
          lineHeight: 1.4,
          letterSpacing: '0.5px'
        }}>
          VIBE CLUB IS COMING
        </h1>

        {/* Green Badge */}
        <div className="vv-lock-badge" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 255, 136, 0.12)',
          border: '1.5px solid #00ff88',
          color: '#00ff88',
          borderRadius: '20px',
          padding: '8px 18px',
          fontSize: '9.5px',
          fontFamily: 'var(--vv-pixel)',
          letterSpacing: '0.6px',
          marginBottom: '32px',
          boxShadow: '0 0 18px rgba(0, 255, 136, 0.25)',
          whiteSpace: 'nowrap'
        }}>
          <span className="vv-lock-pulse-dot" />
          <span>VIBE VERSE: GENESIS PHASE</span>
        </div>

        {/* Pixel Countdown Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div className="vv-timer-box" style={{
            background: 'rgba(2, 11, 26, 0.92)',
            border: '2px solid #00f5ff',
            borderRadius: '14px',
            padding: '16px 22px',
            minWidth: '76px',
            boxShadow: '0 0 24px rgba(0, 245, 255, 0.35)',
            textAlign: 'center'
          }}>
            <div className="vv-timer-digit" style={{ fontSize: '26px', color: '#00f5ff', textShadow: '0 0 16px #00f5ff' }}>
              {countdownHours}
            </div>
            <div style={{ fontSize: '7.5px', color: '#88aacc', marginTop: '4px', letterSpacing: '0.5px' }}>HOURS</div>
          </div>

          <span style={{ fontSize: '24px', color: '#ffd700' }}>:</span>

          <div className="vv-timer-box" style={{
            background: 'rgba(2, 11, 26, 0.92)',
            border: '2px solid #ffd700',
            borderRadius: '14px',
            padding: '16px 22px',
            minWidth: '76px',
            boxShadow: '0 0 24px rgba(255, 215, 0, 0.35)',
            textAlign: 'center'
          }}>
            <div className="vv-timer-digit" style={{ fontSize: '26px', color: '#ffd700', textShadow: '0 0 16px #ffd700' }}>
              {countdownMins}
            </div>
            <div style={{ fontSize: '7.5px', color: '#88aacc', marginTop: '4px', letterSpacing: '0.5px' }}>MINS</div>
          </div>

          <span style={{ fontSize: '24px', color: '#ffd700' }}>:</span>

          <div className="vv-timer-box" style={{
            background: 'rgba(2, 11, 26, 0.92)',
            border: '2px solid #ff007f',
            borderRadius: '14px',
            padding: '16px 22px',
            minWidth: '76px',
            boxShadow: '0 0 24px rgba(255, 0, 127, 0.35)',
            textAlign: 'center'
          }}>
            <div className="vv-timer-digit" style={{ fontSize: '26px', color: '#ff007f', textShadow: '0 0 16px #ff007f' }}>
              {countdownSecs}
            </div>
            <div style={{ fontSize: '7.5px', color: '#88aacc', marginTop: '4px', letterSpacing: '0.5px' }}>SECS</div>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '9px',
          color: '#88aacc',
          letterSpacing: '0.8px',
          fontFamily: 'var(--vv-pixel)',
          lineHeight: 1.6
        }}>
          PUBLIC MINT LAUNCHES AT 17:00 UTC • 333 TOTAL SUPPLY • FCFS
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: isEmbeddedInBaseApp ? 'auto' : '100vh',
      background: isEmbeddedInBaseApp ? 'transparent' : 'radial-gradient(circle at 50% 10%, #041430 0%, #020b1a 70%, #000511 100%)',
      color: '#fff',
      fontFamily: 'var(--vv-pixel)',
      paddingBottom: isEmbeddedInBaseApp ? '0px' : '80px',
      overflowX: 'hidden',
      textTransform: 'uppercase',
      width: '100%'
    }}>
      {/* Inline animation & Mobile CSS Override */}
      <style>{`
        @keyframes vvPulseDotAnimation {
          0% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00ff88; }
          50% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 12px #00ff88, 0 0 20px #00ff88; }
          100% { transform: scale(0.9); opacity: 0.7; box-shadow: 0 0 4px #00ff88; }
        }
        .vv-pulse-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          display: inline-block;
          animation: vvPulseDotAnimation 1.6s infinite ease-in-out;
        }

        /* ── MOBILE SPECIFIC STYLES (< 768px) ── */
        @media (max-width: 768px) {
          .vv-opensea-btn {
            display: none !important;
          }
          .vv-desktop-phase-row {
            display: none !important;
          }
          .vv-mobile-phase-row {
            display: flex !important;
          }
          .vv-nft-club-header {
            padding: 12px 14px !important;
          }
          .vv-nft-club-header-subtext {
            white-space: nowrap !important;
            font-size: 7px !important;
          }
          .vv-nft-club-container {
            padding: 0 !important;
            margin-top: 0 !important;
          }
          .vv-nft-club-main-card {
            padding: 16px 14px !important;
            border-radius: 16px !important;
          }
          .vv-nft-club-main-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            margin-bottom: 20px !important;
          }
          .vv-nft-card-frame {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .vv-nft-phase-row {
            padding: 12px 14px !important;
          }
          .vv-nft-phase-text {
            font-size: 8px !important;
            font-weight: 400 !important;
            letter-spacing: 0px !important;
            white-space: nowrap !important;
          }
          .vv-nft-phase-prices {
            font-size: 8px !important;
            font-weight: 400 !important;
            letter-spacing: 0px !important;
            white-space: nowrap !important;
          }
          .vv-phase-vibe-part {
            display: none !important;
          }
          .vv-faq-section-title {
            font-size: 12px !important;
            font-weight: 400 !important;
            letter-spacing: 0px !important;
            white-space: nowrap !important;
          }
          .vv-faq-card {
            padding: 16px 14px !important;
          }
          .vv-faq-title {
            font-size: 9px !important;
            font-weight: 400 !important;
            letter-spacing: 0px !important;
          }
          .vv-faq-text {
            font-size: 8px !important;
            font-weight: 400 !important;
            letter-spacing: 0px !important;
          }
          .vv-desktop-wallet-btn {
            display: none !important;
          }
          .vv-mobile-wallet-btn {
            display: flex !important;
          }
        }

        @media (min-width: 769px) {
          .vv-mobile-phase-row {
            display: none !important;
          }
          .vv-desktop-phase-row {
            display: flex !important;
          }
          .vv-mobile-wallet-btn {
            display: none !important;
          }
          /* Desktop enlarged fonts & comfortable padding for right column */
          .vv-nft-ctrl-card {
            padding: 13px 18px !important;
          }
          .vv-nft-ctrl-label {
            font-size: 10.5px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-ctrl-val {
            font-size: 13px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-ctrl-row {
            margin-bottom: 8px !important;
          }
          .vv-nft-burned-card {
            padding: 12px 18px !important;
          }
          .vv-nft-burned-label {
            font-size: 10px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-burned-val {
            font-size: 12.5px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-wallet-balances-box {
            padding: 5px 6px !important;
          }
          .vv-nft-wallet-title {
            font-size: 10.5px !important;
            margin-bottom: 7px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-wallet-label {
            font-size: 10.5px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-wallet-val {
            font-size: 12.5px !important;
            letter-spacing: 0px !important;
          }
          .vv-nft-wallet-row {
            margin-bottom: 5px !important;
          }
        }
      `}</style>

      {/* ── MAIN CONTAINER ── */}
      <div className="vv-nft-club-container" style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: isEmbeddedInBaseApp ? '0 0 30px 0' : '0 12px 30px 12px',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* ── MAIN CARD CONTAINER ── */}
        <div className="vv-nft-club-main-card" style={{
          background: 'rgba(4, 20, 48, 0.85)',
          border: '2px solid #00f5ff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 245, 255, 0.25)',
          backdropFilter: 'blur(16px)',
          textAlign: 'left'
        }}>

          {/* MOBILE ONLY TOP ROW: PHASE BADGE + 2-LINE CONTRACT (ABOVE NFT CARD) */}
          <div className="vv-mobile-phase-row" style={{
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            width: '100%'
          }}>
            <div style={{
              display: 'inline-block',
              background: 'rgba(0, 255, 136, 0.15)',
              border: '1.5px solid #00ff88',
              color: '#00ff88',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '8px',
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              ● MINT IS LIVE
            </div>

            <a
              href={`https://basescan.org/address/${NFT_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#88aacc',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                textAlign: 'right',
                marginLeft: 'auto',
                lineHeight: 1.3
              }}
            >
              <span style={{ fontSize: '7px', color: '#88aacc', letterSpacing: '0.3px' }}>CONTRACT:</span>
              <span style={{ fontSize: '7.5px', color: '#00f5ff', letterSpacing: '0.3px' }}>
                {NFT_CONTRACT_ADDRESS.slice(0, 6)}...{NFT_CONTRACT_ADDRESS.slice(-4)} ↗
              </span>
            </a>
          </div>

          {/* TOP SECTION: LEFT HORIZONTAL SLIDER + RIGHT CONTROLS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '28px',
            alignItems: 'stretch',
            marginBottom: '32px'
          }} className="vv-nft-club-main-grid">

            {/* LEFT COLUMN: PURE NFT HORIZONTAL SLIDER CARD */}
            <div className="vv-nft-card-frame" style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '3px solid #00f5ff',
              boxShadow: '0 0 28px rgba(0, 245, 255, 0.4), 0 12px 30px rgba(0,0,0,0.8)',
              background: '#020b1a',
              aspectRatio: '1/1',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0
            }}>
              {/* HARDWARE ACCELERATED HORIZONTAL SLIDING TRACK */}
              <div style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                transform: `translateX(-${deckIndex * 100}%)`,
                transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'transform'
              }}>
                {NFT_DECK.map((id) => (
                  <div
                    key={id}
                    style={{
                      flex: '0 0 100%',
                      minWidth: '100%',
                      maxWidth: '100%',
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      background: '#020b1a',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={`/nft/images/${id}.png`}
                      onError={(e) => handleImageError(e, id)}
                      alt={`Vibe Club #${id}`}
                      loading="eager"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* BOTTOM CHARACTER NAME BADGE (ALWAYS BRAND CYAN #00F5FF & SINGLE NUMBER) */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                background: 'rgba(2, 11, 26, 0.92)',
                border: '1.5px solid #00f5ff',
                padding: '8px 12px',
                borderRadius: '10px',
                fontFamily: 'var(--vv-pixel)',
                fontSize: '9px',
                color: '#00f5ff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.85)',
                zIndex: 10,
                textAlign: 'center',
                letterSpacing: '0.4px',
                backdropFilter: 'blur(8px)'
              }}>
                <span>
                  VIBE CLUB #{currentNftId} {cleanCharacterName.toUpperCase()}
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: CONTROLS WITH COMPACT GAPS (NO JUMP ON LOAD) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: '10px',
              height: '100%'
            }}>
              {/* DESKTOP ONLY TOP ROW: ACTIVE PHASE + CONTRACT */}
              <div className="vv-desktop-phase-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
                width: '100%'
              }}>
                <div className="vv-desktop-phase-pill" style={{
                  display: 'inline-block',
                  background: 'rgba(0, 255, 136, 0.15)',
                  border: '1.5px solid #00ff88',
                  color: '#00ff88',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '8px',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap'
                }}>
                  ● MINT IS LIVE
                </div>

                <a
                  href={`https://basescan.org/address/${NFT_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vv-desktop-contract-link"
                  style={{
                    fontSize: '8px',
                    color: '#88aacc',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: 'auto',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}
                >
                  CONTRACT: {NFT_CONTRACT_ADDRESS.slice(0, 6)}...{NFT_CONTRACT_ADDRESS.slice(-4)} ↗
                </a>
              </div>

              {/* CARD 1: ETH PRICE & LIVE $VIBE PRICE + LIMIT */}
              <div className="vv-nft-ctrl-card vv-nft-price-card" style={{
                background: 'rgba(2, 11, 26, 0.7)',
                border: '1px solid rgba(0, 245, 255, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px'
              }}>
                <div className="vv-nft-ctrl-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-ctrl-label" style={{ fontSize: '8px', color: '#aaa' }}>ETH PRICE</span>
                  <span className="vv-nft-ctrl-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '9px', color: '#00f5ff' }}>
                    {ethPriceFormatted} ETH
                  </span>
                </div>
                <div className="vv-nft-ctrl-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-ctrl-label" style={{ fontSize: '8px', color: '#aaa' }}>$VIBE PRICE</span>
                  <span className="vv-nft-ctrl-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '9px', color: '#ffd700' }}>
                    {currentDynamicVibeAmount ? formatVibeComma(currentDynamicVibeAmount) : 'Loading...'}
                  </span>
                </div>
                <div className="vv-nft-ctrl-row" style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-ctrl-label" style={{ fontSize: '8px', color: '#aaa' }}>LIMIT</span>
                  <span className="vv-nft-ctrl-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '8px', color: '#00ff88' }}>
                    1 NFT PER WALLET
                  </span>
                </div>
              </div>

              {/* CARD 2: TOTAL MINTED & PROGRESS BAR */}
              <div className="vv-nft-ctrl-card vv-nft-minted-card" style={{
                background: 'rgba(2, 11, 26, 0.7)',
                border: '1px solid rgba(0, 245, 255, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px'
              }}>
                <div className="vv-nft-ctrl-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-ctrl-label" style={{ fontSize: '8px', color: '#aaa' }}>TOTAL MINTED</span>
                  <span className="vv-nft-ctrl-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '9px', color: '#00f5ff' }}>
                    {totalMinted} / {maxSupply}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="vv-nft-progress-bar-wrap" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, (totalMinted / maxSupply) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #00f5ff, #00ff88)' }} />
                </div>
              </div>

              {/* CARD 3: TOTAL BURNED */}
              <div className="vv-nft-ctrl-card vv-nft-burned-card" style={{
                background: 'rgba(2, 11, 26, 0.7)',
                border: '1px solid rgba(255, 68, 102, 0.35)',
                borderRadius: '10px',
                padding: '7px 10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-burned-label" style={{ fontSize: '7px', color: '#ff4466', fontWeight: 400, letterSpacing: '0px' }}>TOTAL BURNED BY MINT</span>
                  <span className="vv-nft-burned-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '8px', fontWeight: 400, letterSpacing: '0px', color: '#ffffff' }}>
                    {formatVibeComma(totalVibeBurnedByContract)}
                  </span>
                </div>
              </div>

              {/* USER WALLET BALANCES */}
              <div className="vv-nft-wallet-balances-box" style={{ padding: '2px 4px' }}>
                <div className="vv-nft-wallet-title" style={{ fontSize: '8px', color: '#88aacc', marginBottom: '4px', letterSpacing: '0px', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  YOUR WALLET BALANCES:
                </div>
                <div className="vv-nft-wallet-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-wallet-label" style={{ fontSize: '8px', color: '#88aacc', fontWeight: 400, letterSpacing: '0px' }}>• ETH BALANCE:</span>
                  <span className="vv-nft-wallet-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '9px', fontWeight: 400, letterSpacing: '0px', color: authenticated ? '#00f5ff' : '#ff4466' }}>
                    {authenticated ? `${Number(balances?.eth || 0).toFixed(4)} ETH` : 'NOT CONNECTED'}
                  </span>
                </div>
                <div className="vv-nft-wallet-row" style={{ display: 'flex', justifyContent: 'space-between', whiteSpace: 'nowrap' }}>
                  <span className="vv-nft-wallet-label" style={{ fontSize: '8px', color: '#88aacc', fontWeight: 400, letterSpacing: '0px' }}>• $VIBE BALANCE:</span>
                  <span className="vv-nft-wallet-val" style={{ fontFamily: 'var(--vv-pixel)', fontSize: '9px', fontWeight: 400, letterSpacing: '0px', color: authenticated ? '#ffd700' : '#ff4466' }}>
                    {authenticated ? formatVibeComma(Math.floor(Number(balances?.vibe || 0))) : 'NOT CONNECTED'}
                  </span>
                </div>
              </div>

              {/* DUAL MINT ACTION BUTTONS (PINNED TO BOTTOM VIA MARGIN-TOP AUTO) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                {errorMessage && (
                  <div style={{
                    background: 'rgba(255, 68, 102, 0.15)',
                    border: '1px solid #ff4466',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '8px',
                    color: '#ff6688',
                    textAlign: 'center',
                    marginBottom: '4px'
                  }}>
                    ⚠️ {errorMessage}
                  </div>
                )}

                {mintSuccess && (
                  <div style={{
                    background: 'rgba(0, 255, 136, 0.15)',
                    border: '1.5px solid #00ff88',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '9px',
                    color: '#00ff88',
                    textAlign: 'center',
                    marginBottom: '6px',
                    boxShadow: '0 0 16px rgba(0, 255, 136, 0.3)'
                  }}>
                    🎉 MINT SUCCESSFUL! WELCOME TO VIBE CLUB!
                    {txHash && (
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={`https://basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#00f5ff', textDecoration: 'underline', fontSize: '8px' }}
                        >
                          VIEW ON BASESCAN ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {!authenticated ? (
                  /* SINGLE BUTTON WHEN UNAUTHENTICATED */
                    <button
                    onClick={login}
                    style={{
                      width: '100%',
                      height: '46px',
                      fontFamily: 'var(--vv-pixel)',
                      fontSize: '10px',
                      fontWeight: 900,
                      background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
                      border: '2px solid #ffffff',
                      borderRadius: '10px',
                      color: '#020b1a',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(0, 245, 255, 0.45)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <WalletSvgIcon size={14} /> CONNECT WALLET TO MINT
                  </button>
                ) : hasMinted ? (
                  /* ALREADY MINTED */
                  <div style={{
                    width: '100%',
                    padding: '14px',
                    background: 'rgba(0, 255, 136, 0.12)',
                    border: '2px solid #00ff88',
                    borderRadius: '10px',
                    textAlign: 'center',
                    color: '#00ff88',
                    fontSize: '10px',
                    fontWeight: 900,
                    boxShadow: '0 0 16px rgba(0, 255, 136, 0.3)'
                  }}>
                    ✓ YOU HAVE MINTED (1/1 MAX)
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        disabled={!modalNftId} onClick={() => setShowSuccessModal(true)}
                        style={{
                          fontFamily: 'var(--vv-pixel)',
                          background: 'rgba(0, 245, 255, 0.15)',
                          border: '1.5px solid #00f5ff',
                          color: '#00f5ff',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '8px',
                          cursor: 'pointer',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🎉 VIEW MINT CARD & SHARE
                      </button>
                      <a
                        href={OPENSEA_COLLECTION_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#00f5ff', textDecoration: 'underline', fontSize: '8px' }}
                      >
                        VIEW ON OPENSEA ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  /* DUAL MINT BUTTONS */
                  <>
                    {/* 1. MINT FOR ETH BUTTON */}
                    <button
                      onClick={mintWithETH}
                      disabled={isMintingEth || isMintingVibe || isApprovingVibe}
                      style={{
                        width: '100%',
                        height: '44px',
                        fontFamily: 'var(--vv-pixel)',
                        fontSize: '10px',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
                        border: '2px solid #ffffff',
                        borderRadius: '10px',
                        color: '#020b1a',
                        cursor: (isMintingEth || isMintingVibe || isApprovingVibe) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 16px rgba(0, 245, 255, 0.45)',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        opacity: (isMintingEth || isMintingVibe || isApprovingVibe) ? 0.7 : 1
                      }}
                    >
                      {isMintingEth ? 'MINTING ON BASE...' : `MINT FOR ${ethPriceFormatted} ETH`}
                    </button>

                    {/* ELEGANT "- OR -" DIVIDER */}
                    <div style={{
                      textAlign: 'center',
                      fontSize: '8px',
                      color: '#88aacc',
                      letterSpacing: '1px',
                      margin: '1px 0'
                    }}>
                      — OR —
                    </div>

                    {/* 2. MINT FOR $VIBE BUTTON */}
                    <button
                      onClick={handleMintWithVibeClick}
                      disabled={isMintingEth || isMintingVibe || isApprovingVibe || !currentDynamicVibeAmount}
                      style={{
                        width: '100%',
                        height: '44px',
                        fontFamily: 'var(--vv-pixel)',
                        fontSize: '10px',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #ffd700 0%, #ff6b35 100%)',
                        border: '2px solid #ffffff',
                        borderRadius: '10px',
                        color: '#ffffff',
                        cursor: (isMintingEth || isMintingVibe || isApprovingVibe) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 16px rgba(255, 215, 0, 0.4)',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        opacity: (isMintingEth || isMintingVibe || isApprovingVibe) ? 0.7 : 1
                      }}
                    >
                      {isApprovingVibe
                        ? 'APPROVING $VIBE...'
                        : isMintingVibe
                        ? 'MINTING WITH $VIBE...'
                        : currentDynamicVibeAmount ? `MINT FOR ${formatVibeComma(currentDynamicVibeAmount)}` : 'LOADING $VIBE PRICE...'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ── FAQ & VIBE CLUB BENEFITS SECTION ── */}
        <div style={{
          marginTop: '48px',
          textAlign: 'left'
        }}>
          <h2 className="vv-faq-section-title" style={{
            fontFamily: 'var(--vv-pixel)',
            fontSize: '14px',
            fontWeight: 400,
            color: '#00f5ff',
            textShadow: 'none',
            marginBottom: '24px',
            letterSpacing: '0px',
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}>
            FAQ & CLUB BENEFITS
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* FAQ 1: VIBE CLUB UTILITY */}
            <div className="vv-faq-card" style={{
              background: 'rgba(4, 20, 48, 0.75)',
              border: '1.5px solid rgba(0, 245, 255, 0.35)',
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="vv-faq-title" style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '10px',
                fontWeight: 400,
                color: '#00f5ff',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                letterSpacing: '0px'
              }}>
                <span style={{ fontSize: '13px' }}>💎</span> VIBE CLUB UTILITY
              </div>

              <div className="vv-faq-text" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontFamily: 'var(--vv-pixel)',
                fontSize: '8px',
                fontWeight: 400,
                color: '#a0b5d0',
                lineHeight: 1.8,
                letterSpacing: '0px',
                textTransform: 'uppercase'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00f5ff', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>LIFETIME $VIBE ROYALTIES DISTRIBUTED TO NFT HOLDERS EVERY 10 DAYS</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff88', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>ROYALTY POOL SIZE = 15% OF CURRENT COMMUNITY POOL</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ffd700', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>
                    TRACK & CLAIM ROYALTIES IN{' '}
                    <Link
                      to="/hub"
                      style={{
                        color: '#00f5ff',
                        textDecoration: 'underline',
                        fontWeight: 400,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0px'
                      }}
                    >
                      REWARDS HUB ↗
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* FAQ 2: 80% AUTO-BURN & 20% REWARDS POOL */}
            <div className="vv-faq-card" style={{
              background: 'rgba(4, 20, 48, 0.75)',
              border: '1.5px solid rgba(255, 68, 102, 0.35)',
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="vv-faq-title" style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '10px',
                fontWeight: 400,
                color: '#ff4466',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                letterSpacing: '0px'
              }}>
                <span style={{ fontSize: '13px' }}>🔥</span> 80% AUTO-BURN & 20% REWARDS POOL
              </div>

              <div className="vv-faq-text" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontFamily: 'var(--vv-pixel)',
                fontSize: '8px',
                fontWeight: 400,
                color: '#a0b5d0',
                lineHeight: 1.8,
                letterSpacing: '0px',
                textTransform: 'uppercase'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ff4466', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>80% OF ALL NFT MINT REVENUE AUTO BUYS & BURNS $VIBE TOKENS ON CONTRACT LEVEL.</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff88', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>THE REMAINING 20% GOES DIRECTLY INTO THE COMMUNITY POOL.</span>
                </div>
              </div>
            </div>

            {/* FAQ 4: PRIMARY MINT & OPENSEA TRADING */}
            <div className="vv-faq-card" style={{
              background: 'rgba(4, 20, 48, 0.75)',
              border: '1.5px solid rgba(32, 129, 226, 0.45)',
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)'
            }}>
              <div className="vv-faq-title" style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '10px',
                fontWeight: 400,
                color: '#2081e2',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                letterSpacing: '0px'
              }}>
                <span style={{ fontSize: '13px' }}>🛡️</span> OFFICIAL MINT & SECONDARY MARKET
              </div>

              <div className="vv-faq-text" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontFamily: 'var(--vv-pixel)',
                fontSize: '8px',
                fontWeight: 400,
                color: '#a0b5d0',
                lineHeight: 1.8,
                letterSpacing: '0px',
                textTransform: 'uppercase'
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#00ff88', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>MINT IS AVAILABLE ONLY ON THIS OFFICIAL VIBE LAUNCHPAD PAGE.</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2081e2', fontSize: '8px', flexShrink: 0 }}>•</span>
                  <span>
                    THE COLLECTION IS FULLY VERIFIED & TRADEABLE ON{' '}
                    <a
                      href={OPENSEA_COLLECTION_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#00f5ff',
                        textDecoration: 'underline',
                        fontWeight: 400,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0px'
                      }}
                    >
                      OPENSEA ↗
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUCCESS MINT MODAL POPUP ── */}
      {showSuccessModal && modalNftId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 5, 17, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(4, 20, 48, 0.96), rgba(2, 11, 26, 0.98))',
            border: '2px solid #00f5ff',
            borderRadius: '24px',
            padding: '28px 24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 0 50px rgba(0, 245, 255, 0.4), 0 20px 60px rgba(0, 0, 0, 0.9)',
            position: 'relative',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            {/* CLOSE BUTTON (X) */}
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(0, 245, 255, 0.4)',
                color: '#00f5ff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                zIndex: 10
              }}
            >
              ✕
            </button>

            {/* CELEBRATION BADGE */}
            <div style={{
              fontSize: '8px',
              color: '#00ff88',
              letterSpacing: '1px',
              marginBottom: '8px',
              background: 'rgba(0, 255, 136, 0.12)',
              border: '1px solid #00ff88',
              padding: '4px 12px',
              borderRadius: '12px',
              display: 'inline-block'
            }}>
              🎉 MINT SUCCESSFUL!
            </div>

            {/* HEADER TITLE (100% CENTERED & RESPONSIVE FOR LONG NAMES) */}
            <h2 style={{
              fontFamily: 'var(--vv-pixel)',
              fontSize: '11px',
              color: '#00f5ff',
              textShadow: '0 0 14px rgba(0, 245, 255, 0.5)',
              margin: '8px auto 14px auto',
              lineHeight: 1.5,
              letterSpacing: '0.4px',
              textAlign: 'center',
              width: '100%',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              padding: '0 16px',
              boxSizing: 'border-box'
            }}>
              VIBE CLUB #{modalNftId} {modalCleanName.toUpperCase()}
            </h2>

            {/* NFT IMAGE DISPLAY */}
            <div style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '2px solid #00f5ff',
              boxShadow: '0 0 24px rgba(0, 245, 255, 0.3)',
              aspectRatio: '1/1',
              maxWidth: '250px',
              margin: '0 auto 16px auto',
              background: '#020b1a'
            }}>
              <img
                src={`/nft/images/${modalNftId}.png`}
                onError={(e) => handleImageError(e, modalNftId)}
                alt={`Vibe Club #${modalNftId}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>

            {/* STEPS FLOW: STEP 1 (SAVE IMAGE) -> STEP 2 (SHARE ON X) */}
            <div style={{ marginTop: '10px' }}>
              {/* STEP HEADERS WITH CONNECTOR LINE */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                position: 'relative',
                padding: '0 6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                  <span style={{
                    background: '#00f5ff',
                    color: '#020b1a',
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '7.5px',
                    fontWeight: 900,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    1
                  </span>
                  <span style={{
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '7.5px',
                    color: '#00f5ff',
                    letterSpacing: '0.4px'
                  }}>
                    SAVE IMAGE
                  </span>
                </div>

                {/* CONNECTOR LINE WITH ARROW */}
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: 'linear-gradient(90deg, #00f5ff, #1da1f2)',
                  margin: '0 8px',
                  position: 'relative',
                  opacity: 0.7
                }}>
                  <span style={{
                    position: 'absolute',
                    right: '-2px',
                    top: '-5.5px',
                    fontSize: '8px',
                    color: '#1da1f2'
                  }}>
                    ▶
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                  <span style={{
                    background: '#1da1f2',
                    color: '#ffffff',
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '7.5px',
                    fontWeight: 900,
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    2
                  </span>
                  <span style={{
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '7.5px',
                    color: '#1da1f2',
                    letterSpacing: '0.4px'
                  }}>
                    SHARE ON X
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS GRID */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                {/* 1. SAVE IMAGE BUTTON */}
                <button
                  onClick={handleSaveImage}
                  style={{
                    height: '44px',
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '9px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
                    border: '1.5px solid #ffffff',
                    borderRadius: '12px',
                    color: '#020b1a',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 245, 255, 0.35)',
                    letterSpacing: '0.4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0 4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  📥 SAVE IMAGE
                </button>

                {/* 2. SHARE ON X BUTTON */}
                <button
                  onClick={handleShareOnX}
                  style={{
                    height: '44px',
                    fontFamily: 'var(--vv-pixel)',
                    fontSize: '9px',
                    fontWeight: 900,
                    background: '#000000',
                    border: '1.5px solid #1da1f2',
                    borderRadius: '12px',
                    color: '#1da1f2',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(29, 161, 242, 0.3)',
                    letterSpacing: '0.4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0 4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  SHARE ON X
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
