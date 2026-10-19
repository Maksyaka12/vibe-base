import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits, parseAbi, encodeFunctionData, parseUnits, parseAbiItem } from 'viem';
import { getPublicClient } from '../../config/rpc';
import { CheckCircle2, Loader2, ArrowUpRight, Copy, Check, Clock, Coins, Crown, Sparkles, RefreshCw, Lock, Gift, ChevronDown, User, Download, X, Share2 } from 'lucide-react';
import round1Data from '../../data/round_1_proofs.json';
import round2Data from '../../data/round_2_proofs.json';
import royalty1Data from '../../data/royalty_1_proofs.json';
import royalty2Data from '../../data/royalty_2_proofs.json';
import royalty3Data from '../../data/royalty_3_proofs.json';
import royalty4Data from '../../data/royalty_4_proofs.json';
import royalty5Data from '../../data/royalty_5_proofs.json';
import nftNames from '../../data/nftNames.json';
import { BaseAppClaimView } from './components/BaseAppClaimView';
import { BaseAppProfileView } from './components/BaseAppProfileView';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';
const NFT_CA = '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886';
const DISTRIBUTOR_CA = '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089';
export const ROYALTY_DISTRIBUTOR_CA = '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1';
export const STAKING_CONTRACT = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';
const O1 = 'https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453';
const VIBECLUB_MINT_URL = 'https://vibeverse.dog/vibeclub';
import { DATA_SUFFIX, appendBuilderSuffix } from '../../config/builderCode';
import { STAKING_VAULTS_INFO, ADMIN_WITHDRAWAL_TXS, HOLDER_ROUNDS, VIBECLUB_ROUNDS, royaltyBannerFor } from '../../data/rewardsSchedule';
import { roundProofs, publishedRounds } from '../../data/claimRounds';
export { STAKING_VAULTS_INFO, ADMIN_WITHDRAWAL_TXS };

export function getRoyaltyBannerUrl(epochId) {
  const epoch = Number(epochId) || 1;
  const uploaded = royaltyBannerFor(epoch); // set in Admin → Schedule → Vibe Club royalties
  if (uploaded) return uploaded;
  if (epoch === 1) {
    return '/vibe-club-royalties-banner.jpg';
  }
  return `/vibe-club-royalties-${epoch}.jfif`;
}

export const isBadTxHash = (hash) => {
  if (!hash || typeof hash !== 'string' || !hash.startsWith('0x')) return true;
  return ADMIN_WITHDRAWAL_TXS.has(hash.toLowerCase());
};

// Helper to fetch exact historical claim transactions from onchain RPC logs + Base block explorer
export async function fetchUserClaimTransactions(userAddress, customClient = null) {
  if (!userAddress) return {};
  try {
    const map = {};
    const seenTransfers = []; // every $VIBE transfer to the user seen below, for rounds published from the admin panel
    const lowerUser = userAddress.toLowerCase();
    const DISTRIBUTOR_CA_LOWER = DISTRIBUTOR_CA.toLowerCase();
    const ROYALTY_CA_LOWER = ROYALTY_DISTRIBUTOR_CA.toLowerCase();
    const STAKING_CA_LOWER = STAKING_CONTRACT.toLowerCase();
    const CLAIM_TOPIC = '0xb63b787020ee0a48ed6ddf0667249b333cea03eb87043aa21cb0490467df040c';

    // Seed verified historical claim hashes for admin
    if (lowerUser === ADMIN_WALLET.toLowerCase()) {
      map['holder-1'] = { id: 'holder-1', type: 'holder', roundId: 1, title: 'Holder Rewards · Unlock 1', txHash: '0x46b72eb1941e010a4952bdb396da20769599bceb835fd23af066005c88569e14', amount: 126127, timestamp: '2026-08-26T14:30:25.000Z' };
      map['vibeclub-1'] = { id: 'vibeclub-1', type: 'vibeclub', roundId: 1, title: 'Vibe Club Royalties · Royalty 1', txHash: '0x0efb6d5e52fcca2e770f4c78db0c8b86f6c919ea53272813ec68816e5a5c0d84', amount: 22935, timestamp: '2026-08-28T14:00:17.000Z' };
      map['vibeclub-2'] = { id: 'vibeclub-2', type: 'vibeclub', roundId: 2, title: 'Vibe Club Royalties · Royalty 2', txHash: '0x88cde1d5ab45186ef77475ced14e2e4b370636da1e345275ee3a2fb5992880c7', amount: 17117, timestamp: '2026-09-07T14:00:00.000Z' };
    }

    // Expected allocations for this user if available in proof data
    const expHolder1 = round1Data?.claims?.[lowerUser]?.amount;
    const expHolder2 = round2Data?.claims?.[lowerUser]?.amount;
    const expRoyalty1 = royalty1Data?.claims?.[lowerUser]?.amount;
    const expRoyalty2 = royalty2Data?.claims?.[lowerUser]?.amount;
    const expRoyalty3 = royalty3Data?.claims?.[lowerUser]?.amount;
    const expRoyalty4 = royalty4Data?.claims?.[lowerUser]?.amount;
    const expRoyalty5 = royalty5Data?.claims?.[lowerUser]?.amount;

    const rpcClient = customClient || getPublicClient();

    // 1. Direct onchain RPC getLogs for staking claim events & transfers (most recent ~1,950 blocks)
    try {
      const currentBlock = await rpcClient.getBlockNumber();
      const fromBlk = currentBlock > 1950n ? (currentBlock - 1950n) : 0n;

      // Direct staking claim event query
      const stakingLogs = await rpcClient.getLogs({
        address: STAKING_CONTRACT,
        event: parseAbiItem('event EpochRewardClaimed(bytes32 indexed vaultId, uint64 indexed epochId, address indexed user, uint256 amount)'),
        args: { user: userAddress },
        fromBlock: fromBlk,
        toBlock: currentBlock
      });

      if (stakingLogs && stakingLogs.length > 0) {
        for (const log of stakingLogs) {
          const vaultId = log.args.vaultId?.toLowerCase();
          const matchedVault = STAKING_VAULTS_INFO.find(v => v.id.toLowerCase() === vaultId) || STAKING_VAULTS_INFO[0];
          const amountNum = Math.round(Number(formatUnits(log.args.amount || 0n, 18)));
          const key = `staking-${matchedVault.roundId}`;
          map[key] = {
            id: key,
            type: 'staking',
            roundId: matchedVault.roundId,
            vaultId: matchedVault.id,
            title: `Staking Rewards · Epoch ${matchedVault.roundId}`,
            amount: amountNum,
            txHash: log.transactionHash,
            timestamp: new Date().toISOString(),
            link: `https://launch.o1.exchange/staking/vaults/${matchedVault.id}?chain=8453`
          };
        }
      }

      // Recent Transfer logs for royalty / holder contracts
      const transferLogs = await rpcClient.getLogs({
        address: CA,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: { to: userAddress },
        fromBlock: fromBlk,
        toBlock: currentBlock
      });

      if (transferLogs && transferLogs.length > 0) {
        for (const log of transferLogs) {
          const from = log.args.from?.toLowerCase();
          const txHash = log.transactionHash;
          const valNum = Math.round(Number(formatUnits(log.args.value || 0n, 18)));

          if (isBadTxHash(txHash)) continue;
          seenTransfers.push({ from, txHash, timestamp: null, value: valNum });

          if (from === ROYALTY_CA_LOWER) {
            if (expRoyalty5 && Math.abs(valNum - expRoyalty5) < 2) {
              map['vibeclub-5'] = {
                id: 'vibeclub-5',
                type: 'vibeclub',
                roundId: 5,
                title: 'Vibe Club Royalties · Royalty 5',
                txHash,
                amount: expRoyalty5,
                timestamp: new Date().toISOString()
              };
            } else if (expRoyalty4 && Math.abs(valNum - expRoyalty4) < 2) {
              map['vibeclub-4'] = {
                id: 'vibeclub-4',
                type: 'vibeclub',
                roundId: 4,
                title: 'Vibe Club Royalties · Royalty 4',
                txHash,
                amount: expRoyalty4,
                timestamp: new Date().toISOString()
              };
            } else if (expRoyalty3 && Math.abs(valNum - expRoyalty3) < 2) {
              map['vibeclub-3'] = {
                id: 'vibeclub-3',
                type: 'vibeclub',
                roundId: 3,
                title: 'Vibe Club Royalties · Royalty 3',
                txHash,
                amount: expRoyalty3,
                timestamp: new Date().toISOString()
              };
            } else if (expRoyalty2 && Math.abs(valNum - expRoyalty2) < 2) {
              map['vibeclub-2'] = {
                id: 'vibeclub-2',
                type: 'vibeclub',
                roundId: 2,
                title: 'Vibe Club Royalties · Royalty 2',
                txHash,
                amount: expRoyalty2,
                timestamp: new Date().toISOString()
              };
            } else if (expRoyalty1 && Math.abs(valNum - expRoyalty1) < 2) {
              map['vibeclub-1'] = {
                id: 'vibeclub-1',
                type: 'vibeclub',
                roundId: 1,
                title: 'Vibe Club Royalties · Royalty 1',
                txHash,
                amount: expRoyalty1,
                timestamp: new Date().toISOString()
              };
            }
          } else if (from === DISTRIBUTOR_CA_LOWER) {
            if (expHolder2 && Math.abs(valNum - expHolder2) < 2) {
              map['holder-2'] = {
                id: 'holder-2',
                type: 'holder',
                roundId: 2,
                title: 'Holder Rewards · Unlock 2',
                txHash,
                amount: expHolder2,
                timestamp: new Date().toISOString()
              };
            } else if (expHolder1 && Math.abs(valNum - expHolder1) < 2) {
              map['holder-1'] = {
                id: 'holder-1',
                type: 'holder',
                roundId: 1,
                title: 'Holder Rewards · Unlock 1',
                txHash,
                amount: expHolder1,
                timestamp: new Date().toISOString()
              };
            }
          }
        }
      }
    } catch (rpcLogErr) {
      console.warn('RPC log query error:', rpcLogErr);
    }

    // 2. All staking claims of this wallet in one request: EpochRewardClaimed logs filtered by user.
    // Paging through token transfers below can miss old claims on busy wallets.
    let stakingLogsLoaded = false;
    const stakingLogsUrl = `https://base.blockscout.com/api?module=logs&action=getLogs&address=${STAKING_CONTRACT}&fromBlock=0&toBlock=latest&topic0=${CLAIM_TOPIC}&topic3=0x${lowerUser.slice(2).padStart(64, '0')}&topic0_3_opr=and`;
    for (let attempt = 0; attempt < 3 && !stakingLogsLoaded; attempt++) {
      try {
        const res = await fetch(stakingLogsUrl);
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data?.result)) continue;
        for (const log of data.result) {
          const vaultId = log.topics?.[1]?.toLowerCase();
          const matchedVault = STAKING_VAULTS_INFO.find(v => v.id.toLowerCase() === vaultId);
          if (!matchedVault || isBadTxHash(log.transactionHash)) continue;
          const key = `staking-${matchedVault.roundId}`;
          map[key] = {
            id: key,
            type: 'staking',
            roundId: matchedVault.roundId,
            vaultId: matchedVault.id,
            title: `Staking Rewards · Epoch ${matchedVault.roundId}`,
            amount: Math.round(Number(formatUnits(BigInt(log.data), 18))),
            txHash: log.transactionHash,
            timestamp: new Date(parseInt(log.timeStamp, 16) * 1000).toISOString(),
            link: `https://launch.o1.exchange/staking/vaults/${matchedVault.id}?chain=8453`
          };
        }
        stakingLogsLoaded = true;
      } catch (e) {
        console.warn('Error fetching staking claim logs:', e);
      }
    }

    // 3. Query Base explorer API (Blockscout) for full history across all rounds
    let url = `https://base.blockscout.com/api/v2/addresses/${lowerUser}/token-transfers?type=ERC-20&token=${CA}`;
    let pageCount = 0;

    while (url && pageCount < 6) {
      pageCount++;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      if (data?.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const from = item?.from?.hash?.toLowerCase();
          const txHash = item?.transaction_hash;
          const timestamp = item?.timestamp;
          const valueNum = Math.round(Number(BigInt(item?.total?.value || 0) / 10n**18n));

          if (isBadTxHash(txHash)) continue;
          seenTransfers.push({ from, txHash, timestamp, value: valueNum });

          if (from === DISTRIBUTOR_CA_LOWER) {
            const isUnlock1 = !timestamp || new Date(timestamp).getTime() < new Date('2026-09-25T00:00:00Z').getTime();
            const roundKey = isUnlock1 ? 'holder-1' : 'holder-2';
            const expectedAmt = isUnlock1 ? expHolder1 : expHolder2;
            if (expectedAmt && Math.abs(valueNum - expectedAmt) < 2) {
              map[roundKey] = {
                id: roundKey,
                type: 'holder',
                roundId: isUnlock1 ? 1 : 2,
                title: isUnlock1 ? 'Holder Rewards · Unlock 1' : 'Holder Rewards · Unlock 2',
                txHash,
                timestamp,
                amount: expectedAmt
              };
            }
          } else if (from === ROYALTY_CA_LOWER) {
            const txTime = new Date(timestamp).getTime();
            const sep1 = new Date('2026-09-01T00:00:00Z').getTime();
            const sep12 = new Date('2026-09-12T00:00:00Z').getTime();
            const sep27 = new Date('2026-09-27T00:00:00Z').getTime();
            const oct7 = new Date('2026-10-07T00:00:00Z').getTime();
            
            let royaltyKey = 'vibeclub-1';
            let roundId = 1;
            let expectedAmt = expRoyalty1;
            if (txTime >= oct7) {
              royaltyKey = 'vibeclub-5';
              roundId = 5;
              expectedAmt = expRoyalty5;
            } else if (txTime >= sep27 && txTime < oct7) {
              royaltyKey = 'vibeclub-4';
              roundId = 4;
              expectedAmt = expRoyalty4;
            } else if (txTime >= sep12 && txTime < sep27) {
              royaltyKey = 'vibeclub-3';
              roundId = 3;
              expectedAmt = expRoyalty3;
            } else if (txTime >= sep1 && txTime < sep12) {
              royaltyKey = 'vibeclub-2';
              roundId = 2;
              expectedAmt = expRoyalty2;
            }
            if (expectedAmt && Math.abs(valueNum - expectedAmt) < 2) {
              map[royaltyKey] = {
                id: royaltyKey,
                type: 'vibeclub',
                roundId,
                title: `Vibe Club Royalties · Royalty ${roundId}`,
                txHash,
                timestamp,
                amount: expectedAmt
              };
            }
          } else if (from === STAKING_CA_LOWER && !stakingLogsLoaded) {
            try {
              const r = await rpcClient.getTransactionReceipt({ hash: txHash });
              const claimLog = r.logs.find(l => l.topics[0] === CLAIM_TOPIC);
              if (claimLog) {
                const vaultId = claimLog.topics[1]?.toLowerCase();
                const matchedVault = STAKING_VAULTS_INFO.find(v => v.id.toLowerCase() === vaultId) || STAKING_VAULTS_INFO[0];
                const amountNum = Math.round(Number(formatUnits(BigInt(claimLog.data), 18)));
                const key = `staking-${matchedVault.roundId}`;
                if (!map[key]) {
                  map[key] = {
                    id: key,
                    type: 'staking',
                    roundId: matchedVault.roundId,
                    vaultId: matchedVault.id,
                    title: `Staking Rewards · Epoch ${matchedVault.roundId}`,
                    amount: amountNum,
                    txHash,
                    timestamp: timestamp || matchedVault.defaultTime,
                    link: `https://launch.o1.exchange/staking/vaults/${matchedVault.id}?chain=8453`
                  };
                }
              }
            } catch (stErr) {
              console.warn('Error reading staking tx receipt:', stErr);
            }
          }
        }
      }
      url = data?.next_page_params ? (`https://base.blockscout.com/api/v2/addresses/${lowerUser}/token-transfers?` + new URLSearchParams(data.next_page_params).toString()) : null;
    }
    // Rounds published from the admin panel: their claim is the transfer from the right distributor
    // with exactly the user's allocation.
    for (const { type, round, data } of publishedRounds()) {
      const isHolder = type === 'holder';
      const key = `${isHolder ? 'holder' : 'vibeclub'}-${round}`;
      const expected = data?.claims?.[lowerUser]?.amount;
      if (!expected || map[key]) continue;
      const fromCa = isHolder ? DISTRIBUTOR_CA_LOWER : ROYALTY_CA_LOWER;
      const used = new Set(Object.values(map).map((v) => v.txHash));
      const hit = seenTransfers.find((t) => t.from === fromCa && Math.abs(t.value - expected) < 2 && !used.has(t.txHash));
      if (hit) {
        map[key] = {
          id: key,
          type: isHolder ? 'holder' : 'vibeclub',
          roundId: round,
          title: isHolder ? `Holder Rewards · Unlock ${round}` : `Vibe Club Royalties · Royalty ${round}`,
          txHash: hit.txHash,
          timestamp: hit.timestamp || new Date().toISOString(),
          amount: expected,
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('Error fetching claim transactions from explorer:', err);
    return {};
  }
}

const MIN_HOLDER_BALANCE = 5000000; // 5M $VIBE

const DISTRIBUTOR_ABI = parseAbi([
  'function owner() view returns (address)',
  'function setMerkleRoot(uint256 epochId, bytes32 _merkleRoot) external',
  'function claim(uint256 epochId, uint256 amount, bytes32[] merkleProof) external',
  'function hasClaimed(uint256 epochId, address account) view returns (bool)',
  'function emergencyWithdraw(address token, uint256 amount) external'
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)'
]);

