import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRoyaltyBannerUrl } from '../Checker';
import {
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  Share2,
  X,
  Download,
  Check,
  Clock,
  Gift,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button, Card, Tile, Badge, StatusPill, PageHeader, SectionTitle, EmptyState } from './ui';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';

function formatCountdownLive(targetIso) {
  if (!targetIso) return '';
  try {
    const now = new Date().getTime();
    const target = new Date(targetIso).getTime();
    const diff = target - now;

    if (diff <= 0) return '00h 00m 00s';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n) => String(n).padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } catch {
    return '';
  }
}

function BaseAppClaimCountdownButton({ targetDate, onClaim }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!targetDate) return '';
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;
    if (diff <= 0) return '00h 00m 00s';
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  });

  const [isReached, setIsReached] = useState(() => {
    if (!targetDate) return false;
    return new Date().getTime() >= new Date(targetDate).getTime();
  });

  useEffect(() => {
    const updateCountdown = () => {
      if (!targetDate) return;
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setIsReached(true);
        setTimeLeft('00h 00m 00s');
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        const pad = (n) => String(n).padStart(2, '0');
        setTimeLeft(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isReached) {
    return (
      <Button onClick={onClaim} variant="primary" size="lg" fullWidth icon={<ArrowUpRight size={16} />}>
        Claim reward now
      </Button>
    );
  }

  return (
    <Button disabled variant="secondary" size="lg" fullWidth icon={<Clock size={16} />}>
      Claim in {timeLeft}
    </Button>
  );
}

export function BaseAppClaimView(props) {
  const {
    address,
    ready,
    authenticated,
    login,
    balance,
    nftCount,
    userNft,
    currentTime,
    claimStatus,
    claimedHistory = [],
    totalExpiredCount = 0,
    totalExpiredTokens = 0,
    handleClaim,
    isHolderEligibleLive,
    holderRewardAmount,
    hasConfirmedHolderClaim,
    isHolderRound1Available,
    activeHolderEpochId,
    activeHolderRound,
    activeHolderAvailable,
    isVibeClubEligible,
    vibeClubRewardAmount,
    hasConfirmedRoyaltyClaim,
    isVibeClubRoyalty1Available,
    activeRoyaltyEpochId,
    activeRoyaltyRound,
    activeRoyaltyAvailable,
    royalty2Data,
    royalty3Data,
    royalty4Data,
    royalty5Data,
    totalAvailableCount = 0,
    upcomingHolderRound,
    upcomingVibeClubRound
  } = props;

  // Share Celebration Modal state
  const [shareModalItem, setShareModalItem] = useState(null);
  const [downloadingBanner, setDownloadingBanner] = useState(false);

  // Download / Save Banner
  const handleDownloadBanner = async () => {
    setDownloadingBanner(true);
    const ep = shareModalItem?.roundId || (shareModalItem?.id?.includes('5') ? 5 : (shareModalItem?.id?.includes('4') ? 4 : (shareModalItem?.id?.includes('3') ? 3 : (shareModalItem?.id?.includes('2') ? 2 : (activeRoyaltyEpochId || 5)))));
    const imageUrl = getRoyaltyBannerUrl(ep);
    const fileName = `vibe-club-royalties-${ep}-claimed.jpg`;
    try {
      const isMobileDevice = typeof navigator !== 'undefined' && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth <= 768)
      );

      if (isMobileDevice && navigator.canShare) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Vibe Rewards Royalty ${ep} Claimed`,
              text: `Vibe Rewards Royalty ${ep} Claimed 🐶💰`
            });
            setDownloadingBanner(false);
            return;
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setDownloadingBanner(false);
            return;
          }
        }
      }

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download error:', e);
      window.open(imageUrl, '_blank');
    } finally {
      setDownloadingBanner(false);
    }
  };

  const handleShareOnX = (item) => {
    const tweetText = `JUST CLAIMED MY NFT ROYALTIES 🐶💰\n\nHolding Vibe Club NFT unlocks passive $VIBE payouts every 10 days to all Club Members\n\nJoin Club → vibeverse.dog/vibeclub?ref=x`;

    const isMobile = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth <= 768)
    );

    const appUrl = `twitter://post?message=${encodeURIComponent(tweetText)}`;
    const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    if (isMobile) {
      window.location.href = appUrl;
      const timer = setTimeout(() => {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }, 1500);

      const handleBlur = () => {
        clearTimeout(timer);
        window.removeEventListener('blur', handleBlur);
      };
      window.addEventListener('blur', handleBlur);
    } else {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const totalClaimedTokens = (claimedHistory || []).reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  const hasNft = Boolean(nftCount && nftCount > 0);

  // Compute pending claimable amount
  const pendingClaimableTokens = (
    ((activeHolderAvailable !== undefined ? activeHolderAvailable : isHolderRound1Available) && hasConfirmedHolderClaim ? (holderRewardAmount || 500000) : 0) +
    (((activeRoyaltyAvailable !== undefined ? activeRoyaltyAvailable : isVibeClubRoyalty1Available) && isVibeClubEligible) ? (vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))) : 0)
  );

  return (
    <div className="o1-claim-container">
      <PageHeader
        title="Claim Portal"
        description="Personal reward allocations, active claims, and distribution history"
      />

      {/* ── Quick Stats Row ── */}
      <div className="o1-claim-stats-grid">
        <Tile
          label="Total claimable"
          value={`+${Math.round(pendingClaimableTokens).toLocaleString('en-US')} $VIBE`}
          sub={totalAvailableCount > 0 ? `${totalAvailableCount} active allocation ready` : 'No pending claims'}
          className={totalAvailableCount > 0 ? 'tile-accent' : ''}
        />
        <Tile
          label="Claimed so far"
          value={`+${Math.round(totalClaimedTokens).toLocaleString('en-US')} $VIBE`}
          sub={`${claimedHistory?.length || 0} completed payouts`}
        />
        <Tile
          label="Expired claims"
          value={`${Math.round(totalExpiredTokens).toLocaleString('en-US')} $VIBE`}
          sub={`${totalExpiredCount} ${totalExpiredCount === 1 ? 'reward' : 'rewards'} missed`}
          className={totalExpiredCount > 0 ? 'tile-danger' : ''}
        />
      </div>

      {/* ── SECTION 1: AVAILABLE TO CLAIM ── */}
      <div>
        <SectionTitle
          title="Available to claim"
          count={totalAvailableCount}
          right={
            totalAvailableCount > 0 ? (
              <Badge tone="success" pill>{totalAvailableCount} ready</Badge>
            ) : null
          }
        />

        {totalAvailableCount === 0 ? (
          <EmptyState
            icon={<Gift size={32} color="var(--text-3)" />}
            title="No pending claims"
            description="You do not have any active allocations waiting to be claimed. Review upcoming snapshot rounds below."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Holder Rewards Active Claim Card */}
            {(activeHolderAvailable !== undefined ? activeHolderAvailable : isHolderRound1Available) && hasConfirmedHolderClaim && (
              <div className="o1-claim-active-card has-claim">
                <div className="o1-claim-banner-box">
                  <img
                    src="/allocation-banner.png"
                    alt="Allocation"
                    className="o1-claim-banner-img"
                  />
                  <div className="o1-claim-banner-header">
                    <Badge tone="neutral" pill>
                      Holder Rewards · {(activeHolderRound?.name || 'Unlock 2')}
                    </Badge>
                    <Badge tone="success" pill>Claim live</Badge>
                  </div>
                  <div className="o1-claim-banner-amount-wrap">
                    <div className="o1-claim-banner-amount">
                      <span>+{(holderRewardAmount || 500000).toLocaleString('en-US')}</span>
                      <span className="o1-claim-banner-unit">$VIBE</span>
                    </div>
                  </div>
                </div>

                <div className="o1-claim-action-row">
                  <div className="o1-claim-deadline-text">
                    <Clock size={14} color="var(--text-3)" />
                    <span>Claim window ends:</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {formatCountdownLive(upcomingHolderRound?.targetDate || '2026-09-25T14:00:00Z')}
                    </span>
                  </div>

                  <Button
                    onClick={() => handleClaim('holder', activeHolderEpochId || 1, holderRewardAmount || 500000)}
                    disabled={claimStatus[`holder-${activeHolderEpochId || 1}`] === 'claiming'}
                    variant="primary"
                    size="lg"
                    icon={
                      claimStatus[`holder-${activeHolderEpochId || 1}`] === 'claiming' ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Gift size={16} />
                      )
                    }
                  >
                    {claimStatus[`holder-${activeHolderEpochId || 1}`] === 'claiming'
                      ? 'Claiming on Base...'
                      : `Claim +${(holderRewardAmount || 500000).toLocaleString('en-US')} $VIBE`}
                  </Button>
                </div>
              </div>
            )}

            {/* Vibe Club Royalty Active Claim Card */}
            {((activeRoyaltyAvailable !== undefined ? activeRoyaltyAvailable : isVibeClubRoyalty1Available) && isVibeClubEligible) && (
              <div className="o1-claim-active-card has-claim">
                <div className="o1-claim-banner-box">
                  <img
                    src="/allocation-banner.png"
                    alt="Allocation"
                    className="o1-claim-banner-img"
                  />
                  <div className="o1-claim-banner-header">
                    <Badge tone="neutral" pill>
                      Vibe Club · {(activeRoyaltyRound?.name || `Royalty ${activeRoyaltyEpochId || 2}`)}
                    </Badge>
                    <Badge tone="success" pill>Claim live</Badge>
                  </div>
                  <div className="o1-claim-banner-amount-wrap">
                    <div className="o1-claim-banner-amount">
                      <span>+{(vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))).toLocaleString('en-US')}</span>
                      <span className="o1-claim-banner-unit">$VIBE</span>
                    </div>
                  </div>
                </div>

                <div className="o1-claim-action-row">
                  <div className="o1-claim-deadline-text">
                    <Clock size={14} color="var(--text-3)" />
                    <span>Claim window ends:</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {formatCountdownLive(upcomingVibeClubRound?.targetDate || activeRoyaltyRound?.nextSnapshotDate || '2026-09-17T14:00:00Z')}
                    </span>
                  </div>

                  <Button
                    onClick={async () => {
                      const ep = activeRoyaltyEpochId || 4;
                      const amt = vibeClubRewardAmount || (ep === 4 ? 9909 : (ep === 3 ? 18018 : (ep === 2 ? 17117 : 22935)));
                      await handleClaim('vibeclub', ep, amt);
                      setShareModalItem({
                        id: `vibeclub-${ep}`,
                        type: 'vibeclub',
                        roundId: ep,
                        title: `Vibe Club · Royalty ${ep}`,
                        amount: amt
                      });
                    }}
                    disabled={claimStatus[`vibeclub-${activeRoyaltyEpochId || 4}`] === 'claiming'}
                    variant="primary"
                    size="lg"
                    icon={
                      claimStatus[`vibeclub-${activeRoyaltyEpochId || 4}`] === 'claiming' ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Gift size={16} />
                      )
                    }
                  >
                    {claimStatus[`vibeclub-${activeRoyaltyEpochId || 4}`] === 'claiming'
                      ? 'Claiming on Base...'
                      : `Claim +${(vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))).toLocaleString('en-US')} $VIBE`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 2: UPCOMING REWARDS ── */}
      <div>
        <SectionTitle title="Upcoming distributions" count={2} />
        <div className="o1-upcoming-grid">
          {/* Card 1: Holder Unlock */}
          {(() => {
            const isHolderSnapshotDone = Boolean(upcomingHolderRound?.snapshotIso && (currentTime instanceof Date ? currentTime.getTime() : new Date().getTime()) >= new Date(upcomingHolderRound.snapshotIso).getTime());
            return (
              <div className="o1-upcoming-card">
                <div className="o1-upcoming-card-head">
                  <div className="o1-upcoming-card-title">
                    Holder Rewards · {upcomingHolderRound?.name || 'Unlock 2'}
                  </div>
                  <StatusPill
                    status={isHolderSnapshotDone ? 'Active' : (isHolderEligibleLive ? 'Eligible' : 'Not eligible yet')}
                    tone={isHolderSnapshotDone ? 'success' : (isHolderEligibleLive ? 'success' : 'neutral')}
                  />
                </div>

                <div className="o1-upcoming-pool-box">
                  <span className="o1-upcoming-pool-label">Rewards pool</span>
                  <span className="o1-upcoming-pool-value">10,000,000 $VIBE</span>
                </div>

                <div className="o1-upcoming-info-row">
                  <div className="o1-upcoming-info-box">
                    <span className="o1-upcoming-info-label">
                      {isHolderSnapshotDone ? 'Snapshot completed' : 'Snapshot countdown'}
                    </span>
                    <span className="o1-upcoming-info-val">
                      {isHolderSnapshotDone ? (upcomingHolderRound?.snapshotDate || 'Aug 26, 00:00 UTC') : formatCountdownLive(upcomingHolderRound?.snapshotIso)}
                    </span>
                  </div>
                  <div className="o1-upcoming-info-box">
                    <span className="o1-upcoming-info-label">Requirement</span>
                    <span className="o1-upcoming-info-val">Hold 5M+ $VIBE</span>
                  </div>
                </div>

                {isHolderSnapshotDone ? (
                  <BaseAppClaimCountdownButton
                    targetDate={upcomingHolderRound?.targetDate}
                    onClaim={() => {
                      const el = document.getElementById('available-claims-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                ) : !isHolderEligibleLive ? (
                  <Button
                    as={Link}
                    to={typeof window !== 'undefined' && window.location.pathname.startsWith('/app') ? '/app/buy' : '/buy'}
                    variant="warn"
                    size="md"
                    fullWidth
                  >
                    Buy $VIBE before snapshot
                    <ArrowRight size={14} />
                  </Button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--green)' }}>
                    <CheckCircle2 size={14} />
                    <span>Eligible — balance holding confirmed</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Card 2: Vibe Club Royalty */}
          {(() => {
            const isVibeClubSnapshotDone = Boolean(upcomingVibeClubRound?.snapshotIso && (currentTime instanceof Date ? currentTime.getTime() : new Date().getTime()) >= new Date(upcomingVibeClubRound.snapshotIso).getTime());
            const hasRoyaltyProof = Boolean(hasConfirmedRoyaltyClaim || (royalty5Data?.claims && address && royalty5Data.claims[address.toLowerCase()]) || (royalty4Data?.claims && address && royalty4Data.claims[address.toLowerCase()]) || (royalty3Data?.claims && address && royalty3Data.claims[address.toLowerCase()]) || (royalty2Data?.claims && address && royalty2Data.claims[address.toLowerCase()]));
            const isRoyaltyEligibleNow = hasRoyaltyProof || hasNft;
            const vibeClubPoolAmount = upcomingVibeClubRound?.pool
              ? (upcomingVibeClubRound.pool.includes('$VIBE') || upcomingVibeClubRound.pool === 'TBA'
                  ? upcomingVibeClubRound.pool
                  : `${upcomingVibeClubRound.pool} $VIBE`)
              : 'TBA';
            return (
              <div className="o1-upcoming-card">
                <div className="o1-upcoming-card-head">
                  <div className="o1-upcoming-card-title">
                    Vibe Club · {upcomingVibeClubRound?.name || 'Royalty 2'}
                  </div>
                  <StatusPill
                    status={isVibeClubSnapshotDone ? 'Active' : (hasNft ? 'Eligible' : 'Not eligible yet')}
                    tone={isVibeClubSnapshotDone ? 'success' : (hasNft ? 'success' : 'neutral')}
                  />
                </div>

                <div className="o1-upcoming-pool-box">
                  <span className="o1-upcoming-pool-label">Royalty pool</span>
                  <span className="o1-upcoming-pool-value">{vibeClubPoolAmount}</span>
                </div>

                <div className="o1-upcoming-info-row">
                  <div className="o1-upcoming-info-box">
                    <span className="o1-upcoming-info-label">
                      {isVibeClubSnapshotDone ? 'Snapshot completed' : 'Snapshot countdown'}
                    </span>
                    <span className="o1-upcoming-info-val">
                      {isVibeClubSnapshotDone ? (upcomingVibeClubRound?.snapshotDate || 'Sep 7, 00:00 UTC') : formatCountdownLive(upcomingVibeClubRound?.snapshotIso)}
                    </span>
                  </div>
                  <div className="o1-upcoming-info-box">
                    <span className="o1-upcoming-info-label">Requirement</span>
                    <span className="o1-upcoming-info-val">Hold Vibe Club NFT</span>
                  </div>
                </div>

                {isVibeClubSnapshotDone ? (
                  <BaseAppClaimCountdownButton
                    targetDate={upcomingVibeClubRound?.targetDate}
                    onClaim={() => {
                      if (activeRoyaltyEpochId && vibeClubRewardAmount) {
                        handleClaim('vibeclub', activeRoyaltyEpochId, vibeClubRewardAmount);
                      } else {
                        const el = document.getElementById('available-claims-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  />
                ) : !hasNft ? (
                  <Button
                    as={Link}
                    to={typeof window !== 'undefined' && window.location.pathname.startsWith('/app') ? '/app/vibeclub' : '/vibeclub'}
                    variant="warn"
                    size="md"
                    fullWidth
                  >
                    Mint NFT before snapshot
                    <ArrowRight size={14} />
                  </Button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--green)' }}>
                    <CheckCircle2 size={14} />
                    <span>Eligible — Vibe Club member</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── SECTION 3: CLAIM HISTORY ── */}
      <div>
        <SectionTitle title="Claim history" count={claimedHistory?.length || 0} />
        {(!claimedHistory || claimedHistory.length === 0) ? (
          <EmptyState
            icon={<Clock size={28} color="var(--text-3)" />}
            title="No past claims"
            description="Claims completed on this connected wallet will be indexed here with direct BaseScan transaction receipts."
          />
        ) : (
          <div className="o1-history-list">
            {claimedHistory.map((item, idx) => {
              const isStaking = item?.type === 'staking' || item?.id?.startsWith('staking-') || item?.title?.toLowerCase().includes('staking');
              const isRoyalty = item?.type === 'vibeclub' || item?.id?.includes('vibeclub') || item?.title?.toLowerCase().includes('royalty');
              const categoryLabel = isStaking ? 'Staking' : isRoyalty ? 'Vibe Club' : 'Holder Rewards';
              const itemRoundId = item?.roundId || (item?.id ? parseInt(item.id.replace(/\D/g, '')) : null) || 1;
              const roundLabel = isStaking ? `Epoch ${itemRoundId}` : isRoyalty ? `Royalty ${itemRoundId}` : `Unlock ${itemRoundId}`;

              return (
                <div key={item.id || idx} className="o1-history-row">
                  <div className="o1-history-left">
                    <div className="o1-history-title">
                      {categoryLabel} · <span style={{ color: 'var(--accent)' }}>{roundLabel}</span>
                    </div>
                    <div className="o1-history-actions">
                      {isRoyalty && (
                        <Button
                          onClick={() => setShareModalItem(item)}
                          variant="ghost"
                          size="sm"
                          icon={<Share2 size={12} />}
                        >
                          Share
                        </Button>
                      )}
                      {isStaking && item?.link && (
                        <Button
                          as="a"
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          variant="ghost"
                          size="sm"
                          icon={<ExternalLink size={12} />}
                        >
                          o1 Vault
                        </Button>
                      )}
                      <Button
                        as="a"
                        href={item?.txHash && item.txHash.startsWith('0x') ? `https://basescan.org/tx/${item.txHash}` : (address ? `https://basescan.org/token/${CA}?a=${address}` : `https://basescan.org/token/${CA}`)}
                        target="_blank"
                        rel="noreferrer"
                        variant="ghost"
                        size="sm"
                        icon={<ExternalLink size={12} />}
                      >
                        BaseScan
                      </Button>
                    </div>
                  </div>

                  <div className="o1-history-right">
                    <span className="o1-history-amount">
                      +{Math.round(Number(item.amount || 0)).toLocaleString('en-US')} $VIBE
                    </span>
                    <span className="o1-history-date">
                      {new Date(item.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CELEBRATION / SHARE MODAL ── */}
      {shareModalItem && (
        <div onClick={() => setShareModalItem(null)} className="o1-share-modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="o1-share-modal-card">
            <button
              type="button"
              onClick={() => setShareModalItem(null)}
              className="o1-share-modal-close"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="o1-share-icon-wrap">
              <Check size={26} strokeWidth={3} />
            </div>

            <h3 className="o1-share-modal-title">Claim successful!</h3>
            <p className="o1-share-modal-desc">
              You claimed <strong style={{ color: 'var(--accent)' }}>+{Number(shareModalItem.amount || (activeRoyaltyEpochId === 5 ? 7207 : (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935))))).toLocaleString('en-US')} $VIBE</strong> in {shareModalItem.title || `Vibe Club · Royalty ${activeRoyaltyEpochId || 5}`}
            </p>

            <div className="o1-share-banner-frame">
              <img
                src={getRoyaltyBannerUrl(shareModalItem?.roundId || (shareModalItem?.id?.includes('5') ? 5 : (shareModalItem?.id?.includes('4') ? 4 : (shareModalItem?.id?.includes('3') ? 3 : (shareModalItem?.id?.includes('2') ? 2 : (activeRoyaltyEpochId || 5))))))}
                alt="Banner"
                className="o1-share-banner-img"
              />
            </div>

            <div className="o1-share-actions-grid">
              <Button
                onClick={handleDownloadBanner}
                disabled={downloadingBanner}
                variant="secondary"
                size="md"
                fullWidth
                icon={<Download size={15} />}
              >
                Save image
              </Button>
              <Button
                onClick={() => handleShareOnX(shareModalItem)}
                variant="primary"
                size="md"
                fullWidth
                icon={<Share2 size={15} />}
              >
                Share on 𝕏
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
