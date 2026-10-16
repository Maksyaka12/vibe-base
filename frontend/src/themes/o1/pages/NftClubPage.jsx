import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { parseEther } from 'viem';
import { Wallet, ExternalLink, Gem, Flame, ShieldCheck, CheckCircle2, Download, Share2, X } from 'lucide-react';
import { useUserBalances } from '../../../hooks/useUserBalances';
import { useVibeNftContract, NFT_CONTRACT_ADDRESS, OPENSEA_COLLECTION_URL } from '../../../hooks/useVibeNftContract';
import nftNames from '../../../data/nftNames.json';
import { Button, Card, StatusPill, ProgressBar, SectionTitle, Alert } from '../components/ui';

// NFT Deck strictly from #5 to #35 (31 NFTs)
const NFT_DECK = Array.from({ length: 31 }, (_, i) => i + 5);

export default function NftClubPage({ isEmbeddedInBaseApp = false } = {}) {
  const { login, logout, authenticated, user } = usePrivy();
  const walletAddress = user?.wallet?.address;
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
  const [vibePerEthRatio, setVibePerEthRatio] = useState(50000000); // 1 ETH = ~50M VIBE fallback
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

  // Fetch live $VIBE pool price from DEX Screener on Base
  useEffect(() => {
    let isMounted = true;
    async function fetchLiveVibePrice() {
      try {
        const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xb200000000000000000000df24ecb8bf51100a01');
        const data = await res.json();
        if (data?.pairs && data.pairs.length > 0) {
          const mainPair = data.pairs[0];
          const ethPriceInUsd = parseFloat(mainPair.priceNative) ? (parseFloat(mainPair.priceUsd) / parseFloat(mainPair.priceNative)) : 2700;
          const vibePriceInUsd = parseFloat(mainPair.priceUsd) || 0.00005;
          if (vibePriceInUsd > 0 && isMounted) {
            const calculatedRatio = Math.round(ethPriceInUsd / vibePriceInUsd);
            setVibePerEthRatio(calculatedRatio);
          }
        }
      } catch (e) {
        console.error('Error fetching VIBE live price:', e);
      }
    }

    fetchLiveVibePrice();
    const interval = setInterval(fetchLiveVibePrice, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Smooth horizontal slide loop: slides to next card every 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setDeckIndex((prev) => (prev + 1) % NFT_DECK.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Current dynamic $VIBE price based on active phase
  const ethPriceNum = parseFloat(ethPriceFormatted) || 0.005;
  const currentDynamicVibeAmount = Math.floor(ethPriceNum * vibePerEthRatio);

  // Fixed baseline at 110 mints (Phase 1 + Phase 2 real burns) + exact 4x new 20% VIBE accumulated in contract
  const HISTORICAL_BURNED_VIBE = 16407500;
  const BASELINE_CONTRACT_VIBE = 99140.6;

  const currentContractVibe = parseFloat(contractVibeBalance || 0);
  const newVibeAccumulated = Math.max(0, currentContractVibe - BASELINE_CONTRACT_VIBE);
  const totalVibeBurnedByContract = Math.floor(HISTORICAL_BURNED_VIBE + (newVibeAccumulated * 4));

  const currentNftId = NFT_DECK[deckIndex];

  // Clean character name without duplicate numbers
  const rawCharacterName = nftNames[currentNftId] || 'Maltipoo';
  const cleanCharacterName = rawCharacterName.replace(/^#\d+\s*/, '').replace(/#\d+/, '').trim() || 'VIBE';

  const [testMintedId, setTestMintedId] = useState(null);

  // Details for Minted NFT Modal
  const modalNftId = testMintedId || lastMintedId || 3;
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

      // 1. Try Native Mobile Web Share
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

  // Share on X (Twitter Intent)
  const handleShareOnX = () => {
    const tweetText = `I joined 333 Vibe Club\n\nMember #${modalNftId} ${modalCleanName}\nEligible for lifetime royalties distributed every 10 days\n\nJoin club: https://vibeverse.dog/vibeclub`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Target Launch
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
    const vibeWei = parseEther(currentDynamicVibeAmount.toString());
    mintWithVIBE(vibeWei);
  };

  const handleImageError = (e, id) => {
    if (!e.target.src.includes('pinata.cloud')) {
      e.target.src = `https://gateway.pinata.cloud/ipfs/bafybeifoc434thlscysnqvy45idxfjn7g7qjtedntek3rckn3vukffczxe/${id}.png`;
    } else if (!e.target.src.includes('ipfs.io')) {
      e.target.src = `https://ipfs.io/ipfs/bafybeifoc434thlscysnqvy45idxfjn7g7qjtedntek3rckn3vukffczxe/${id}.png`;
    }
  };

  if (showLockScreen) {
    return (
      <div className="o1-nft-lockscreen">
        <StatusPill status="active" label="Genesis phase" />
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          Vibe Club is coming
        </h1>
        <div className="o1-nft-timer-group">
          <div className="o1-nft-timer-tile">
            <span className="o1-nft-timer-digit">{countdownHours}</span>
            <span className="o1-nft-timer-unit">Hours</span>
          </div>
          <span style={{ color: 'var(--text-3)', fontSize: '20px' }}>:</span>
          <div className="o1-nft-timer-tile">
            <span className="o1-nft-timer-digit">{countdownMins}</span>
            <span className="o1-nft-timer-unit">Mins</span>
          </div>
          <span style={{ color: 'var(--text-3)', fontSize: '20px' }}>:</span>
          <div className="o1-nft-timer-tile">
            <span className="o1-nft-timer-digit">{countdownSecs}</span>
            <span className="o1-nft-timer-unit">Secs</span>
          </div>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
          Public mint launches at 17:00 UTC · 333 total supply · FCFS
        </p>
      </div>
    );
  }

  return (
    <div className="o1-nft-page-container">
      {/* ── Top Mint 2-Col Grid ── */}
      <div className="o1-nft-mint-grid">
        {/* Left Col: NFT Slider Deck */}
        <div className="o1-nft-slider-frame">
          <div
            className="o1-nft-slider-track"
            style={{ transform: `translateX(-${deckIndex * 100}%)` }}
          >
            {NFT_DECK.map((id) => (
              <div key={id} className="o1-nft-slide-item">
                <img
                  src={`/nft/images/${id}.png`}
                  onError={(e) => handleImageError(e, id)}
                  alt={`Vibe Club #${id}`}
                  loading="eager"
                  className="o1-nft-slide-img"
                />
              </div>
            ))}
          </div>

          <div className="o1-nft-badge-bottom">
            <span>Vibe Club #{currentNftId}</span>
            <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{cleanCharacterName}</span>
          </div>
        </div>

        {/* Right Col: Mint Controls Card */}
        <div className="o1-nft-controls-card">
          <div className="o1-nft-controls-top">
            <StatusPill status="active" label="Mint is live" />
            <a
              href={`https://basescan.org/address/${NFT_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: 'var(--text-3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
            >
              <span style={{ fontFamily: 'var(--mono)' }}>
                {NFT_CONTRACT_ADDRESS.slice(0, 6)}...{NFT_CONTRACT_ADDRESS.slice(-4)}
              </span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="o1-nft-stats-stack">
            <div className="o1-nft-stat-row">
              <span className="o1-nft-stat-label">Price in ETH</span>
              <span className="o1-nft-stat-val">{ethPriceFormatted} ETH</span>
            </div>

            <div className="o1-nft-stat-row">
              <span className="o1-nft-stat-label">Price in $VIBE</span>
              <span className="o1-nft-stat-val o1-nft-stat-val-accent">
                {formatVibeComma(currentDynamicVibeAmount)}
              </span>
            </div>

            <div className="o1-nft-stat-row">
              <span className="o1-nft-stat-label">Wallet limit</span>
              <span className="o1-nft-stat-val">1 NFT per wallet</span>
            </div>

            {/* Total Minted & Progress */}
            <div className="o1-nft-stat-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="o1-nft-stat-label">Total minted</span>
                <span className="o1-nft-stat-val">
                  {totalMinted} <span style={{ color: 'var(--text-3)' }}>/ {maxSupply}</span>
                </span>
              </div>
              <ProgressBar value={totalMinted} max={maxSupply} tone="accent" />
            </div>

            <div className="o1-nft-stat-row">
              <span className="o1-nft-stat-label">Total burned by mint</span>
              <span className="o1-nft-stat-val" style={{ color: 'var(--amber)', fontSize: '14px', fontWeight: 600 }}>
                {formatVibeComma(totalVibeBurnedByContract)}
              </span>
            </div>

            {/* Wallet balances */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-3)' }}>Your ETH balance</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                  {authenticated ? `${Number(balances?.eth || 0).toFixed(4)} ETH` : 'Not connected'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-3)' }}>Your $VIBE balance</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                  {authenticated ? formatVibeComma(Math.floor(Number(balances?.vibe || 0))) : 'Not connected'}
                </span>
              </div>
            </div>
          </div>

          {/* Mint Actions */}
          <div className="o1-nft-mint-actions">
            {errorMessage && (
              <Alert tone="error">{errorMessage}</Alert>
            )}

            {mintSuccess && (
              <Alert tone="success">
                Mint successful! Welcome to Vibe Club.{' '}
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'underline', marginLeft: '6px' }}
                  >
                    View on BaseScan ↗
                  </a>
                )}
              </Alert>
            )}

            {!authenticated ? (
              <Button variant="primary" size="lg" onClick={login} style={{ width: '100%' }}>
                <Wallet size={16} /> Connect wallet to mint
              </Button>
            ) : hasMinted ? (
              <Card style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600, fontSize: '13px' }}>
                  <CheckCircle2 size={16} /> You have minted (1/1 max)
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => setShowSuccessModal(true)}>
                    <Share2 size={14} /> View mint card & share
                  </Button>
                  <Button variant="ghost" size="sm" as="a" href={OPENSEA_COLLECTION_URL} target="_blank" rel="noopener noreferrer">
                    OpenSea <ExternalLink size={12} />
                  </Button>
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={mintWithETH}
                  disabled={isMintingEth || isMintingVibe || isApprovingVibe}
                  style={{ width: '100%' }}
                >
                  {isMintingEth ? 'Minting on Base...' : `Mint for ${ethPriceFormatted} ETH`}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleMintWithVibeClick}
                  disabled={isMintingEth || isMintingVibe || isApprovingVibe}
                  style={{ width: '100%' }}
                >
                  {isApprovingVibe
                    ? 'Approving $VIBE...'
                    : isMintingVibe
                    ? 'Minting with $VIBE...'
                    : `Mint for ${formatVibeComma(currentDynamicVibeAmount)}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Club Perks & Details Section ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <SectionTitle
          title="Club utility & benefits"
          subtitle="Genesis 333 NFT membership pass utilities on Base"
        />

        <div className="o1-nft-perks-grid">
          <div className="o1-nft-perk-card">
            <div className="o1-nft-perk-header">
              <div className="o1-nft-perk-icon">
                <Gem size={18} />
              </div>
              <span className="o1-nft-perk-title">Lifetime royalties</span>
            </div>
            <p className="o1-nft-perk-desc">
              Holders receive regular $VIBE dividends distributed every 10 days. The royalty pool constitutes 15% of the community reward pool.
            </p>
          </div>

          <div className="o1-nft-perk-card">
            <div className="o1-nft-perk-header">
              <div className="o1-nft-perk-icon">
                <Flame size={18} />
              </div>
              <span className="o1-nft-perk-title">80% auto-burn</span>
            </div>
            <p className="o1-nft-perk-desc">
              80% of all mint revenue buys and permanently burns $VIBE tokens directly onchain, while 20% bolsters the community pool.
            </p>
          </div>

          <div className="o1-nft-perk-card">
            <div className="o1-nft-perk-header">
              <div className="o1-nft-perk-icon">
                <ShieldCheck size={18} />
              </div>
              <span className="o1-nft-perk-title">Secondary trading</span>
            </div>
            <p className="o1-nft-perk-desc">
              Fully verified smart contract tradeable on OpenSea. Genesis club utility stays bound to the NFT holder address at each snapshot.
            </p>
          </div>
        </div>
      </div>

      {/* ── Success Mint Modal Popup ── */}
      {showSuccessModal && (
        <div className="o1-nft-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="o1-nft-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="o1-nft-modal-close" onClick={() => setShowSuccessModal(false)}>
              <X size={16} />
            </button>

            <StatusPill status="active" label="Mint successful" style={{ alignSelf: 'center' }} />

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Vibe Club #{modalNftId}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                {modalCleanName}
              </p>
            </div>

            <div className="o1-nft-modal-preview">
              <img
                src={`/nft/images/${modalNftId}.png`}
                onError={(e) => handleImageError(e, modalNftId)}
                alt={`Vibe Club #${modalNftId}`}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Button variant="secondary" size="md" onClick={handleSaveImage}>
                <Download size={14} /> Save image
              </Button>
              <Button variant="primary" size="md" onClick={handleShareOnX}>
                <Share2 size={14} /> Share on X
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