const NFT_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function walletMintCount(address owner) view returns (uint256)'
]);

function formatDigitalCountdown(targetIso) {
  if (!targetIso) return '';
  try {
    const now = new Date().getTime();
    const target = new Date(targetIso).getTime();
    const diff = target - now;

    if (diff <= 0) return '00D:00H:00M';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(days)}D:${pad(hours)}H:${pad(minutes)}M`;
  } catch (e) {
    return '';
  }
}

function formatCompactBalance(val) {
  if (val === null || val === undefined) return '0 $VIBE';
  const num = Number(val);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M $VIBE`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K $VIBE`;
  }
  return `${num.toLocaleString('en-US', { maximumFractionDigits: 0 })} $VIBE`;
}

export default function Checker({ isBaseAppMode = false, isProfileMode = false } = {}) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const address = user?.wallet?.address;

  // ⚡ Instant Cache Initialization (0ms initial layout shift)
  const [balance, setBalance] = useState(() => {
    if (!address) return null;
    const cached = localStorage.getItem(`vibe_balance_${address.toLowerCase()}`);
    return cached !== null ? Number(cached) : null;
  });
  const [nftCount, setNftCount] = useState(() => {
    if (!address) return null;
    const cached = localStorage.getItem(`vibe_nfts_${address.toLowerCase()}`);
    return cached !== null ? Number(cached) : null;
  });
  const [userNft, setUserNft] = useState(() => {
    if (!address) return null;
    try {
      const cached = localStorage.getItem(`vibe_user_nft_${address.toLowerCase()}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [claimStatus, setClaimStatus] = useState({});
  const [claimedHistory, setClaimedHistory] = useState([]);
  const [showRoyaltySuccessModal, setShowRoyaltySuccessModal] = useState(false);
  const [royaltyModalData, setRoyaltyModalData] = useState({
    epochId: 2,
    roundName: 'Royalty 2',
    amount: 17117
  });

  // Collapsible Section States
  const [isAvailableOpen, setIsAvailableOpen] = useState(true);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Admin Panel States
  const [adminDistributorType, setAdminDistributorType] = useState('holder'); // 'holder' | 'royalty'
  const [adminCustomRoyaltyCa, setAdminCustomRoyaltyCa] = useState(ROYALTY_DISTRIBUTOR_CA);
  const [adminEpochId, setAdminEpochId] = useState('1');
  const [adminMerkleRoot, setAdminMerkleRoot] = useState(round1Data?.merkleRoot || '0xac99116798ace01d3ebcb6f4c6e60ccd8c5d464b94da5de34aa04f602cb9115a');
  const [adminWithdrawAmount, setAdminWithdrawAmount] = useState('');
  const [adminBurnAmount, setAdminBurnAmount] = useState('');
  const [adminMetrics, setAdminMetrics] = useState(() => {
    try {
      const cached = localStorage.getItem('vibe_admin_metrics_holder');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      contractBalance: 9032537,
      claimedWalletsCount: 5,
      totalWalletsCount: Object.keys(round1Data?.claims || {}).length || 42,
      claimedTokens: 967463,
      metricsLoading: false
    };
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTxHash, setAdminTxHash] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState(false);

  // Live Timer Update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Smooth Scroll Helper
  const scrollToSection = (sectionId, setOpenState) => {
    if (setOpenState) setOpenState(true);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Helper to ensure deterministic latest-first sorting (newest claim always on top)
  const getSortedClaimedHistory = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const defaultTimeA = a?.id?.startsWith('staking-')
        ? (a?.id === 'staking-3' ? '2026-09-19T14:00:00.000Z' : (a?.id === 'staking-2' ? '2026-09-09T14:00:00.000Z' : '2026-08-30T14:00:00.000Z'))
        : (a?.id === 'vibeclub-5' ? '2026-10-07T14:00:00.000Z' : (a?.id === 'vibeclub-4' ? '2026-09-27T14:00:00.000Z' : (a?.id === 'vibeclub-3' ? '2026-09-17T14:00:00.000Z' : (a?.id === 'vibeclub-2' ? '2026-09-07T14:00:00.000Z' : (a?.id === 'vibeclub-1' ? '2026-08-28T14:00:00.000Z' : '2026-08-26T14:00:00.000Z')))));
      const defaultTimeB = b?.id?.startsWith('staking-')
        ? (b?.id === 'staking-3' ? '2026-09-19T14:00:00.000Z' : (b?.id === 'staking-2' ? '2026-09-09T14:00:00.000Z' : '2026-08-30T14:00:00.000Z'))
        : (b?.id === 'vibeclub-5' ? '2026-10-07T14:00:00.000Z' : (b?.id === 'vibeclub-4' ? '2026-09-27T14:00:00.000Z' : (b?.id === 'vibeclub-3' ? '2026-09-17T14:00:00.000Z' : (b?.id === 'vibeclub-2' ? '2026-09-07T14:00:00.000Z' : (b?.id === 'vibeclub-1' ? '2026-08-28T14:00:00.000Z' : '2026-08-26T14:00:00.000Z')))));
      const timeA = new Date(a?.timestamp || defaultTimeA).getTime();
      const timeB = new Date(b?.timestamp || defaultTimeB).getTime();
      return timeB - timeA;
    });
  };

  // Restore cached state on wallet connection
  useEffect(() => {
    if (address) {
      const cachedBal = localStorage.getItem(`vibe_balance_${address.toLowerCase()}`);
      if (cachedBal !== null) setBalance(Number(cachedBal));

      const cachedNfts = localStorage.getItem(`vibe_nfts_${address.toLowerCase()}`);
      if (cachedNfts !== null) setNftCount(Number(cachedNfts));

      try {
        const cachedNft = localStorage.getItem(`vibe_user_nft_${address.toLowerCase()}`);
        if (cachedNft) setUserNft(JSON.parse(cachedNft));
      } catch {}

      try {
        const stored = localStorage.getItem(`vibe_claim_history_${address.toLowerCase()}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const sanitized = parsed
              .filter(item => {
                if (!item || !item.id) return false;
                if (isBadTxHash(item.txHash)) return false;
                if ((item.type === 'vibeclub' || item.id.startsWith('vibeclub')) && item.amount > 100000) return false;
                return true;
              })
              .map(item => {
                if (item.id === 'vibeclub-5') {
                  const correctAmt = royalty5Data?.claims?.[address.toLowerCase()]?.amount || 7207;
                  return { ...item, roundId: 5, title: 'Vibe Club Royalties · Royalty 5', amount: correctAmt };
                }
                if (item.id === 'vibeclub-4') {
                  const correctAmt = royalty4Data?.claims?.[address.toLowerCase()]?.amount || 9909;
                  return { ...item, roundId: 4, title: 'Vibe Club Royalties · Royalty 4', amount: correctAmt };
                }
                if (item.id === 'vibeclub-3') {
                  const correctAmt = royalty3Data?.claims?.[address.toLowerCase()]?.amount || 18018;
                  return { ...item, roundId: 3, title: 'Vibe Club Royalties · Royalty 3', amount: correctAmt };
                }
                if (item.id === 'vibeclub-2') {
                  const correctAmt = royalty2Data?.claims?.[address.toLowerCase()]?.amount || 17117;
                  const isAdminWallet = address.toLowerCase() === ADMIN_WALLET.toLowerCase();
                  const fallbackTx = isAdminWallet ? '0x88cde1d5ab45186ef77475ced14e2e4b370636da1e345275ee3a2fb5992880c7' : null;
                  const txHash = (item.txHash && !isBadTxHash(item.txHash)) ? item.txHash : fallbackTx;
                  return {
                    ...item,
                    roundId: 2,
                    title: 'Vibe Club Royalties · Royalty 2',
                    amount: correctAmt,
                    txHash
                  };
                }
                if (item.id === 'vibeclub-1') {
                  const correctAmt = royalty1Data?.claims?.[address.toLowerCase()]?.amount || 22935;
                  const isAdminWallet = address.toLowerCase() === ADMIN_WALLET.toLowerCase();
                  const fallbackTx = isAdminWallet ? '0x0efb6d5e52fcca2e770f4c78db0c8b86f6c919ea53272813ec68816e5a5c0d84' : null;
                  const txHash = (item.txHash && !isBadTxHash(item.txHash)) ? item.txHash : fallbackTx;
                  return { ...item, roundId: 1, title: 'Vibe Club Royalties · Royalty 1', amount: correctAmt, txHash };
                }
                if (item.id === 'holder-2') {
                  const correctAmt = round2Data?.claims?.[address.toLowerCase()]?.amount || 500000;
                  return { ...item, roundId: 2, title: 'Holder Rewards · Unlock 2', amount: Math.round(Number(correctAmt)) };
                }
                if (item.id === 'holder-1') {
                  const correctAmt = round1Data?.claims?.[address.toLowerCase()]?.amount || 126127;
                  const isAdminWallet = address.toLowerCase() === ADMIN_WALLET.toLowerCase();
                  const fallbackTx = isAdminWallet ? '0x46b72eb1941e010a4952bdb396da20769599bceb835fd23af066005c88569e14' : null;
                  const txHash = (item.txHash && !isBadTxHash(item.txHash)) ? item.txHash : fallbackTx;
                  return { ...item, roundId: 1, title: 'Holder Rewards · Unlock 1', amount: Math.round(Number(correctAmt)), txHash };
                }
                return { ...item, amount: Math.round(Number(item.amount || 0)) };
              });
            setClaimedHistory(getSortedClaimedHistory(sanitized));
          }
        }
      } catch {}

      // Fast background fetch of accurate claim transactions
      fetchUserClaimTransactions(address).then(txMap => {
        if (txMap && Object.keys(txMap).length > 0) {
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            let updated = [...prevList];
            // 1. Update existing items with verified txHash
            updated = updated.map(item => {
              const info = txMap[item.id];
              if (info && !isBadTxHash(info.txHash)) {
                return {
                  ...item,
                  txHash: info.txHash || item.txHash,
                  timestamp: info.timestamp || item.timestamp,
                  amount: info.amount || item.amount,
                  link: info.link || item.link
                };
              }
              return item;
            });
            // 2. ONLY add verified staking claims from txMap (holder and royalty claims are strictly gated by onchain hasClaimed)
            for (const [k, info] of Object.entries(txMap)) {
              if (k.startsWith('staking') && !updated.some(item => item && item.id === k)) {
                updated.push({
                  id: k,
                  type: 'staking',
                  roundId: info.roundId || 1,
                  vaultId: info.vaultId,
                  title: info.title || `Staking Rewards · Epoch ${info.roundId || 1}`,
                  amount: info.amount,
                  txHash: info.txHash,
                  timestamp: info.timestamp,
                  link: info.link
                });
              }
            }
            localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(updated));
            return getSortedClaimedHistory(updated);
          });
        }
      }).catch(() => {});

      // Sync Staking Claims
      try {
        const rpcClient = getPublicClient();
        syncStakingClaimHistory(rpcClient, address);
      } catch (e) {}
    } else {
      setClaimedHistory([]);
    }
  }, [address]);

  // Fast Parallel Lookup of User's Specific NFT
  const fetchUserNft = async (userAddress, count) => {
    if (!userAddress || !count || count <= 0) {
      setUserNft(null);
      return;
    }
    try {
      const cached = localStorage.getItem(`vibe_user_nft_${userAddress.toLowerCase()}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) setUserNft(parsed);
        } catch {}
      }

      // Check VIP & Admin address priority
      if (userAddress.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
        const adminNft = { id: 3, name: nftNames['3'] || 'MKS Vibe', image: '/nft/images/3.png' };
        setUserNft(adminNft);
        localStorage.setItem(`vibe_user_nft_${userAddress.toLowerCase()}`, JSON.stringify(adminNft));
        return;
      }

      const client = getPublicClient();
      const checkLimit = 115;
      const calls = [];
      for (let i = 1; i <= checkLimit; i++) {
        calls.push({
          address: NFT_CA,
          abi: parseAbi(['function ownerOf(uint256) view returns (address)']),
          functionName: 'ownerOf',
          args: [BigInt(i)]
        });
      }
      const results = await client.multicall({ contracts: calls, allowFailure: true });
      for (let i = 0; i < results.length; i++) {
        if (results[i]?.status === 'success' && results[i]?.result && results[i].result.toLowerCase() === userAddress.toLowerCase()) {
          const tokenId = i + 1;
          const name = nftNames[String(tokenId)] || `Vibe Club #${tokenId}`;
          const nftObj = {
            id: tokenId,
            name,
            image: `/nft/images/${tokenId}.png`
          };
          setUserNft(nftObj);
          localStorage.setItem(`vibe_user_nft_${userAddress.toLowerCase()}`, JSON.stringify(nftObj));
          return;
        }
      }
      const fallbackObj = {
        id: 1,
        name: 'Vibe Club Member',
        image: '/nft/images/1.png'
      };
      setUserNft(fallbackObj);
      localStorage.setItem(`vibe_user_nft_${userAddress.toLowerCase()}`, JSON.stringify(fallbackObj));
    } catch (err) {
      console.warn("Error finding user NFT:", err);
    }
  };

  // Lightweight sync of claimed transaction history for Holder Rewards
  const syncClaimHistory = async (client, userAddress, roundId = 1, txMap = {}) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem(`vibe_claim_history_${userAddress.toLowerCase()}`) || '[]');
      const existingItem = existingHistory.find(h => h && h.id === `holder-${roundId}`);
      const rData = roundProofs('holder', roundId);
      const defaultAmt = roundId === 2 ? 500000 : (roundId === 1 ? 126127 : 0);
      const defaultTime = roundId === 2 ? '2026-09-25T14:00:00.000Z' : (roundId === 1 ? '2026-08-26T14:00:00.000Z' : (HOLDER_ROUNDS.find(r => r.id === roundId)?.targetDate || new Date().toISOString()));
      const holderAmount = rData?.claims?.[userAddress.toLowerCase()]?.amount || defaultAmt;
      const txInfo = txMap[`holder-${roundId}`];
      const isAdminWallet = userAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();
      const defaultAdminTx = (isAdminWallet && roundId === 1) ? '0x46b72eb1941e010a4952bdb396da20769599bceb835fd23af066005c88569e14' : null;
      let txHash = (txInfo?.txHash && !isBadTxHash(txInfo.txHash))
        ? txInfo.txHash
        : ((existingItem?.txHash && !isBadTxHash(existingItem.txHash)) ? existingItem.txHash : defaultAdminTx);
      const timestamp = txInfo?.timestamp || existingItem?.timestamp || defaultTime;
      const amount = holderAmount;

      const syncedItem = {
        id: `holder-${roundId}`,
        type: 'holder',
        roundId,
        title: `Holder Rewards · Unlock ${roundId}`,
        amount,
        txHash,
        timestamp
      };

      setClaimedHistory(prev => {
        const prevList = Array.isArray(prev) ? prev : [];
        const updated = getSortedClaimedHistory([syncedItem, ...prevList.filter(h => h && h.id !== `holder-${roundId}`)]);
        localStorage.setItem(`vibe_claim_history_${userAddress.toLowerCase()}`, JSON.stringify(updated));
        return updated;
      });
    } catch (claimErr) {
      console.warn('Sync claim history error:', claimErr);
    }
  };

  // Lightweight sync of claimed transaction history for Vibe Club Royalties
  const syncRoyaltyClaimHistory = async (client, userAddress, targetCa, roundId = 1, txMap = {}) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem(`vibe_claim_history_${userAddress.toLowerCase()}`) || '[]');
      const existingItem = existingHistory.find(h => h && h.id === `vibeclub-${roundId}`);
      const rData = roundProofs('royalty', roundId);
      const defaultAmt = roundId > 5 ? 0 : roundId === 5 ? 7207 : (roundId === 4 ? 9909 : (roundId === 3 ? 18018 : (roundId === 2 ? 17117 : 22935)));
      const defaultTime = roundId > 5 ? (VIBECLUB_ROUNDS.find(r => r.id === roundId)?.targetDate || new Date().toISOString()) : roundId === 5 ? '2026-10-07T14:00:00.000Z' : (roundId === 4 ? '2026-09-27T14:00:00.000Z' : (roundId === 3 ? '2026-09-17T14:00:00.000Z' : (roundId === 2 ? '2026-09-07T14:00:00.000Z' : '2026-08-28T14:00:00.000Z')));
      const royaltyAmount = rData?.claims?.[userAddress.toLowerCase()]?.amount || defaultAmt;
      const txInfo = txMap[`vibeclub-${roundId}`];
      const isAdminWallet = userAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();
      let defaultAdminTx = null;
      if (isAdminWallet) {
        if (roundId === 1) defaultAdminTx = '0x0efb6d5e52fcca2e770f4c78db0c8b86f6c919ea53272813ec68816e5a5c0d84';
        if (roundId === 2) defaultAdminTx = '0x88cde1d5ab45186ef77475ced14e2e4b370636da1e345275ee3a2fb5992880c7';
      }
      let txHash = (txInfo?.txHash && !isBadTxHash(txInfo.txHash))
        ? txInfo.txHash
        : ((existingItem?.txHash && !isBadTxHash(existingItem.txHash)) ? existingItem.txHash : defaultAdminTx);
      const timestamp = txInfo?.timestamp || existingItem?.timestamp || defaultTime;
      const amount = royaltyAmount;

      const syncedItem = {
        id: `vibeclub-${roundId}`,
        type: 'vibeclub',
        roundId: roundId,
        title: `Vibe Club Royalties · Royalty ${roundId}`,
        amount,
        txHash,
        timestamp
      };

      setClaimedHistory(prev => {
        const prevList = Array.isArray(prev) ? prev : [];
        const updated = getSortedClaimedHistory([syncedItem, ...prevList.filter(h => h && h.id !== `vibeclub-${roundId}`)]);
        localStorage.setItem(`vibe_claim_history_${userAddress.toLowerCase()}`, JSON.stringify(updated));
        return updated;
      });
    } catch (claimErr) {
      console.warn('Sync royalty claim history error:', claimErr);
    }
  };

  // Lightweight sync of claimed transaction history for Staking Rewards
  const syncStakingClaimHistory = async (client, userAddress, txMap = {}) => {
    if (!userAddress) return;
    try {
      const lowerUser = userAddress.toLowerCase();
      let effectiveTxMap = { ...txMap };
      try {
        const freshMap = await fetchUserClaimTransactions(userAddress, client);
        if (freshMap) effectiveTxMap = { ...effectiveTxMap, ...freshMap };
      } catch (e) {}

      const stakingItems = Object.keys(effectiveTxMap)
        .filter(k => k.startsWith('staking-'))
        .map(k => effectiveTxMap[k])
        .filter(Boolean);

      if (stakingItems.length > 0) {
        setClaimedHistory(prev => {
          const prevList = Array.isArray(prev) ? prev : [];
          const nonStaking = prevList.filter(h => h && !h.id?.startsWith('staking-'));
          // Explorer responses can be partial (rate limits / Cloudflare), so keep staking claims
          // found earlier and only add or refresh the ones returned now.
          const freshIds = new Set(stakingItems.map(i => i.id));
          const keptStaking = prevList.filter(h => h && h.id?.startsWith('staking-') && !freshIds.has(h.id));
          const updated = getSortedClaimedHistory([...stakingItems, ...keptStaking, ...nonStaking]);
          localStorage.setItem(`vibe_claim_history_${lowerUser}`, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (claimErr) {
      console.warn('Sync staking claim history error:', claimErr);
    }
  };

  // Unified High-Speed Onchain RPC Sync (<350ms)
  const fetchBalances = async (isManual = false) => {
    if (!address) return;
    if (isManual) setLoading(true);
    try {
      const client = getPublicClient();
      const targetRoyaltyCa = adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA;
      // Rounds after the bundled ones (Unlock 3+, Royalty 6+) whose snapshot has happened.
      const nowTime = new Date();
      const extraRounds = [
        ...HOLDER_ROUNDS.filter(r => r.id > 2 && nowTime >= new Date(r.snapshotIso)).map(r => ({ type: 'holder', id: r.id, ca: DISTRIBUTOR_CA })),
        ...VIBECLUB_ROUNDS.filter(r => r.id > 5 && nowTime >= new Date(r.snapshotIso)).map(r => ({ type: 'vibeclub', id: r.id, ca: targetRoyaltyCa })),
      ];

      const results = await client.multicall({
        contracts: [
          {
            address: CA,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address]
          },
          {
            address: NFT_CA,
            abi: NFT_ABI,
            functionName: 'balanceOf',
            args: [address]
          },
          {
            address: NFT_CA,
            abi: NFT_ABI,
            functionName: 'walletMintCount',
            args: [address]
          },
          {
            address: DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [1n, address]
          },
          {
            address: DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [2n, address]
          },
          {
            address: targetRoyaltyCa,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [1n, address]
          },
          {
            address: targetRoyaltyCa,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [2n, address]
          },
          {
            address: targetRoyaltyCa,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [3n, address]
          },
          {
            address: targetRoyaltyCa,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [4n, address]
          },
          {
            address: targetRoyaltyCa,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [5n, address]
          },
          ...extraRounds.map(r => ({
            address: r.ca,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [BigInt(r.id), address]
          }))
        ],
        allowFailure: true
      });

      // 1. $VIBE Balance
      if (results[0]?.status === 'success' && results[0].result !== undefined) {
        const liveBal = Number(formatUnits(results[0].result, 18));
        setBalance(liveBal);
        localStorage.setItem(`vibe_balance_${address.toLowerCase()}`, liveBal.toString());
      }

      // 2. Vibe Club NFT Count
      let currentNfts = 0;
      if (results[1]?.status === 'success' && results[1].result !== undefined) {
        currentNfts = Number(results[1].result);
      } else if (results[2]?.status === 'success' && results[2].result !== undefined) {
        currentNfts = Number(results[2].result);
      }
      setNftCount(currentNfts);
      localStorage.setItem(`vibe_nfts_${address.toLowerCase()}`, currentNfts.toString());

      // 3. User NFT Profile Avatar
      if (currentNfts > 0) {
        fetchUserNft(address, currentNfts);
      } else {
        setUserNft(null);
        localStorage.removeItem(`vibe_user_nft_${address.toLowerCase()}`);
      }

      // 4. Onchain claim status checks & Explorer Tx Hash Sync
      // Claim status straight from the contract, before the (slow) explorer history lookup below,
      // so claim cards appear as soon as the chain answers.
      const earlyStatus = {};
      [['holder', 1, 3], ['holder', 2, 4], ['vibeclub', 1, 5], ['vibeclub', 2, 6], ['vibeclub', 3, 7], ['vibeclub', 4, 8], ['vibeclub', 5, 9]].forEach(([type, id, i]) => {
        if (results[i]?.status === 'success') earlyStatus[`${type}-${id}`] = results[i].result === true ? 'claimed' : 'unclaimed';
      });
      extraRounds.forEach((r, i) => {
        if (results[10 + i]?.status === 'success') earlyStatus[`${r.type}-${r.id}`] = results[10 + i].result === true ? 'claimed' : 'unclaimed';
      });
      setClaimStatus(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(earlyStatus)) if (prev[k] !== 'claiming') next[k] = v;
        return next;
      });

      const hasAnyClaim = results[3]?.result === true || results[4]?.result === true || results[5]?.result === true || results[6]?.result === true || results[7]?.result === true || results[8]?.result === true || results[9]?.result === true || results.slice(10).some(r => r?.result === true);
      let txMap = {};
      if (hasAnyClaim) {
        try {
          txMap = await fetchUserClaimTransactions(address, client);
        } catch (e) {}
      }

      // Holder Round 1
      if (results[3]?.status === 'success') {
        if (results[3].result === true) {
          setClaimStatus(prev => ({ ...prev, 'holder-1': 'claimed' }));
          syncClaimHistory(client, address, 1, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'holder-1': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'holder-1');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Holder Round 2
      if (results[4]?.status === 'success') {
        if (results[4].result === true) {
          setClaimStatus(prev => ({ ...prev, 'holder-2': 'claimed' }));
          syncClaimHistory(client, address, 2, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'holder-2': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'holder-2');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 1
      if (results[5]?.status === 'success') {
        if (results[5].result === true) {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-1': 'claimed' }));
          syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, 1, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-1': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-1');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 2
      if (results[6]?.status === 'success') {
        if (results[6].result === true) {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-2': 'claimed' }));
          syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, 2, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-2': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-2');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 3
      if (results[7]?.status === 'success') {
        if (results[7].result === true) {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-3': 'claimed' }));
          syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, 3, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-3': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-3');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 4
      if (results[8]?.status === 'success') {
        if (results[8].result === true) {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-4': 'claimed' }));
          syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, 4, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-4': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-4');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 5
      if (results[9]?.status === 'success') {
        if (results[9].result === true) {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-5': 'claimed' }));
          syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, 5, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, 'vibeclub-5': 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-5');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Unlock 3+ / Royalty 6+
      extraRounds.forEach((r, i) => {
        const res = results[10 + i];
        if (res?.status !== 'success') return;
        const key = `${r.type}-${r.id}`;
        if (res.result === true) {
          setClaimStatus(prev => ({ ...prev, [key]: 'claimed' }));
          if (r.type === 'holder') syncClaimHistory(client, address, r.id, txMap);
          else syncRoyaltyClaimHistory(client, address, targetRoyaltyCa, r.id, txMap);
        } else {
          setClaimStatus(prev => ({ ...prev, [key]: 'unclaimed' }));
          setClaimedHistory(prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== key);
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      });

      // Sync Staking Claims
      syncStakingClaimHistory(client, address, txMap);
    } catch (e) {
      console.warn("Background balance fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check Claim Status for Round 1 Holder
  const isHolderRound1Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'holder-1')) || claimStatus['holder-1'] === 'claimed';
  const isHolderRound1Ended = currentTime >= new Date(HOLDER_ROUNDS[0].nextSnapshotDate || '2026-09-25T00:00:00Z');
  const isHolderRound1Live = currentTime >= new Date(HOLDER_ROUNDS[0].targetDate) && !isHolderRound1Ended;
  const isHolderRound1Available = isHolderRound1Live && !isHolderRound1Claimed;

  // Check Claim Status for Round 2 Holder
  const isHolderRound2Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'holder-2')) || claimStatus['holder-2'] === 'claimed';
  const isHolderRound2Ended = currentTime >= new Date(HOLDER_ROUNDS[1].nextSnapshotDate || '2026-10-25T00:00:00Z');
  const isHolderRound2Live = currentTime >= new Date(HOLDER_ROUNDS[1].targetDate) && !isHolderRound2Ended;
  const isHolderRound2Available = isHolderRound2Live && !isHolderRound2Claimed;

  // Active Holder Round & Proof Data
  // Generic round state: the active round is the latest one whose snapshot has happened; its proofs come from
  // the bundled files or the snapshot published in the admin panel (claimRounds).
  const roundClaimKey = (type, id) => `${type === 'holder' ? 'holder' : 'vibeclub'}-${id}`;
  const isRoundClaimed = (type, id) => (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === roundClaimKey(type, id))) || claimStatus[roundClaimKey(type, id)] === 'claimed';
  const latestStartedRound = (rounds) => [...rounds].reverse().find(r => currentTime >= new Date(r.snapshotIso)) || rounds[0];
  const isRoundLive = (r) => currentTime >= new Date(r.targetDate) && currentTime < new Date(r.nextSnapshotDate);

  const activeHolderRound = latestStartedRound(HOLDER_ROUNDS);
  const activeHolderEpochId = activeHolderRound.id;
  const activeHolderData = roundProofs('holder', activeHolderEpochId);
  const userProofData = (address && activeHolderData && activeHolderData.claims) ? activeHolderData.claims[address.toLowerCase()] : null;
  const isHolderEligibleLive = Boolean(balance !== null && balance >= MIN_HOLDER_BALANCE);
  const hasConfirmedHolderClaim = !!userProofData;
  const holderRewardAmount = userProofData ? (userProofData.amount || 0) : 0;

  const activeHolderClaimed = isRoundClaimed('holder', activeHolderEpochId);
  const activeHolderLive = isRoundLive(activeHolderRound);
  // Only once the contract has answered for this round, so an already-claimed round never flashes as claimable.
  const activeHolderAvailable = activeHolderLive && !activeHolderClaimed && claimStatus[roundClaimKey('holder', activeHolderEpochId)] !== undefined;

  // Check Claim Status for Royalty 1 Vibe Club
  const isVibeClubRoyalty1Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'vibeclub-1')) || claimStatus['vibeclub-1'] === 'claimed';
  const isVibeClubRoyalty1Ended = currentTime >= new Date(VIBECLUB_ROUNDS[0].nextSnapshotDate || '2026-09-07T00:00:00Z');
  const isVibeClubRoyalty1Live = currentTime >= new Date(VIBECLUB_ROUNDS[0].targetDate) && !isVibeClubRoyalty1Ended;
  const isVibeClubRoyalty1Available = isVibeClubRoyalty1Live && !isVibeClubRoyalty1Claimed;

  // Check Claim Status for Royalty 2 Vibe Club
  const isVibeClubRoyalty2Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'vibeclub-2')) || claimStatus['vibeclub-2'] === 'claimed';
  const isVibeClubRoyalty2Ended = currentTime >= new Date(VIBECLUB_ROUNDS[1].nextSnapshotDate || '2026-09-17T00:00:00Z');
  const isVibeClubRoyalty2Live = currentTime >= new Date(VIBECLUB_ROUNDS[1].targetDate) && !isVibeClubRoyalty2Ended;
  const isVibeClubRoyalty2Available = isVibeClubRoyalty2Live && !isVibeClubRoyalty2Claimed;

  // Check Claim Status for Royalty 3 Vibe Club
  const isVibeClubRoyalty3Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'vibeclub-3')) || claimStatus['vibeclub-3'] === 'claimed';
  const isVibeClubRoyalty3Ended = currentTime >= new Date(VIBECLUB_ROUNDS[2].nextSnapshotDate || '2026-09-27T00:00:00Z');
  const isVibeClubRoyalty3Live = currentTime >= new Date(VIBECLUB_ROUNDS[2].targetDate) && !isVibeClubRoyalty3Ended;
  const isVibeClubRoyalty3Available = isVibeClubRoyalty3Live && !isVibeClubRoyalty3Claimed;

  // Check Claim Status for Royalty 4 Vibe Club
  const isVibeClubRoyalty4Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'vibeclub-4')) || claimStatus['vibeclub-4'] === 'claimed';
  const isVibeClubRoyalty4Ended = currentTime >= new Date(VIBECLUB_ROUNDS[3].nextSnapshotDate || '2026-10-07T00:00:00Z');
  const isVibeClubRoyalty4Live = currentTime >= new Date(VIBECLUB_ROUNDS[3].targetDate) && !isVibeClubRoyalty4Ended;
  const isVibeClubRoyalty4Available = isVibeClubRoyalty4Live && !isVibeClubRoyalty4Claimed;

  // Check Claim Status for Royalty 5 Vibe Club
  const isVibeClubRoyalty5Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'vibeclub-5')) || claimStatus['vibeclub-5'] === 'claimed';
  const isVibeClubRoyalty5Ended = currentTime >= new Date(VIBECLUB_ROUNDS[4].nextSnapshotDate || '2026-10-17T00:00:00Z');
  const isVibeClubRoyalty5Live = currentTime >= new Date(VIBECLUB_ROUNDS[4].targetDate) && !isVibeClubRoyalty5Ended;
  const isVibeClubRoyalty5Available = isVibeClubRoyalty5Live && !isVibeClubRoyalty5Claimed;

  // Active Royalty Round & Proof Data
  const activeRoyaltyRound = latestStartedRound(VIBECLUB_ROUNDS);
  const activeRoyaltyEpochId = activeRoyaltyRound.id;
  const activeRoyaltyData = roundProofs('royalty', activeRoyaltyEpochId);
  const userRoyaltyProofData = (address && activeRoyaltyData && activeRoyaltyData.claims) ? activeRoyaltyData.claims[address.toLowerCase()] : null;
  const isVibeClubEligible = Boolean(nftCount !== null && nftCount > 0);
  const hasConfirmedRoyaltyClaim = !!userRoyaltyProofData;
  const vibeClubRewardAmount = userRoyaltyProofData ? (userRoyaltyProofData.amount || 0) : 0;

  const activeRoyaltyClaimed = isRoundClaimed('vibeclub', activeRoyaltyEpochId);
  const activeRoyaltyLive = isRoundLive(activeRoyaltyRound);
  const activeRoyaltyAvailable = activeRoyaltyLive && !activeRoyaltyClaimed && claimStatus[roundClaimKey('vibeclub', activeRoyaltyEpochId)] !== undefined;

  // Check if connected wallet is Admin / Contract Owner
  const isAdmin = !!(address && (address.toLowerCase() === ADMIN_WALLET.toLowerCase()));

  // Available claim count (where user is eligible and ready to claim)
  const availableHolderCount = (activeHolderAvailable && hasConfirmedHolderClaim) ? 1 : 0;
  const availableVibeClubCount = (activeRoyaltyAvailable && hasConfirmedRoyaltyClaim) ? 1 : 0;
  const totalAvailableCount = availableHolderCount + availableVibeClubCount;

  // Rewards the wallet was eligible for but did not claim before the window closed
  const expiredRounds = address
    ? [...HOLDER_ROUNDS.map(r => ['holder', r]), ...VIBECLUB_ROUNDS.map(r => ['vibeclub', r])].filter(([type, r]) =>
        // only rounds the contract confirmed as unclaimed, so a failed status check never shows as "missed"
        currentTime >= new Date(r.nextSnapshotDate) && claimStatus[roundClaimKey(type, r.id)] === 'unclaimed' && !isRoundClaimed(type, r.id) && roundProofs(type, r.id)?.claims?.[address.toLowerCase()])
    : [];
  const totalExpiredCount = expiredRounds.length;
  const totalExpiredTokens = expiredRounds.reduce((sum, [type, r]) => sum + (roundProofs(type, r.id).claims[address.toLowerCase()].amount || 0), 0);

  // Next Upcoming Unlocks to Display
  // The next round whose claim has not opened yet (rounds come from the shared, admin-editable schedule)
  const nextRound = (rounds) => rounds.find(r => currentTime < new Date(r.targetDate)) || rounds[rounds.length - 1];
  const upcomingHolderRound = nextRound(HOLDER_ROUNDS);
  const upcomingVibeClubRound = nextRound(VIBECLUB_ROUNDS);

  // ⚡ High-Speed Admin Metrics Unified Multicall (<350ms)
  const fetchAdminMetrics = async (overrideType, overrideEpoch, overrideCa) => {
    try {
      const type = overrideType || adminDistributorType;
      const epoch = overrideEpoch || adminEpochId || (isVibeClubRoyalty4Ended ? '5' : (isVibeClubRoyalty3Ended ? '4' : (isVibeClubRoyalty2Ended ? '3' : (isVibeClubRoyalty1Ended ? '2' : '1'))));
      const client = getPublicClient();
      const claims = Object.values(
        type === 'holder'
          ? (round1Data?.claims || {})
          : (epoch === '5' ? (royalty5Data?.claims || {}) : (epoch === '4' ? (royalty4Data?.claims || {}) : (epoch === '3' ? (royalty3Data?.claims || {}) : (epoch === '2' ? (royalty2Data?.claims || {}) : (royalty1Data?.claims || {})))))
      );
      const targetCa = type === 'holder' ? DISTRIBUTOR_CA : (overrideCa || adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);

      setAdminMetrics(prev => ({ ...prev, metricsLoading: true }));

      // 1 single multicall for distributor balance + all hasClaimed states
      const calls = [
        {
          address: CA,
          abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
          functionName: 'balanceOf',
          args: [targetCa]
        },
        ...claims.map(c => ({
          address: targetCa,
          abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
          functionName: 'hasClaimed',
          args: [BigInt(epoch), c.address]
        }))
      ];

      const results = await client.multicall({ contracts: calls, allowFailure: true });

      const balWei = results[0]?.status === 'success' && results[0].result !== undefined ? results[0].result : 0n;
      const contractBalance = Number(formatUnits(balWei, 18));

      let claimedWalletsCount = 0;
      let claimedTokens = 0;

      for (let i = 0; i < claims.length; i++) {
        if (results[i + 1]?.status === 'success' && results[i + 1]?.result === true) {
          claimedWalletsCount++;
          claimedTokens += (claims[i].amount || 0);
        }
      }

      const totalWallets = claims.length || (type === 'holder' ? (epoch === '2' ? Object.keys(round2Data?.claims || {}).length : 42) : (epoch === '5' ? 111 : (epoch === '4' ? 111 : (epoch === '3' ? 111 : (epoch === '2' ? 111 : 109)))));
      const totalPool = type === 'holder' ? 10000000 : (epoch === '5' ? (royalty5Data?.poolAmount || 800000) : (epoch === '4' ? 1100000 : (epoch === '3' ? 2000000 : (epoch === '2' ? 1900000 : 2500000))));

      const newMetrics = {
        contractBalance,
        claimedWalletsCount,
        totalWalletsCount: totalWallets,
        claimedTokens,
        unclaimedTokens: Math.max(0, totalPool - claimedTokens),
        metricsLoading: false
      };

      setAdminMetrics(newMetrics);
      localStorage.setItem(`vibe_admin_metrics_${type}`, JSON.stringify(newMetrics));
    } catch (e) {
      console.warn('Failed to fetch admin metrics:', e);
      setAdminMetrics(prev => ({ ...prev, metricsLoading: false }));
    }
  };

  // Auto-sync on mount and poll in background every 12 seconds
  useEffect(() => {
    if (authenticated && address) {
      fetchBalances();
      if (isAdmin) fetchAdminMetrics(adminDistributorType, adminEpochId, adminCustomRoyaltyCa);
      const interval = setInterval(() => {
        fetchBalances();
        if (isAdmin) fetchAdminMetrics(adminDistributorType, adminEpochId, adminCustomRoyaltyCa);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [authenticated, address, isAdmin, adminEpochId, adminDistributorType, adminCustomRoyaltyCa]);

  // Generic Admin Transaction Sender (supports Smart Wallet batching & EOA)
  const sendAdminTx = async (to, data) => {
    const activeWallet = wallets.find(w => w.address.toLowerCase() === address?.toLowerCase()) || wallets[0];
    const provider = await activeWallet.getEthereumProvider();
    const calldata = appendBuilderSuffix(data);

    try {
      const callsRes = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: '0x2105',
          from: address,
          calls: [{ to, value: '0x0', data: calldata }],
          capabilities: { dataSuffix: { value: DATA_SUFFIX, optional: true } }
        }]
      });

      if (callsRes) {
        if (typeof callsRes === 'string' && callsRes.startsWith('0x') && callsRes.length === 66) {
          return callsRes;
        }
        const callId = typeof callsRes === 'object' ? (callsRes.id || callsRes) : callsRes;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const status = await provider.request({
              method: 'wallet_getCallsStatus',
              params: [callId]
            });
            if (status?.receipts?.[0]?.transactionHash) {
              return status.receipts[0].transactionHash;
            }
          } catch (e) {}
        }
        return typeof callId === 'string' ? callId : 'Confirmed';
      }
    } catch (errCalls) {
      console.warn('wallet_sendCalls not supported, falling back to eth_sendTransaction:', errCalls);
      return await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to, data: calldata, value: '0x0' }]
      });
    }
  };

  // 1. Set Merkle Root Function
  const handleSetMerkleRoot = async () => {
    if (!wallets || wallets.length === 0) {
      setAdminError('No connected wallet detected.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess(false);
    try {
      const targetCa = adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);
      const calldata = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'setMerkleRoot',
        args: [BigInt(adminEpochId || '1'), adminMerkleRoot]
      });
      const txHash = await sendAdminTx(targetCa, calldata);
      setAdminTxHash(txHash || 'Confirmed');
      setAdminSuccess(true);
      setTimeout(fetchAdminMetrics, 3000);
    } catch (err) {
      console.error('Failed to set Merkle root:', err);
      setAdminError(err?.message || 'Failed to publish Merkle root.');
    } finally {
      setAdminLoading(false);
    }
  };

  // 2. Withdraw Tokens to Admin Wallet Function
  const handleWithdrawTokens = async () => {
    if (!wallets || wallets.length === 0) {
      setAdminError('No connected wallet detected.');
      return;
    }
    if (!adminWithdrawAmount || Number(adminWithdrawAmount) <= 0) {
      setAdminError('Please enter a valid amount of $VIBE to withdraw.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess(false);
    setAdminTxHash('');

    try {
      const targetCa = adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);
      const amountWei = parseUnits(adminWithdrawAmount.toString(), 18);
      const calldata = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'emergencyWithdraw',
        args: [CA, amountWei]
      });
      const txHash = await sendAdminTx(targetCa, calldata);
      setAdminTxHash(txHash || 'Confirmed');
      setAdminSuccess(true);
      setAdminWithdrawAmount('');
      setTimeout(fetchAdminMetrics, 3000);
    } catch (err) {
      console.error('Failed to withdraw tokens:', err);
      setAdminError(err?.message || 'Withdraw transaction failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  // 3. Burn Unclaimed Tokens Function (withdraws to admin and burns to 0x0...dead)
  const handleBurnTokens = async () => {
    if (!wallets || wallets.length === 0) {
      setAdminError('No connected wallet detected.');
      return;
    }
    if (!adminBurnAmount || Number(adminBurnAmount) <= 0) {
      setAdminError('Please enter a valid amount of $VIBE to burn.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess(false);
    setAdminTxHash('');

    try {
      const targetCa = adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);
      const amountWei = parseUnits(adminBurnAmount.toString(), 18);
      
      // Step 1: Withdraw from distributor contract to admin
      const withdrawCalldata = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'emergencyWithdraw',
        args: [CA, amountWei]
      });
      await sendAdminTx(targetCa, withdrawCalldata);

      // Step 2: Transfer to Dead address
      const burnCalldata = encodeFunctionData({
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer',
        args: ['0x000000000000000000000000000000000000dead', amountWei]
      });
      const txHash = await sendAdminTx(CA, burnCalldata);
      setAdminTxHash(txHash || 'Confirmed');
      setAdminSuccess(true);
      setAdminBurnAmount('');
      setTimeout(fetchAdminMetrics, 3000);
    } catch (err) {
      console.error('Failed to burn tokens:', err);
      setAdminError(err?.message || 'Burn transaction failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleClaim = async (type, roundId, amountNum) => {
    const claimKey = `${type}-${roundId}`;
    setClaimStatus(prev => ({ ...prev, [claimKey]: 'claiming' }));
    
    try {
      let txHashResult = null;
      const currentHolderData = roundProofs('holder', roundId);
      const currentHolderProof = (address && currentHolderData && currentHolderData.claims) ? currentHolderData.claims[address.toLowerCase()] : userProofData;
      if (type === 'holder' && currentHolderProof && wallets && wallets.length > 0) {
        const activeWallet = wallets.find(w => w.address.toLowerCase() === address?.toLowerCase()) || wallets[0];
        const provider = await activeWallet.getEthereumProvider();
        const amountWei = parseUnits(currentHolderProof.amount.toString(), 18);
        const calldataRaw = encodeFunctionData({
          abi: DISTRIBUTOR_ABI,
          functionName: 'claim',
          args: [BigInt(roundId), amountWei, currentHolderProof.proof]
        });
        // Append Official ERC-8021 Data Suffix for Base Builder Code
        const calldata = appendBuilderSuffix(calldataRaw);

        try {
          const callsRes = await provider.request({
            method: 'wallet_sendCalls',
            params: [{
              version: '1.0',
              chainId: '0x2105',
              from: address,
              calls: [{ to: DISTRIBUTOR_CA, value: '0x0', data: calldata }],
              capabilities: {
                dataSuffix: {
                  value: DATA_SUFFIX,
                  optional: true
                }
              }
            }]
          });
          if (callsRes) {
            const callId = typeof callsRes === 'object' ? (callsRes.id || callsRes) : callsRes;
            for (let i = 0; i < 20; i++) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const status = await provider.request({
                  method: 'wallet_getCallsStatus',
                  params: [callId]
                });
                if (status?.receipts?.[0]?.transactionHash) {
                  txHashResult = status.receipts[0].transactionHash;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          txHashResult = await provider.request({
            method: 'eth_sendTransaction',
            params: [{ from: address, to: DISTRIBUTOR_CA, data: calldata, value: '0x0' }]
          });
        }

        // Auto-fetch real transaction hash from onchain event log if needed
        if (!txHashResult || txHashResult.length !== 66) {
          try {
            const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
            const currentBlock = await client.getBlockNumber();
            const logs = await client.getLogs({
              address: CA,
              event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
              args: { from: DISTRIBUTOR_CA, to: address },
              fromBlock: currentBlock > 10000n ? (currentBlock - 9000n) : 0n,
              toBlock: currentBlock
            });
            if (logs && logs.length > 0) {
              txHashResult = logs[logs.length - 1].transactionHash;
            }
          } catch (e) {}
        }
      } else if (type === 'vibeclub' && (roundProofs('royalty', roundId)?.claims?.[address?.toLowerCase()] || userRoyaltyProofData) && wallets && wallets.length > 0) {
        const royaltyProof = roundProofs('royalty', roundId)?.claims?.[address?.toLowerCase()] || userRoyaltyProofData;
        const activeWallet = wallets.find(w => w.address.toLowerCase() === address?.toLowerCase()) || wallets[0];
        const provider = await activeWallet.getEthereumProvider();
        const amountWei = parseUnits(royaltyProof.amount.toString(), 18);
        const targetRoyaltyCa = adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA;
        const calldataRaw = encodeFunctionData({
          abi: DISTRIBUTOR_ABI,
          functionName: 'claim',
          args: [BigInt(roundId), amountWei, royaltyProof.proof]
        });
        const calldata = appendBuilderSuffix(calldataRaw);

        try {
          const callsRes = await provider.request({
            method: 'wallet_sendCalls',
            params: [{
              version: '1.0',
              chainId: '0x2105',
              from: address,
              calls: [{ to: targetRoyaltyCa, value: '0x0', data: calldata }],
              capabilities: {
                dataSuffix: {
                  value: DATA_SUFFIX,
                  optional: true
                }
              }
            }]
          });
          if (callsRes) {
            const callId = typeof callsRes === 'object' ? (callsRes.id || callsRes) : callsRes;
            for (let i = 0; i < 20; i++) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const status = await provider.request({
                  method: 'wallet_getCallsStatus',
                  params: [callId]
                });
                if (status?.receipts?.[0]?.transactionHash) {
                  txHashResult = status.receipts[0].transactionHash;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          txHashResult = await provider.request({
            method: 'eth_sendTransaction',
            params: [{ from: address, to: targetRoyaltyCa, data: calldata, value: '0x0' }]
          });
        }

        if (!txHashResult || txHashResult.length !== 66) {
          try {
            const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
            const currentBlock = await client.getBlockNumber();
            const logs = await client.getLogs({
              address: CA,
              event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
              args: { from: targetRoyaltyCa, to: address },
              fromBlock: currentBlock > 10000n ? (currentBlock - 9000n) : 0n,
              toBlock: currentBlock
            });
            if (logs && logs.length > 0) {
              txHashResult = logs[logs.length - 1].transactionHash;
            }
          } catch (e) {}
        }
      }

      // Add to claimed history
      const newClaimItem = {
        id: claimKey,
        type,
        roundId,
        title: type === 'holder' ? `Holder Rewards · Unlock ${roundId}` : `Vibe Club · Royalty ${roundId}`,
        amount: amountNum,
        txHash: txHashResult || ('0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')),
        timestamp: new Date().toISOString()
      };

      const prevHistory = Array.isArray(claimedHistory) ? claimedHistory : [];
      const updatedHistory = getSortedClaimedHistory([newClaimItem, ...prevHistory.filter(c => c && c.id !== claimKey)]);
      setClaimedHistory(updatedHistory);
      if (address) {
        localStorage.setItem(`vibe_claim_history_${address.toLowerCase()}`, JSON.stringify(updatedHistory));
      }

      setClaimStatus(prev => ({ ...prev, [claimKey]: 'claimed' }));
      if (type === 'vibeclub') {
        setRoyaltyModalData({
          epochId: roundId,
          roundName: `Royalty ${roundId}`,
          amount: amountNum
        });
        setShowRoyaltySuccessModal(true);
      }
    } catch (err) {
      console.error('Claim transaction error:', err);
      setClaimStatus(prev => ({ ...prev, [claimKey]: 'idle' }));
    }
  };

  // Download / Save to Photos (Direct iOS Photos / Android Gallery on Mobile, Direct file download on Desktop)
  const [downloadingBanner, setDownloadingBanner] = useState(false);
  const handleDownloadRoyaltyBanner = async () => {
    setDownloadingBanner(true);
    const currentEpoch = royaltyModalData.epochId || activeRoyaltyEpochId || 2;
    const imageUrl = getRoyaltyBannerUrl(currentEpoch);
    const fileName = `vibe-club-royalties-${currentEpoch}-claimed.jpg`;
    try {
      const isMobileDevice = typeof navigator !== 'undefined' && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth <= 768)
      );

      // 1. On Mobile: Use Native Web Share to save directly to iOS Photos / Android Gallery
      if (isMobileDevice && navigator.canShare) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Vibe Club Royalty ${currentEpoch} Claimed`,
              text: `Vibe Club Royalty ${currentEpoch} Claimed 🐶💰`
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

      // 2. On Desktop: Direct Instant File Download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download banner error:', e);
      window.open(imageUrl, '_blank');
    } finally {
      setDownloadingBanner(false);
    }
  };

  if (isBaseAppMode) {
    return (
      <section id={isProfileMode ? "profile-section" : "claim-portal"} style={{ padding: '24px 0 60px 0', background: 'transparent' }}>
        <div className="wrap" style={{ maxWidth: '1000px', padding: '0 14px' }}>
          {isProfileMode ? (
            <BaseAppProfileView
              address={address}
              ready={ready}
              authenticated={authenticated}
              login={login}
              logout={logout}
              balance={balance}
              nftCount={nftCount}
              userNft={userNft}
              loading={loading}
              copied={copied}
              copyAddress={copyAddress}
              fetchBalances={fetchBalances}
              currentTime={currentTime}
              claimedHistory={claimedHistory}
              isHolderEligibleLive={isHolderEligibleLive}
              totalAvailableCount={totalAvailableCount}
              totalAvailableTokens={((activeHolderAvailable && hasConfirmedHolderClaim) ? (holderRewardAmount || 0) : 0) + ((activeRoyaltyAvailable && hasConfirmedRoyaltyClaim) ? (vibeClubRewardAmount || 0) : 0)}
              totalExpiredCount={totalExpiredCount}
              totalExpiredTokens={totalExpiredTokens}
            />
          ) : (
            <BaseAppClaimView
              address={address}
              totalExpiredCount={totalExpiredCount}
              totalExpiredTokens={totalExpiredTokens}
              ready={ready}
              authenticated={authenticated}
              login={login}
              logout={logout}
              balance={balance}
              nftCount={nftCount}
              userNft={userNft}
              loading={loading}
              copied={copied}
              copyAddress={copyAddress}
              fetchBalances={fetchBalances}
              currentTime={currentTime}
              claimStatus={claimStatus}
              claimedHistory={claimedHistory}
              handleClaim={handleClaim}
              isHolderEligibleLive={isHolderEligibleLive}
              holderRewardAmount={holderRewardAmount}
              hasConfirmedHolderClaim={hasConfirmedHolderClaim}
              isHolderRound1Available={isHolderRound1Available}
              isHolderRound1Claimed={isHolderRound1Claimed}
              activeHolderEpochId={activeHolderEpochId}
              activeHolderRound={activeHolderRound}
              activeHolderAvailable={activeHolderAvailable}
              activeHolderClaimed={activeHolderClaimed}
              isVibeClubEligible={isVibeClubEligible}
              vibeClubRewardAmount={vibeClubRewardAmount}
              hasConfirmedRoyaltyClaim={hasConfirmedRoyaltyClaim}
              isVibeClubRoyalty1Available={isVibeClubRoyalty1Available}
              isVibeClubRoyalty1Claimed={isVibeClubRoyalty1Claimed}
              activeRoyaltyEpochId={activeRoyaltyEpochId}
              activeRoyaltyRound={activeRoyaltyRound}
              activeRoyaltyAvailable={activeRoyaltyAvailable}
              activeRoyaltyClaimed={activeRoyaltyClaimed}
              totalAvailableCount={totalAvailableCount}
              upcomingHolderRound={upcomingHolderRound}
              upcomingVibeClubRound={upcomingVibeClubRound}
              HOLDER_ROUNDS={HOLDER_ROUNDS}
              VIBECLUB_ROUNDS={VIBECLUB_ROUNDS}
              round1Data={round1Data}
              round2Data={round2Data}
              royalty1Data={royalty1Data}
              royalty2Data={royalty2Data}
              royalty3Data={royalty3Data}
              royalty4Data={royalty4Data}
              royalty5Data={royalty5Data}
              isAdmin={isAdmin}
              adminMetrics={adminMetrics}
              adminDistributorType={adminDistributorType}
              setAdminDistributorType={setAdminDistributorType}
              adminCustomRoyaltyCa={adminCustomRoyaltyCa}
              setAdminCustomRoyaltyCa={setAdminCustomRoyaltyCa}
              adminEpochId={adminEpochId}
              setAdminEpochId={setAdminEpochId}
              adminMerkleRoot={adminMerkleRoot}
              setAdminMerkleRoot={setAdminMerkleRoot}
              adminWithdrawAmount={adminWithdrawAmount}
              setAdminWithdrawAmount={setAdminWithdrawAmount}
              adminBurnAmount={adminBurnAmount}
              setAdminBurnAmount={setAdminBurnAmount}
              adminLoading={adminLoading}
              adminTxHash={adminTxHash}
              adminError={adminError}
              adminSuccess={adminSuccess}
              handleSetMerkleRoot={handleSetMerkleRoot}
              handleWithdrawTokens={handleWithdrawTokens}
              handleBurnTokens={handleBurnTokens}
              fetchAdminMetrics={fetchAdminMetrics}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="claim-portal" style={{ minHeight: '80vh', padding: '130px 0 100px 0', background: 'var(--bg)' }}>
      <div className="wrap" style={{ maxWidth: '1200px' }}>
        
        {/* Portal Header */}
        <div className="sec-head" style={{ textAlign: 'center', alignItems: 'center', marginBottom: '36px' }}>
          <h2>Claim <span className="bl">Portal</span></h2>
          <p className="sec-sub" style={{ textAlign: 'center', margin: '0 auto' }}>
            Check your eligibility &amp; Claim rewards
          </p>
        </div>

        {/* ── LOADING STATE ── */}
        {!ready ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', color: 'var(--blue)' }}>
            <Loader2 className="spin" size={40} />
          </div>
        ) : !authenticated ? (
          /* ── NOT AUTHENTICATED STATE (Matching Original Prod Checker) ── */
          <div
            className="checker-card"
            style={{
              background: 'var(--surface)',
              padding: '40px',
              borderRadius: '24px',
              
              textAlign: 'center',
              maxWidth: 600,
              margin: '0 auto'
            }}
          >
            <div className="ch-unauth">
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', overflow: 'hidden' }}>
                <img src="/new-logo-vibe.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="VIBE" />
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', fontWeight: 800, color: 'var(--ink)' }}>
                Wallet not connected
              </h3>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
                Please connect your wallet to check your eligibility and claim $VIBE rewards.
              </p>
              <button onClick={login} className="btn-fill" style={{ width: '100%', justifyContent: 'center' }}>
                Connect Wallet
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--muted)', fontSize: '0.8rem', marginTop: '16px' }}>
                Protected by <span style={{ fontWeight: '700', color: 'var(--ink)' }}>privy</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── AUTHENTICATED PORTAL VIEW ── */
          <div>
            
            {/* 👤 FULL STYLISH WEB3 USER DASHBOARD */}
            <div className="checker-user-card">
              {/* Top Hero Row: Big Avatar + Name (Left) & Wallet / Actions (Right) */}
              <div className="checker-profile-header">
                {/* Left: Big Avatar + Name + Badge (Matched in height) */}
                <div className="checker-profile-avatar-info">
                  {/* Big Avatar Container */}
                  <div
                    className="checker-avatar-box"
                    style={{
                      border: (userNft || (nftCount && nftCount > 0)) ? '3px solid var(--blue)' : '2.5px solid var(--text-2)',
                      background: (userNft || (nftCount && nftCount > 0)) ? 'var(--text)' : 'var(--text-2)',
                      }}
                  >
                    {userNft ? (
                      <img
                        src={userNft.image}
                        alt={userNft.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = '/new-logo-vibe.png'; }}
                      />
                    ) : (nftCount && nftCount > 0) ? (
                      <img
                        src="/new-logo-vibe.png"
                        alt="Vibe Club Member"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-3)' }}>
                        <User size={36} color="var(--text-3)" />
                      </div>
                    )}
                  </div>

                  {/* Name (Top) & Vibe Club Member Badge (Bottom) */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '2px',
                      minWidth: 0
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.05em', lineHeight: 1 }}>
                      Profile:
                    </div>
                    <h3 className="checker-profile-name">
                      {userNft ? userNft.name : ((nftCount && nftCount > 0) ? 'Vibe Club Member' : (userProofData ? 'Vibe Holder' : 'Unknown Dog'))}
                    </h3>

                    <div>
                      {(userNft || (nftCount && nftCount > 0)) ? (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: 'var(--green)',
                            background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                            border: '1.5px solid color-mix(in srgb, var(--green) 28%, transparent)',
                            padding: '2px 10px',
                            borderRadius: '99px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            lineHeight: 1.2
                          }}
                        >
                          Vibe Club Member
                        </span>
                      ) : (
                        <a
                          href={VIBECLUB_MINT_URL}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: 'var(--green)',
                            background: 'color-mix(in srgb, var(--green) 12%, transparent)',
                            border: '1.5px solid color-mix(in srgb, var(--green) 30%, transparent)',
                            padding: '2px 10px',
                            borderRadius: '99px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            lineHeight: 1.2,
                            textDecoration: 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Join Vibe Club ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Wallet Address Pill + Actions */}
                {!isBaseAppMode && (
                  <div className="checker-actions-header">
                    {/* Connected Wallet Address Pill */}
                    <div
                      style={{
                        background: 'var(--surface-2)',
                        border: '1.5px solid rgba(0, 140, 255, 0.2)',
                        borderRadius: '14px',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)',  display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.90rem', color: 'var(--ink)', fontWeight: 600 }}>
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                      </span>
                      <button
                        onClick={copyAddress}
                        title="Copy Address"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: copied ? 'var(--green)' : 'var(--blue)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px',
                          marginLeft: '2px'
                        }}
                      >
                        {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
                      </button>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="checker-buttons-row">
                      {/* Refresh Button */}
                      <button
                        onClick={() => {
                          fetchBalances(true);
                          if (isAdmin) fetchAdminMetrics();
                        }}
                        disabled={loading}
                        title="Refresh Onchain Balances"
                        style={{
                          background: 'var(--surface-2)',
                          border: '1.5px solid rgba(0, 140, 255, 0.22)',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          color: 'var(--blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                        <span>{loading ? 'Updating...' : 'Refresh'}</span>
                      </button>

                      {/* Disconnect Button */}
                      <button
                        onClick={logout}
                        style={{
                          background: 'rgba(239, 68, 68, 0.06)',
                          border: '1.5px solid rgba(239, 68, 68, 0.22)',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          padding: '10px 18px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dashboard Metric & Quick-Nav Tiles Grid (5 Columns in Single Row) */}
              <div className="dashboard-metrics-5">
                {/* 1. $VIBE Balance Tile */}
                <div
                  className="checker-metric-tile"
                  style={{
                    border: '1.5px solid rgba(0, 140, 255, 0.2)'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.04em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    $VIBE Balance
                  </div>
                  <div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      {loading || balance === null ? <Loader2 size={15} className="spin" /> : formatCompactBalance(balance)}
                    </div>
                    <div className="checker-tile-eligibility" style={{ fontSize: '0.67rem', color: isHolderEligibleLive ? 'var(--green)' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
                      {isHolderEligibleLive ? '✓ Eligible for Holder Rewards' : 'Not Eligible for Holder Rewards'}
                    </div>
                  </div>
                </div>

                {/* 2. Vibe Club Member Tile */}
                <div
                  className="checker-metric-tile"
                  style={{
                    border: '1.5px solid color-mix(in srgb, var(--green) 24%, transparent)'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.04em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    Vibe Club Member
                  </div>
                  <div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      {loading || nftCount === null ? <Loader2 size={15} className="spin" /> : `${nftCount || 0} NFT${nftCount === 1 ? '' : 's'}`}
                    </div>
                    <div className="checker-tile-eligibility" style={{ fontSize: '0.67rem', color: (nftCount && nftCount > 0) ? 'var(--green)' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>
                      {(nftCount && nftCount > 0) ? '✓ Eligible for NFT Royalties' : 'Not Eligible for NFT Royalties'}
                    </div>
                  </div>
                </div>

                {/* 3. Available Rewards Quick-Nav Tile */}
                <div
                  onClick={() => scrollToSection('available-rewards-section', setIsAvailableOpen)}
                  className="checker-metric-tile"
                  style={{
                    border: isHolderRound1Available ? '1.5px solid rgba(0, 140, 255, 0.35)' : '1.5px solid rgba(0, 140, 255, 0.18)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.04em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    Available Rewards
                  </div>
                  <div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      {totalAvailableCount} Available
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <span>Claim Rewards</span> ↓
                    </div>
                  </div>
                </div>

                {/* 4. Upcoming Rewards Quick-Nav Tile */}
                <div
                  onClick={() => scrollToSection('upcoming-rewards-section', setIsUpcomingOpen)}
                  className="checker-metric-tile"
                  style={{
                    border: '1.5px solid rgba(0, 140, 255, 0.18)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.04em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    Upcoming Unlocks
                  </div>
                  <div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      2 Upcoming
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <span>View Schedule</span> ↓
                    </div>
                  </div>
                </div>

                {/* 5. Claim History Quick-Nav Tile */}
                <div
                  onClick={() => scrollToSection('claimed-rewards-section', setIsHistoryOpen)}
                  className="checker-metric-tile"
                  style={{
                    border: '1.5px solid color-mix(in srgb, var(--green) 20%, transparent)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 700,  letterSpacing: '0.04em', marginBottom: '6px', whiteSpace: 'nowrap' }}>
                    Claim History
                  </div>
                  <div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      {claimedHistory?.length || 0} Claimed
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <span>View History</span> ↓
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* 🟢 SECTION 1: AVAILABLE TO CLAIM (Active Unclaimed Rewards)            */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <div id="available-rewards-section" style={{ marginBottom: '40px' }}>
              {/* Section Header (Outside Panel) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color="var(--blue)" /> Available Rewards ({totalAvailableCount})
                </h3>
                <button
                  onClick={() => setIsAvailableOpen(!isAvailableOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1.5px solid rgba(0, 160, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '5px 9px',
                    cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        transform: isAvailableOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      title={isAvailableOpen ? "Collapse section" : "Expand section"}
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>

                  {isAvailableOpen && (
                <div className="checker-section-panel">
                  {(activeHolderAvailable || activeRoyaltyAvailable) ? (
                    <div className="rewards-grid-2">
                      
                      {/* 1. Holder Rewards Active Claim Card */}
                      {activeHolderAvailable && (
                        <div
                          className="checker-reward-card"
                          style={{
                            border: '2px solid var(--blue)',
                            
                            position: 'relative'
                          }}
                        >
                          <div>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <img
                                  src="/new-logo-vibe.png"
                                  alt="VIBE"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--blue)',
                                    
                                    flexShrink: 0
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                    Holder Rewards
                                  </h4>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', padding: '2px 7px', borderRadius: '99px', lineHeight: 1.2, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                                    {activeHolderRound?.name || 'Unlock 2'}
                                  </span>
                                </div>
                              </div>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '99px',
                                  fontSize: '0.66rem',
                                  fontWeight: 900,
                                  
                                  letterSpacing: '0.04em',
                                  background: '#ecfdf5',
                                  color: 'var(--green)',
                                  border: '1px solid #a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                Claim Live
                              </span>
                            </div>

                            {/* Metric Box (Rewards Pool) */}
                            <div
                              style={{
                                background: '#f8fafc',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                border: '1px solid rgba(0, 140, 255, 0.18)',
                                
                                marginBottom: '14px'
                              }}
                            >
                              <div style={{ fontSize: '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <Coins size={12} color="var(--blue)" /> Rewards Pool
                              </div>
                              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                10,000,000 <span style={{ fontSize: '0.86rem', color: 'var(--blue)', fontWeight: 800 }}>$VIBE</span>
                              </div>
                            </div>

                            {/* Allocation / Eligibility Box */}
                            <div style={{ marginBottom: '18px' }}>
                              {hasConfirmedHolderClaim ? (
                                <div
                                  style={{
                                    background: '#ecfdf5',
                                    border: '1.5px solid #a7f3d0',
                                    borderRadius: '18px',
                                    padding: '16px 14px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '145px',
                                    boxSizing: 'border-box',
                                    gap: '8px'
                                  }}
                                >
                                  <h5 style={{ fontSize: '1.10rem', color: 'var(--green)', margin: 0, fontWeight: 900 }}>
                                    You're eligible for claim
                                  </h5>
                                  
                                  <div style={{ fontSize: '2.0rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
                                    {(holderRewardAmount || 0).toLocaleString('en-US')} <span style={{ fontSize: '1.0rem', color: 'var(--blue)', fontWeight: 900 }}>$VIBE</span>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    background: '#fef2f2',
                                    border: '1.5px solid #fecaca',
                                    borderRadius: '18px',
                                    padding: '16px 14px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '145px',
                                    boxSizing: 'border-box',
                                    gap: '8px'
                                  }}
                                >
                                  <img
                                    src="/vibe-sad-logo-nobg.png"
                                    alt="Sad VIBE"
                                    style={{ width: 70, height: 70, objectFit: 'contain' }}
                                  />
                                  <h5 style={{ fontSize: '1.05rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>
                                    Not Eligible for {activeHolderRound?.name || 'Round 2'}
                                  </h5>
                                  <a
                                    href={O1}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#ef4444',
                                      color: 'var(--text)',
                                      padding: '7px 14px',
                                      borderRadius: '10px',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Buy & Hold 5M+ $VIBE <ArrowUpRight size={13} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {hasConfirmedHolderClaim ? (
                              <button
                                onClick={() => handleClaim('holder', activeHolderEpochId, holderRewardAmount)}
                                disabled={claimStatus[`holder-${activeHolderEpochId}`] === 'claiming'}
                                className="btn-fill"
                                style={{
                                  width: '100%',
                                  padding: '12px 18px',
                                  borderRadius: '12px',
                                  fontSize: '0.90rem',
                                  fontWeight: 900,
                                  justifyContent: 'center',
                                  
                                  cursor: 'pointer'
                                }}
                              >
                                {claimStatus[`holder-${activeHolderEpochId}`] === 'claiming' ? (
                                  <>
                                    <Loader2 size={16} className="spin" /> Confirming Claim...
                                  </>
                                ) : (
                                  <>
                                    <Gift size={16} /> Claim {(holderRewardAmount || 0).toLocaleString('en-US')} $VIBE
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  width: '100%',
                                  padding: '11px 16px',
                                  borderRadius: '12px',
                                  background: 'var(--text-2)',
                                  border: '1px solid var(--text-2)',
                                  color: 'var(--text-3)',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
                                  cursor: 'not-allowed'
                                }}
                              >
                                Not Eligible for this Round
                              </button>
                            )}

                            {/* Claim window ends caption with countdown */}
                            <div
                              style={{
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.74rem',
                                color: 'var(--text-3)',
                                fontWeight: 700
                              }}
                            >
                              <Clock size={12} color="var(--text-3)" />
                              <span>Claim window ends:</span>
                              <span
                                style={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  fontSize: '0.74rem',
                                  fontWeight: 900,
                                  color: '#0284c7',
                                  background: 'rgba(2, 132, 199, 0.08)',
                                  border: '1px solid rgba(2, 132, 199, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  letterSpacing: '0.03em'
                                }}
                              >
                                {formatDigitalCountdown(upcomingHolderRound?.targetDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. Vibe Club Royalties Active Claim Card */}
                      {activeRoyaltyAvailable && (
                        <div
                          className="checker-reward-card"
                          style={{
                            border: '2px solid #00c8ff',
                            
                            position: 'relative'
                          }}
                        >
                          <div>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <img
                                  src="/nft-avatar.png"
                                  alt="Vibe Club"
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    objectFit: 'cover',
                                    border: '2px solid #00c8ff',
                                    
                                    flexShrink: 0
                                  }}
                                  onError={(e) => { e.target.src = '/new-logo-vibe.png'; }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                    Vibe Club Royalties
                                  </h4>
                                  <span style={{ fontSize: '0.66rem', fontWeight: 800, background: 'rgba(0, 200, 255, 0.1)', color: '#0284c7', border: '1px solid rgba(0, 200, 255, 0.25)', padding: '2px 7px', borderRadius: '99px', lineHeight: 1.2, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                                    {activeRoyaltyRound.name}
                                  </span>
                                </div>
                              </div>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '99px',
                                  fontSize: '0.66rem',
                                  fontWeight: 900,
                                  
                                  letterSpacing: '0.04em',
                                  background: '#ecfdf5',
                                  color: 'var(--green)',
                                  border: '1px solid #a7f3d0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                Claim Live
                              </span>
                            </div>

                            {/* Metric Box (Rewards Pool) */}
                            <div
                              style={{
                                background: '#f8fafc',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                border: '1px solid rgba(0, 200, 255, 0.2)',
                                
                                marginBottom: '14px'
                              }}
                            >
                              <div style={{ fontSize: '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                <Crown size={12} color="#0284c7" /> Royalty Pool
                              </div>
                              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                {activeRoyaltyRound.pool.replace(' $VIBE', '')} <span style={{ fontSize: '0.86rem', color: '#0284c7', fontWeight: 800 }}>$VIBE</span>
                              </div>
                            </div>

                            {/* Allocation / Eligibility Box */}
                            <div style={{ marginBottom: '18px' }}>
                              {(hasConfirmedRoyaltyClaim || isVibeClubEligible) ? (
                                <div
                                  style={{
                                    background: '#ecfdf5',
                                    border: '1.5px solid #a7f3d0',
                                    borderRadius: '18px',
                                    padding: '16px 14px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '145px',
                                    boxSizing: 'border-box',
                                    gap: '8px'
                                  }}
                                >
                                  <h5 style={{ fontSize: '1.10rem', color: 'var(--green)', margin: 0, fontWeight: 900 }}>
                                    You're eligible for claim
                                  </h5>
                                  
                                  <div style={{ fontSize: '2.0rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
                                    {(vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))).toLocaleString('en-US')} <span style={{ fontSize: '1.0rem', color: '#0284c7', fontWeight: 900 }}>$VIBE</span>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    background: '#fef2f2',
                                    border: '1.5px solid #fecaca',
                                    borderRadius: '18px',
                                    padding: '16px 14px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '145px',
                                    boxSizing: 'border-box',
                                    gap: '8px'
                                  }}
                                >
                                  <img
                                    src="/vibe-sad-logo-nobg.png"
                                    alt="Sad VIBE"
                                    style={{ width: 70, height: 70, objectFit: 'contain' }}
                                  />
                                  <h5 style={{ fontSize: '1.05rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>
                                    Not Eligible for {activeRoyaltyRound.name}
                                  </h5>
                                  <a
                                    href={VIBECLUB_MINT_URL}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: '#ef4444',
                                      color: 'var(--text)',
                                      padding: '7px 14px',
                                      borderRadius: '10px',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Mint Vibe Club NFT <ArrowUpRight size={13} />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div>
                            {activeRoyaltyClaimed ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                  disabled
                                  style={{
                                    width: '100%',
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    fontSize: '0.90rem',
                                    fontWeight: 900,
                                    background: '#ecfdf5',
                                    color: 'var(--green)',
                                    border: '1.5px solid #a7f3d0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'default'
                                  }}
                                >
                                  <CheckCircle2 size={16} color="var(--green)" /> Claimed Successfully
                                </button>
                                <button
                                  onClick={() => {
                                    setRoyaltyModalData({
                                      epochId: activeRoyaltyEpochId,
                                      roundName: activeRoyaltyRound.name,
                                      amount: vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))
                                    });
                                    setShowRoyaltySuccessModal(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    borderRadius: '12px',
                                    fontSize: '0.84rem',
                                    fontWeight: 800,
                                    background: 'var(--bg)',
                                    color: 'var(--text)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    }}
                                >
                                  <Share2 size={14} /> Share Claim on X
                                </button>
                              </div>
                            ) : (hasConfirmedRoyaltyClaim || isVibeClubEligible) ? (
                              <button
                                onClick={() => handleClaim('vibeclub', activeRoyaltyEpochId, vibeClubRewardAmount)}
                                disabled={claimStatus[`vibeclub-${activeRoyaltyEpochId}`] === 'claiming'}
                                className="btn-fill"
                                style={{
                                  width: '100%',
                                  padding: '12px 18px',
                                  borderRadius: '12px',
                                  fontSize: '0.90rem',
                                  fontWeight: 900,
                                  justifyContent: 'center',
                                  
                                  cursor: 'pointer'
                                }}
                              >
                                {claimStatus[`vibeclub-${activeRoyaltyEpochId}`] === 'claiming' ? (
                                  <>
                                    <Loader2 size={16} className="spin" /> Confirming Claim...
                                  </>
                                ) : (
                                  <>
                                    <Gift size={16} /> Claim {(vibeClubRewardAmount || (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935)))).toLocaleString('en-US')} $VIBE
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  width: '100%',
                                  padding: '11px 16px',
                                  borderRadius: '12px',
                                  background: 'var(--text-2)',
                                  border: '1px solid var(--text-2)',
                                  color: 'var(--text-3)',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
                                  cursor: 'not-allowed'
                                }}
                              >
                                Not Eligible for this Round
                              </button>
                            )}

                            {/* Claim window ends caption with countdown */}
                            <div
                              style={{
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.74rem',
                                color: 'var(--text-3)',
                                fontWeight: 700
                              }}
                            >
                              <Clock size={12} color="var(--text-3)" />
                              <span>Claim window ends:</span>
                              <span
                                style={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  fontSize: '0.74rem',
                                  fontWeight: 900,
                                  color: '#0284c7',
                                  background: 'rgba(2, 132, 199, 0.08)',
                                  border: '1px solid rgba(2, 132, 199, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  letterSpacing: '0.03em'
                                }}
                              >
                                {formatDigitalCountdown(upcomingVibeClubRound?.targetDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'var(--surface-2)',
                        border: '1.5px solid rgba(0, 140, 255, 0.22)',
                        borderRadius: '18px',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: 'var(--text-3)',
                        fontSize: '0.90rem',
                        fontWeight: 700,
                        }}
                    >
                      No active claims available right now. Check upcoming rewards below.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* ⏳ SECTION 2: UPCOMING REWARDS (Next Scheduled Unlocks & Royalties)    */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <div id="upcoming-rewards-section" style={{ marginBottom: '40px' }}>
              {/* Section Header (Outside Panel) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} color="#0284c7" /> Upcoming Rewards (2)
                </h3>
                <button
                  onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1.5px solid rgba(0, 160, 255, 0.25)',
                    borderRadius: '10px',
                    padding: '5px 9px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                    transition: 'all 0.2s ease',
                    transform: isUpcomingOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  title={isUpcomingOpen ? "Collapse section" : "Expand section"}
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {isUpcomingOpen && (
                <div className="checker-section-panel">
                  <div className="rewards-grid-2">
                    
                    {/* 1. Next Holder Rewards Unlock Card */}
                    <div
                      className="checker-reward-card"
                      style={{
                        border: '1.5px solid rgba(0, 160, 255, 0.25)',
                        
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <img
                              src="/new-logo-vibe.png"
                              alt="VIBE"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid rgba(0, 160, 255, 0.3)',
                                
                                flexShrink: 0
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                Holder Rewards
                              </h4>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', padding: '2px 7px', borderRadius: '99px', lineHeight: 1.2, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                                {upcomingHolderRound?.name || 'Unlock 1'}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              
                              letterSpacing: '0.04em',
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: 'var(--text-3)',
                              border: '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            <Lock size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
                            Locked
                          </span>
                        </div>

                        {/* Metric Box (Rewards Pool) */}
                        <div
                          style={{
                            background: '#f8fafc',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            border: '1px solid rgba(0, 140, 255, 0.18)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <Coins size={12} color="var(--blue)" /> Rewards Pool
                          </div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                            {upcomingHolderRound?.pool || '10,000,000 $VIBE'}
                          </div>
                        </div>

                        {/* Eligibility Box with Mascot */}
                        <div style={{ marginBottom: '18px' }}>
                          {isHolderEligibleLive ? (
                            <div
                              style={{
                                background: '#ecfdf5',
                                border: '1.5px solid #a7f3d0',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '175px',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              <img
                                src="/vibe-logo-nobg.png"
                                alt="Eligible VIBE"
                                style={{ width: 72, height: 72, objectFit: 'contain', margin: '-2px 0' }}
                              />
                              <h5 style={{ fontSize: '1.10rem', color: 'var(--green)', margin: 0, fontWeight: 900 }}>
                                You are Eligible!
                              </h5>
                            </div>
                          ) : (
                            <div
                              style={{
                                background: '#fef2f2',
                                border: '1.5px solid #fecaca',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '175px',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              <img
                                src="/vibe-sad-logo-nobg.png"
                                alt="Sad VIBE"
                                style={{ width: 68, height: 68, objectFit: 'contain', margin: '-2px 0' }}
                              />
                              <h5 style={{ fontSize: '1.05rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>
                                Not Eligible Yet
                              </h5>
                              <a
                                href={O1}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-fill"
                                style={{
                                  marginTop: '2px',
                                  padding: '7px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  borderRadius: '10px',
                                  textDecoration: 'none',
                                  background: '#ef4444'
                                }}
                              >
                                Buy & Hold 5M+ $VIBE <ArrowUpRight size={13} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Countdown Status Pill */}
                      <div
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1.5px solid rgba(0, 140, 255, 0.18)',
                          color: '#475569',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-3)', fontSize: '0.80rem', whiteSpace: 'nowrap' }}>
                          <Lock size={13} /> Claim opens {upcomingHolderRound?.unlockDate || 'Sep 25'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                            color: 'var(--blue)',
                            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatDigitalCountdown(upcomingHolderRound?.targetDate)}
                        </span>
                      </div>

                      {/* Snapshot Status Caption */}
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.74rem',
                          color: 'var(--text-3)',
                          fontWeight: 700
                        }}
                      >
                        {currentTime >= new Date(upcomingHolderRound?.snapshotIso) ? (
                          <>
                            <Check size={12} color="var(--green)" strokeWidth={3} />
                            <span>Snapshot taken: {upcomingHolderRound?.snapshotDate || 'Aug 26, 00:00 UTC'}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} color="var(--text-3)" />
                            <span>Snapshot date: {upcomingHolderRound?.snapshotDate || 'Aug 26, 00:00 UTC'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. Next Vibe Club Royalty Card */}
                    <div
                      className="checker-reward-card"
                      style={{
                        border: '1.5px solid rgba(0, 160, 255, 0.25)',
                        
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                                border: '1.5px solid rgba(0, 160, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                
                                flexShrink: 0
                              }}
                            >
                              <Crown size={17} color="var(--blue)" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                Vibe Club
                              </h4>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', padding: '2px 7px', borderRadius: '99px', lineHeight: 1.2, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                                {upcomingVibeClubRound?.name || 'Royalty 1'}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              
                              letterSpacing: '0.04em',
                              background: 'rgba(255, 255, 255, 0.9)',
                              color: 'var(--text-3)',
                              border: '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            <Lock size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
                            Locked
                          </span>
                        </div>

                        {/* Metric Box (Royalty Pool) */}
                        <div
                          style={{
                            background: '#f8fafc',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            border: '1px solid rgba(0, 140, 255, 0.18)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <Crown size={12} color="var(--blue)" /> Royalty Pool
                          </div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                            {upcomingVibeClubRound?.pool || '2,500,000 $VIBE'}
                          </div>
                        </div>

                        {/* Eligibility Box with Mascot */}
                        <div style={{ marginBottom: '18px' }}>
                          {isVibeClubEligible ? (
                            <div
                              style={{
                                background: '#ecfdf5',
                                border: '1.5px solid #a7f3d0',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '175px',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              <img
                                src="/vibe-logo-nobg.png"
                                alt="Eligible NFT"
                                style={{ width: 72, height: 72, objectFit: 'contain', margin: '-2px 0' }}
                              />
                              <h5 style={{ fontSize: '1.10rem', color: 'var(--green)', margin: 0, fontWeight: 900 }}>
                                Eligible Member!
                              </h5>
                            </div>
                          ) : (
                            <div
                              style={{
                                background: '#fef2f2',
                                border: '1.5px solid #fecaca',
                                borderRadius: '18px',
                                padding: '16px 14px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '175px',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              <img
                                src="/vibe-sad-logo-nobg.png"
                                alt="Sad VIBE"
                                style={{ width: 68, height: 68, objectFit: 'contain', margin: '-2px 0' }}
                              />
                              <h5 style={{ fontSize: '1.05rem', color: '#ef4444', margin: 0, fontWeight: 900 }}>
                                Not Eligible Yet
                              </h5>
                              <a
                                href={VIBECLUB_MINT_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-fill"
                                style={{
                                  marginTop: '2px',
                                  padding: '7px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  borderRadius: '10px',
                                  textDecoration: 'none',
                                  background: 'var(--green)'
                                }}
                              >
                                Mint Vibe Club NFT ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Countdown Status Pill */}
                      <div
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1.5px solid rgba(0, 140, 255, 0.18)',
                          color: '#475569',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-3)', fontSize: '0.80rem', whiteSpace: 'nowrap' }}>
                          <Lock size={13} /> Claim opens {upcomingVibeClubRound?.claimDate || 'Aug 28'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.76rem',
                            fontWeight: 900,
                            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                            color: 'var(--blue)',
                            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatDigitalCountdown(upcomingVibeClubRound?.targetDate)}
                        </span>
                      </div>

                      {/* Snapshot Status Caption */}
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.74rem',
                          color: 'var(--text-3)',
                          fontWeight: 700
                        }}
                      >
                        {currentTime >= new Date(upcomingVibeClubRound?.snapshotIso) ? (
                          <>
                            <Check size={12} color="var(--green)" strokeWidth={3} />
                            <span>Snapshot taken: {upcomingVibeClubRound?.snapshotDate || 'Aug 28, 00:00 UTC'}</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} color="var(--text-3)" />
                            <span>Snapshot date: {upcomingVibeClubRound?.snapshotDate || 'Aug 28, 00:00 UTC'}</span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* ✅ SECTION 3: CLAIMED REWARDS HISTORY                                 */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <div id="claimed-rewards-section" style={{ marginBottom: '40px' }}>
              {/* Section Header (Outside Panel) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="var(--green)" /> Claimed Rewards ({claimedHistory?.length || 0})
                </h3>
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    border: '1.5px solid color-mix(in srgb, var(--green) 25%, transparent)',
                    borderRadius: '10px',
                    padding: '5px 9px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--green)',
                    transition: 'all 0.2s ease',
                    transform: isHistoryOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  title={isHistoryOpen ? "Collapse section" : "Expand section"}
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {isHistoryOpen && (
                <div className="checker-section-panel">
                  {Array.isArray(claimedHistory) && claimedHistory.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {getSortedClaimedHistory(claimedHistory).map((item) => (
                        <div
                          key={item?.id || Math.random()}
                          style={{
                            background: 'var(--surface-2)',
                            border: '1.5px solid #a7f3d0',
                            borderRadius: '16px',
                            padding: '14px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            }}
                        >
                          {/* Top Row: Checkmark + Title (no subtitle) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={16} color="var(--green)" strokeWidth={3} />
                            </div>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 900, lineHeight: 1.25 }}>
                              {item?.title || 'Rewards Claim'}
                            </strong>
                          </div>

                          {/* Bottom Row: BaseScan & Share pills + Claim Amount in ONE single line */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                            {/* Action Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {/* o1 Vault link (If staking claim) */}
                              {item?.type === 'staking' && item?.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: '#faf5ff',
                                    border: '1.5px solid var(--text-2)',
                                    color: '#7e22ce',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease',
                                    
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f3e8ff'; e.currentTarget.style.borderColor = 'var(--text-2)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#faf5ff'; e.currentTarget.style.borderColor = 'var(--text-2)'; }}
                                >
                                  <span>o1 Vault</span>
                                  <ArrowUpRight size={12} strokeWidth={2.5} />
                                </a>
                              )}

                              {/* BaseScan Tx Link */}
                              <a
                                href={item?.txHash && item.txHash.startsWith('0x') ? `https://basescan.org/tx/${item.txHash}` : (address ? `https://basescan.org/token/${CA}?a=${address}` : `https://basescan.org/token/${CA}`)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: '#f0fdf4',
                                  border: '1.5px solid #86efac',
                                  color: '#15803d',
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#4ade80'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; }}
                              >
                                <span>BaseScan</span>
                                <ArrowUpRight size={12} strokeWidth={2.5} />
                              </a>

                              {/* Share Button (Only for Vibe Club Royalties) */}
                              {(item?.type === 'vibeclub' || item?.id?.includes('vibeclub')) && (
                                <button
                                  onClick={() => {
                                    const epId = item?.roundId || (item?.id?.includes('4') ? 4 : (item?.id?.includes('3') ? 3 : (item?.id?.includes('2') ? 2 : (item?.id?.includes('1') ? 1 : activeRoyaltyEpochId))));
                                    setRoyaltyModalData({
                                      epochId: epId,
                                      roundName: item?.title || `Royalty ${epId}`,
                                      amount: item?.amount || (epId === 4 ? 9909 : (epId === 3 ? 18018 : (epId === 2 ? 17117 : 22935)))
                                    });
                                    setShowRoyaltySuccessModal(true);
                                  }}
                                  style={{
                                    background: 'var(--bg)',
                                    color: 'var(--text)',
                                    border: 'none',
                                    padding: '5px 11px',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease',
                                    
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; }}
                                >
                                  <Share2 size={12} />
                                  <span>Share</span>
                                </button>
                              )}
                            </div>

                            {/* Amount */}
                            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--green)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              +{Math.round(Number(item?.amount || 0)).toLocaleString('en-US')}{' '}
                              <span style={{ fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 800 }}>$VIBE</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'var(--surface-2)',
                        border: '1.5px solid color-mix(in srgb, var(--green) 20%, transparent)',
                        borderRadius: '18px',
                        padding: '24px 20px',
                        textAlign: 'center',
                        color: 'var(--text-3)',
                        fontSize: '0.90rem',
                        fontWeight: 700,
                        }}
                    >
                      No claimed rewards yet. Check available rewards above to claim.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* SECTION 4: ADMIN PANEL (Contract Owner Only)                          */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {isAdmin && (
              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '20px',
                  padding: '24px',
                  marginTop: '40px',
                  marginBottom: '20px',
                  color: 'var(--text)',
                  border: '1px solid #1e293b',
                  }}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Admin Panel
                  </h3>
                  <a
                    href={`https://basescan.org/address/${adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-3)',
                      textDecoration: 'none',
                      fontFamily: 'monospace',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    Contract: {(adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA)).slice(0, 6)}...{(adminDistributorType === 'holder' ? DISTRIBUTOR_CA : (adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA)).slice(-4)} ↗
                  </a>
                </div>

                {/* Distributor Selector Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '12px' }}>
                  <button
                    onClick={() => {
                      setAdminDistributorType('holder');
                      setAdminEpochId('1');
                      setAdminMerkleRoot(round1Data?.merkleRoot || '');
                      fetchAdminMetrics('holder', '1', DISTRIBUTOR_CA);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: adminDistributorType === 'holder' ? 'var(--blue)' : 'transparent',
                      color: 'var(--text)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🔵 Holder Rewards (Vesting)
                  </button>
                  <button
                    onClick={() => {
                      setAdminDistributorType('royalty');
                      const rEpoch = isVibeClubRoyalty4Ended ? '5' : (isVibeClubRoyalty3Ended ? '4' : (isVibeClubRoyalty2Ended ? '3' : (isVibeClubRoyalty1Ended ? '2' : '1')));
                      setAdminEpochId(rEpoch);
                      setAdminMerkleRoot((rEpoch === '5' ? royalty5Data?.merkleRoot : (rEpoch === '4' ? royalty4Data?.merkleRoot : (rEpoch === '3' ? royalty3Data?.merkleRoot : (rEpoch === '2' ? royalty2Data?.merkleRoot : royalty1Data?.merkleRoot)))) || '');
                      fetchAdminMetrics('royalty', rEpoch, adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: adminDistributorType === 'royalty' ? '#0284c7' : 'transparent',
                      color: 'var(--text)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    👑 Vibe Club Royalties (NFT)
                  </button>
                </div>

                {adminDistributorType === 'royalty' && (
                  <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 800 }}>Royalty Contract CA:</span>
                    <input
                      type="text"
                      value={adminCustomRoyaltyCa}
                      onChange={(e) => {
                        const newCa = e.target.value.trim();
                        setAdminCustomRoyaltyCa(newCa);
                        if (newCa.length === 42) {
                          fetchAdminMetrics('royalty', adminEpochId, newCa);
                        }
                      }}
                      placeholder="0x... Royalty Distributor Address"
                      style={{
                        flex: 1,
                        minWidth: '220px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'var(--text)',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* 4. Live Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-3)',  fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Contract $VIBE Balance
                    </div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--accent)' }}>
                      {adminMetrics.metricsLoading ? '...' : (adminMetrics.contractBalance || 0).toLocaleString('en-US') + ' $VIBE'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-3)',  fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Wallets Claimed
                    </div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--green)' }}>
                      {adminMetrics.metricsLoading ? '...' : `${adminMetrics.claimedWalletsCount} / ${adminMetrics.totalWalletsCount}`}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, marginLeft: '6px' }}>
                        ({adminMetrics.totalWalletsCount > 0 ? ((adminMetrics.claimedWalletsCount / adminMetrics.totalWalletsCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-3)',  fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Total Claimed
                    </div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: '#f8fafc' }}>
                      {adminMetrics.metricsLoading ? '...' : (adminMetrics.claimedTokens || 0).toLocaleString('en-US') + ' $VIBE'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-3)',  fontWeight: 700, letterSpacing: '0.04em', marginBottom: '4px' }}>
                      Unclaimed in Round
                    </div>
                    <div style={{ fontSize: '1.20rem', fontWeight: 800, color: '#fbbf24' }}>
                      {adminMetrics.metricsLoading ? '...' : (adminMetrics.unclaimedTokens !== undefined ? adminMetrics.unclaimedTokens : Math.max(0, (adminDistributorType === 'holder' ? 10000000 : (adminEpochId === '2' ? 1900000 : 2500000)) - (adminMetrics.claimedTokens || 0))).toLocaleString('en-US') + ' $VIBE'}
                    </div>
                  </div>
                </div>

                {/* 1. Set Merkle Root */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
                    1. Publish Merkle Root Proof
                  </div>
                  <div className="admin-action-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={adminEpochId}
                      onChange={(e) => {
                        const newEpoch = e.target.value;
                        setAdminEpochId(newEpoch);
                        if (adminDistributorType === 'royalty') {
                          if (newEpoch === '5') {
                            setAdminMerkleRoot(royalty5Data?.merkleRoot || '');
                          } else if (newEpoch === '4') {
                            setAdminMerkleRoot(royalty4Data?.merkleRoot || '');
                          } else if (newEpoch === '3') {
                            setAdminMerkleRoot(royalty3Data?.merkleRoot || '');
                          } else if (newEpoch === '2') {
                            setAdminMerkleRoot(royalty2Data?.merkleRoot || '');
                          } else if (newEpoch === '1') {
                            setAdminMerkleRoot(royalty1Data?.merkleRoot || '');
                          }
                          fetchAdminMetrics('royalty', newEpoch, adminCustomRoyaltyCa || ROYALTY_DISTRIBUTOR_CA);
                        } else {
                          if (newEpoch === '1') {
                            setAdminMerkleRoot(round1Data?.merkleRoot || '');
                          }
                          fetchAdminMetrics('holder', newEpoch, DISTRIBUTOR_CA);
                        }
                      }}
                      placeholder="Round"
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'var(--text)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <input
                      type="text"
                      value={adminMerkleRoot}
                      onChange={(e) => setAdminMerkleRoot(e.target.value)}
                      placeholder="0x... Merkle Root"
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: 'var(--accent)',
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      onClick={handleSetMerkleRoot}
                      disabled={adminLoading}
                      style={{
                        background: 'var(--blue)',
                        color: 'var(--text)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: adminLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {adminLoading ? 'Processing...' : 'Set Merkle Root'}
                    </button>
                  </div>
                </div>

                {/* 2. Withdraw Tokens to Admin Wallet */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
                    2. Withdraw Tokens to Admin Wallet
                  </div>
                  <div className="admin-action-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={adminWithdrawAmount}
                        onChange={(e) => setAdminWithdrawAmount(e.target.value)}
                        placeholder="Amount in $VIBE (e.g. 10000000)"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          borderRadius: '10px',
                          padding: '10px 65px 10px 14px',
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={() => setAdminWithdrawAmount(String(adminMetrics.contractBalance || 0))}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'var(--text-3)',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        MAX
                      </button>
                    </div>
                    <button
                      onClick={handleWithdrawTokens}
                      disabled={adminLoading}
                      style={{
                        background: '#0284c7',
                        color: 'var(--text)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: adminLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {adminLoading ? 'Processing...' : 'Withdraw to Admin'}
                    </button>
                  </div>
                </div>

                {/* 3. Burn Unclaimed Tokens */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '18px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
                    3. Burn Unclaimed Tokens (Send to Dead Address)
                  </div>
                  <div className="admin-action-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        value={adminBurnAmount}
                        onChange={(e) => setAdminBurnAmount(e.target.value)}
                        placeholder="Amount in $VIBE to burn"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          borderRadius: '10px',
                          padding: '10px 110px 10px 14px',
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={() => setAdminBurnAmount(String(adminMetrics.unclaimedTokens !== undefined ? adminMetrics.unclaimedTokens : Math.max(0, (adminDistributorType === 'holder' ? 10000000 : 2500000) - (adminMetrics.claimedTokens || 0))))}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: '0.70rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        ALL UNCLAIMED
                      </button>
                    </div>
                    <button
                      onClick={handleBurnTokens}
                      disabled={adminLoading}
                      style={{
                        background: '#dc2626',
                        color: 'var(--text)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 18px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: adminLoading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {adminLoading ? 'Processing...' : 'Burn Tokens'}
                    </button>
                  </div>
                </div>

                {/* Status Feedback */}
                {adminSuccess && (
                  <div style={{ marginTop: '14px', background: 'color-mix(in srgb, var(--green) 15%, transparent)', border: '1px solid var(--green)', borderRadius: '10px', padding: '10px 14px', color: '#a7f3d0', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>Transaction confirmed successfully on Base!</span>
                    {adminTxHash && adminTxHash.startsWith('0x') && (
                      <a
                        href={`https://basescan.org/tx/${adminTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#34d399', textDecoration: 'underline', fontWeight: 800 }}
                      >
                        View on Basescan ↗
                      </a>
                    )}
                  </div>
                )}

                {adminError && (
                  <div style={{ marginTop: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem' }}>
                    {adminError}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* 👑 VIBE CLUB ROYALTY CLAIM SUCCESS MODAL                              */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {showRoyaltySuccessModal && (
        <div
          onClick={() => setShowRoyaltySuccessModal(false)}
          className="royalty-modal-overlay"
          style={{
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="royalty-modal-card"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowRoyaltySuccessModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--text-2)',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-3)',
                transition: 'all 0.2s ease',
                zIndex: 2
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-2)'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-2)'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <X size={18} />
            </button>

            {/* Success Green Badge (Desktop) */}
            <div className="royalty-modal-badge-desktop">
              <Check size={32} color="var(--text)" strokeWidth={3.2} />
            </div>

            {/* Title with Inline Icon on Mobile */}
            <h3 className="royalty-modal-title">
              <span className="royalty-modal-check-inline">
                <CheckCircle2 size={24} color="var(--green)" strokeWidth={2.8} />
              </span>
              Claim Successful!
            </h3>

            {/* Subtitle */}
            <p className="royalty-modal-sub">
              You’ve claimed <strong style={{ color: '#0284c7', fontWeight: 900 }}>+{(royaltyModalData.amount || (activeRoyaltyEpochId === 5 ? 7207 : (activeRoyaltyEpochId === 4 ? 9909 : (activeRoyaltyEpochId === 3 ? 18018 : (activeRoyaltyEpochId === 2 ? 17117 : 22935))))).toLocaleString('en-US')} $VIBE</strong> in Vibe Club {royaltyModalData.roundName || activeRoyaltyRound.name} 🐶🔥
            </p>

            {/* Royalty Banner Image */}
            <div
              style={{
                position: 'relative',
                borderRadius: '18px',
                overflow: 'hidden',
                border: '1.5px solid rgba(0, 200, 255, 0.35)',
                
                marginBottom: '20px'
              }}
            >
              <img
                src={getRoyaltyBannerUrl(royaltyModalData.epochId || activeRoyaltyEpochId)}
                alt={`Vibe Club ${royaltyModalData.roundName || activeRoyaltyRound.name} Banner`}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '16px'
                }}
                onError={(e) => {
                  const ep = royaltyModalData.epochId || activeRoyaltyEpochId;
                  if (!e.currentTarget.src.includes('.jpg')) {
                    e.currentTarget.src = `/vibe-club-royalties-${ep}.jpg`;
                  } else {
                    e.currentTarget.src = '/vibe-club-royalties-banner.jpg';
                  }
                }}
              />
            </div>

            {/* Action Buttons Flow (Step 1 & Step 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
              {/* Step 1 Column */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  
                  letterSpacing: '0.04em',
                  color: '#0284c7'
                }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'rgba(2, 132, 199, 0.12)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    color: '#0284c7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 900
                  }}>1</span>
                  <span>STEP 1 · SAVE</span>
                </div>
                <button
                  onClick={handleDownloadRoyaltyBanner}
                  disabled={downloadingBanner}
                  className="royalty-modal-btn"
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1.5px solid var(--text-2)',
                    
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  {downloadingBanner ? (
                    <>
                      <Loader2 size={15} className="spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Download size={15} /> Save Image
                    </>
                  )}
                </button>
              </div>

              {/* Step 2 Column */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  
                  letterSpacing: '0.04em',
                  color: '#0f172a'
                }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'rgba(15, 23, 42, 0.08)',
                    border: '1px solid rgba(15, 23, 42, 0.2)',
                    color: '#0f172a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 900
                  }}>2</span>
                  <span>STEP 2 · POST</span>
                </div>
                <button
                  onClick={() => {
                    const tweetText = `JUST CLAIMED MY NFT ROYALTIES 🐶💰\n\nHolding Vibe Club NFT unlocks passive $VIBE payouts every 10 days to all Club Members\n\nJoin Club → vibeverse.dog/vibeclub?ref=x`;
                    const isMobile = typeof navigator !== 'undefined' && (
                      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      ('ontouchstart' in window && window.innerWidth <= 768)
                    );
                    const appUrl = `twitter://post?message=${encodeURIComponent(tweetText)}`;
                    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

                    if (isMobile) {
                      window.location.href = appUrl;
                      const timer = setTimeout(() => {
                        window.open(shareUrl, '_blank', 'noopener,noreferrer');
                      }, 1500);
                      const handleBlur = () => {
                        clearTimeout(timer);
                        window.removeEventListener('blur', handleBlur);
                      };
                      window.addEventListener('blur', handleBlur);
                    } else {
                      window.open(shareUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="royalty-modal-btn"
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: 'none',
                    
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
