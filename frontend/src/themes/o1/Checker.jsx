import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { formatUnits, parseAbi, encodeFunctionData, parseUnits, parseAbiItem } from 'viem';
import { getPublicClient } from '../../config/rpc';
import nftNames from '../../data/nftNames.json';
import { BaseAppClaimView } from './components/BaseAppClaimView';
import { BaseAppProfileView } from './components/BaseAppProfileView';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';
const NFT_CA = '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886';
const DISTRIBUTOR_CA = '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089';
export const ROYALTY_DISTRIBUTOR_CA = '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1';
export const STAKING_CONTRACT = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';
import { DATA_SUFFIX, appendBuilderSuffix } from '../../config/builderCode';
import { STAKING_VAULTS_INFO, ADMIN_WITHDRAWAL_TXS, HOLDER_ROUNDS, VIBECLUB_ROUNDS, royaltyBannerFor } from '../../data/rewardsSchedule';
import { roundProofs, publishedRounds } from '../../data/claimRounds';
import { distributorFor, distributorAddresses } from '../../config/distributors';
import { findOwnedVibeClubNfts, findMintedVibeClubNft } from '../../data/vibeClubNft';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import { guardProvider, isDemoActive, showDemoTxPreview } from '../../config/demo';
import { useDemoMode } from '../../hooks/useDemoMode';
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

// Claim history is read from RPC logs and Blockscout, which rate-limits. Several callers ask for it
// at once (page load, the 12s poll, staking sync), so they share one request per wallet for a minute.
const CLAIM_TX_TTL_MS = 60000;
const claimTxCache = new Map();

export function invalidateClaimTransactions(userAddress) {
  if (userAddress) claimTxCache.delete(userAddress.toLowerCase());
}

export function fetchUserClaimTransactions(userAddress, customClient = null) {
  if (!userAddress) return Promise.resolve({});
  const key = userAddress.toLowerCase();
  const hit = claimTxCache.get(key);
  if (hit && Date.now() - hit.at < CLAIM_TX_TTL_MS) return hit.promise;
  const promise = loadUserClaimTransactions(userAddress, customClient);
  claimTxCache.set(key, { at: Date.now(), promise });
  return promise;
}

// Helper to fetch exact historical claim transactions from onchain RPC logs + Base block explorer
async function loadUserClaimTransactions(userAddress, customClient = null) {
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
    const expHolder1 = roundProofs('holder', 1)?.claims?.[lowerUser]?.amount;
    const expHolder2 = roundProofs('holder', 2)?.claims?.[lowerUser]?.amount;
    const expRoyalty1 = roundProofs('royalty', 1)?.claims?.[lowerUser]?.amount;
    const expRoyalty2 = roundProofs('royalty', 2)?.claims?.[lowerUser]?.amount;
    const expRoyalty3 = roundProofs('royalty', 3)?.claims?.[lowerUser]?.amount;
    const expRoyalty4 = roundProofs('royalty', 4)?.claims?.[lowerUser]?.amount;
    const expRoyalty5 = roundProofs('royalty', 5)?.claims?.[lowerUser]?.amount;

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
          const matchedVault = STAKING_VAULTS_INFO.find(v => v.id.toLowerCase() === vaultId);
          if (!matchedVault) continue; // vault not in the schedule yet
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

    // 2. All staking claims of this wallet from our own /api/history (Alchemy on the server).
    // Blockscout sits behind a Cloudflare challenge that in-app wallet browsers (Coinbase Wallet) do not
    // pass, so there the explorer requests below fail and staking payouts would be missing.
    let stakingLogsLoaded = false;
    try {
      const res = await fetch(`/api/history?address=${lowerUser}`);
      const data = res.ok ? await res.json() : null;
      if (Array.isArray(data?.items)) {
        for (const item of data.items) {
          if (item?.type !== 'staking_reward') continue;
          const matchedVault = STAKING_VAULTS_INFO.find(v => v.roundId === Number(item.round));
          if (!matchedVault || isBadTxHash(item.txHash)) continue;
          const key = `staking-${matchedVault.roundId}`;
          map[key] = {
            id: key,
            type: 'staking',
            roundId: matchedVault.roundId,
            vaultId: matchedVault.id,
            title: `Staking Rewards · Epoch ${matchedVault.roundId}`,
            amount: Math.round(Number(item.amount) || 0),
            txHash: item.txHash,
            timestamp: item.date || matchedVault.defaultTime,
            link: `https://launch.o1.exchange/staking/vaults/${matchedVault.id}?chain=8453`
          };
        }
        stakingLogsLoaded = true;
      }
    } catch (e) {
      console.warn('Error fetching staking history:', e);
    }

    // 2b. Fallback: EpochRewardClaimed logs of this wallet from Blockscout in one request.
    // Paging through token transfers below can miss old claims on busy wallets.
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
      // A blocked explorer (Cloudflare challenge -> CORS error) ends paging but keeps what was found above.
      const data = await fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (!data) break;
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
              const claimVault = claimLog && STAKING_VAULTS_INFO.find(v => v.id.toLowerCase() === claimLog.topics[1]?.toLowerCase());
              if (claimVault) {
                const matchedVault = claimVault;
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
      const fromCas = distributorAddresses(isHolder ? 'holder' : 'royalty');
      const used = new Set(Object.values(map).map((v) => v.txHash));
      const hit = seenTransfers.find((t) => fromCas.includes(t.from) && Math.abs(t.value - expected) < 2 && !used.has(t.txHash));
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

// User pressed reject / cancel in the wallet (EIP-1193 code 4001, or the wallet's own wording).
const isWalletRejection = (e) => e?.code === 4001 || e?.cause?.code === 4001 || /reject|denied|cancel/i.test(e?.message || '');

// When each wallet's NFT was last looked up (see fetchUserNft).
const NFT_RESCAN_MS = 5 * 60 * 1000;
const nftScannedAt = new Map();

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



export default function Checker({ isProfileMode = false } = {}) {
  const { authenticated: walletConnected, login } = usePrivy();
  const { demo } = useDemoMode();
  // the read-only demo loads everything for the demo address, as for a connected wallet
  const authenticated = walletConnected || demo;
  const { wallets } = useWallets();
  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const address = vibeActiveAddress;

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
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [claimStatus, setClaimStatus] = useState({});
  const [claimedHistory, setClaimedHistory] = useState([]);
  // History syncs are async and can finish after the user switched wallets (main <-> agent):
  // results for a wallet that is no longer shown are dropped.
  const historyOwner = useRef(null);
  historyOwner.current = address ? address.toLowerCase() : null;
  const setHistoryFor = (owner, update) => {
    if (!owner || historyOwner.current !== owner.toLowerCase()) return;
    setClaimedHistory(update);
  };

  // Live Timer Update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


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

      setClaimedHistory([]);
      try {
        const stored = localStorage.getItem(`vibe_claim_history_v2_${address.toLowerCase()}`);
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
                  const correctAmt = roundProofs('royalty', 5)?.claims?.[address.toLowerCase()]?.amount || 7207;
                  return { ...item, roundId: 5, title: 'Vibe Club Royalties · Royalty 5', amount: correctAmt };
                }
                if (item.id === 'vibeclub-4') {
                  const correctAmt = roundProofs('royalty', 4)?.claims?.[address.toLowerCase()]?.amount || 9909;
                  return { ...item, roundId: 4, title: 'Vibe Club Royalties · Royalty 4', amount: correctAmt };
                }
                if (item.id === 'vibeclub-3') {
                  const correctAmt = roundProofs('royalty', 3)?.claims?.[address.toLowerCase()]?.amount || 18018;
                  return { ...item, roundId: 3, title: 'Vibe Club Royalties · Royalty 3', amount: correctAmt };
                }
                if (item.id === 'vibeclub-2') {
                  const correctAmt = roundProofs('royalty', 2)?.claims?.[address.toLowerCase()]?.amount || 17117;
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
                  const correctAmt = roundProofs('royalty', 1)?.claims?.[address.toLowerCase()]?.amount || 22935;
                  const isAdminWallet = address.toLowerCase() === ADMIN_WALLET.toLowerCase();
                  const fallbackTx = isAdminWallet ? '0x0efb6d5e52fcca2e770f4c78db0c8b86f6c919ea53272813ec68816e5a5c0d84' : null;
                  const txHash = (item.txHash && !isBadTxHash(item.txHash)) ? item.txHash : fallbackTx;
                  return { ...item, roundId: 1, title: 'Vibe Club Royalties · Royalty 1', amount: correctAmt, txHash };
                }
                if (item.id === 'holder-2') {
                  const correctAmt = roundProofs('holder', 2)?.claims?.[address.toLowerCase()]?.amount || 500000;
                  return { ...item, roundId: 2, title: 'Holder Rewards · Unlock 2', amount: Math.round(Number(correctAmt)) };
                }
                if (item.id === 'holder-1') {
                  const correctAmt = roundProofs('holder', 1)?.claims?.[address.toLowerCase()]?.amount || 126127;
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
          setHistoryFor(address, prev => {
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
            localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(updated));
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

      // Every token id (they are spread over 1..333). Prefer the NFT this wallet minted while it still
      // holds it, otherwise its lowest id. The poll calls this every 12s, so rescan at most every 5 minutes.
      const key = userAddress.toLowerCase();
      if (cached && Date.now() - (nftScannedAt.get(key) || 0) < NFT_RESCAN_MS) return;
      const owned = await findOwnedVibeClubNfts(getPublicClient(), userAddress);
      if (owned === null) return; // chain not readable: keep the cached one
      nftScannedAt.set(key, Date.now());
      if (owned.length === 0) {
        setUserNft(null);
        localStorage.removeItem(`vibe_user_nft_${key}`);
        return;
      }
      const minted = await findMintedVibeClubNft(userAddress);
      const tokenId = owned.includes(minted) ? minted : owned[0];
      const nftObj = {
        id: tokenId,
        name: nftNames[String(tokenId)] || `Vibe Club #${tokenId}`,
        image: `/nft/images/${tokenId}.png`
      };
      setUserNft(nftObj);
      localStorage.setItem(`vibe_user_nft_${key}`, JSON.stringify(nftObj));
    } catch (err) {
      console.warn("Error finding user NFT:", err);
    }
  };

  // Lightweight sync of claimed transaction history for Holder Rewards
  const syncClaimHistory = async (client, userAddress, roundId = 1, txMap = {}) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem(`vibe_claim_history_v2_${userAddress.toLowerCase()}`) || '[]');
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

      setHistoryFor(userAddress, prev => {
        const prevList = Array.isArray(prev) ? prev : [];
        const updated = getSortedClaimedHistory([syncedItem, ...prevList.filter(h => h && h.id !== `holder-${roundId}`)]);
        localStorage.setItem(`vibe_claim_history_v2_${userAddress.toLowerCase()}`, JSON.stringify(updated));
        return updated;
      });
    } catch (claimErr) {
      console.warn('Sync claim history error:', claimErr);
    }
  };

  // Lightweight sync of claimed transaction history for Vibe Club Royalties
  const syncRoyaltyClaimHistory = async (client, userAddress, targetCa, roundId = 1, txMap = {}) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem(`vibe_claim_history_v2_${userAddress.toLowerCase()}`) || '[]');
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

      setHistoryFor(userAddress, prev => {
        const prevList = Array.isArray(prev) ? prev : [];
        const updated = getSortedClaimedHistory([syncedItem, ...prevList.filter(h => h && h.id !== `vibeclub-${roundId}`)]);
        localStorage.setItem(`vibe_claim_history_v2_${userAddress.toLowerCase()}`, JSON.stringify(updated));
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
        setHistoryFor(userAddress, prev => {
          const prevList = Array.isArray(prev) ? prev : [];
          const nonStaking = prevList.filter(h => h && !h.id?.startsWith('staking-'));
          // Explorer responses can be partial (rate limits / Cloudflare), so keep staking claims
          // found earlier and only add or refresh the ones returned now.
          const freshIds = new Set(stakingItems.map(i => i.id));
          const keptStaking = prevList.filter(h => h && h.id?.startsWith('staking-') && !freshIds.has(h.id));
          const updated = getSortedClaimedHistory([...stakingItems, ...keptStaking, ...nonStaking]);
          localStorage.setItem(`vibe_claim_history_v2_${lowerUser}`, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (claimErr) {
      console.warn('Sync staking claim history error:', claimErr);
    }
  };

  // Status from the background poll. Never overrides a claim in progress, and a round claimed in this
  // session stays claimed even if a poll that started before the claim answers late.
  const claimedThisSession = useRef(new Set());
  const setPolledStatus = (key, value) => setClaimStatus(prev => {
    if (prev[key] === 'claiming' || prev[key] === value) return prev;
    if (value === 'unclaimed' && claimedThisSession.current.has(key)) return prev;
    return { ...prev, [key]: value };
  });

  // Unified High-Speed Onchain RPC Sync (<350ms)
  const fetchBalances = async () => {
    if (!address) return;
    try {
      const client = getPublicClient();
      // Rounds after the bundled ones (Unlock 3+, Royalty 6+) whose snapshot has happened.
      const nowTime = new Date();
      const extraRounds = [
        ...HOLDER_ROUNDS.filter(r => r.id > 2 && nowTime >= new Date(r.snapshotIso)).map(r => ({ type: 'holder', id: r.id, ca: distributorFor('holder', r.id)?.address })),
        ...VIBECLUB_ROUNDS.filter(r => r.id > 5 && nowTime >= new Date(r.snapshotIso)).map(r => {
          const d = distributorFor('royalty', r.id);
          return { type: 'vibeclub', id: r.id, ca: d?.version === 1 ? ROYALTY_DISTRIBUTOR_CA : d?.address };
        }),
      ].filter(r => r.ca); // a round whose new contract is not configured yet is skipped

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
            address: ROYALTY_DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [1n, address]
          },
          {
            address: ROYALTY_DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [2n, address]
          },
          {
            address: ROYALTY_DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [3n, address]
          },
          {
            address: ROYALTY_DISTRIBUTOR_CA,
            abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
            functionName: 'hasClaimed',
            args: [4n, address]
          },
          {
            address: ROYALTY_DISTRIBUTOR_CA,
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
      for (const [k, v] of Object.entries(earlyStatus)) setPolledStatus(k, v);

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
          setPolledStatus('holder-1', 'claimed');
          syncClaimHistory(client, address, 1, txMap);
        } else {
          setPolledStatus('holder-1', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'holder-1');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Holder Round 2
      if (results[4]?.status === 'success') {
        if (results[4].result === true) {
          setPolledStatus('holder-2', 'claimed');
          syncClaimHistory(client, address, 2, txMap);
        } else {
          setPolledStatus('holder-2', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'holder-2');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 1
      if (results[5]?.status === 'success') {
        if (results[5].result === true) {
          setPolledStatus('vibeclub-1', 'claimed');
          syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, 1, txMap);
        } else {
          setPolledStatus('vibeclub-1', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-1');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 2
      if (results[6]?.status === 'success') {
        if (results[6].result === true) {
          setPolledStatus('vibeclub-2', 'claimed');
          syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, 2, txMap);
        } else {
          setPolledStatus('vibeclub-2', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-2');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 3
      if (results[7]?.status === 'success') {
        if (results[7].result === true) {
          setPolledStatus('vibeclub-3', 'claimed');
          syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, 3, txMap);
        } else {
          setPolledStatus('vibeclub-3', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-3');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 4
      if (results[8]?.status === 'success') {
        if (results[8].result === true) {
          setPolledStatus('vibeclub-4', 'claimed');
          syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, 4, txMap);
        } else {
          setPolledStatus('vibeclub-4', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-4');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      }

      // Royalty Round 5
      if (results[9]?.status === 'success') {
        if (results[9].result === true) {
          setPolledStatus('vibeclub-5', 'claimed');
          syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, 5, txMap);
        } else {
          setPolledStatus('vibeclub-5', 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== 'vibeclub-5');
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
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
          setPolledStatus(key, 'claimed');
          if (r.type === 'holder') syncClaimHistory(client, address, r.id, txMap);
          else syncRoyaltyClaimHistory(client, address, ROYALTY_DISTRIBUTOR_CA, r.id, txMap);
        } else {
          setPolledStatus(key, 'unclaimed');
          setHistoryFor(address, prev => {
            const prevList = Array.isArray(prev) ? prev : [];
            const filtered = prevList.filter(h => h && h.id !== key);
            if (filtered.length !== prevList.length) {
              localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(filtered));
            }
            return filtered;
          });
        }
      });

      // Sync Staking Claims
      syncStakingClaimHistory(client, address, txMap);
    } catch (e) {
      console.warn("Background balance fetch error:", e);
    }
  };


  // Check Claim Status for Round 1 Holder
  const isHolderRound1Claimed = (Array.isArray(claimedHistory) && claimedHistory.some(c => c && c.id === 'holder-1')) || claimStatus['holder-1'] === 'claimed';
  const isHolderRound1Ended = currentTime >= new Date(HOLDER_ROUNDS[0].nextSnapshotDate || '2026-09-25T00:00:00Z');
  const isHolderRound1Live = currentTime >= new Date(HOLDER_ROUNDS[0].targetDate) && !isHolderRound1Ended;
  const isHolderRound1Available = isHolderRound1Live && !isHolderRound1Claimed;

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

  // Check Claim Status for Royalty 3 Vibe Club

  // Check Claim Status for Royalty 4 Vibe Club

  // Active Royalty Round & Proof Data
  const activeRoyaltyRound = latestStartedRound(VIBECLUB_ROUNDS);
  const activeRoyaltyEpochId = activeRoyaltyRound.id;
  const activeRoyaltyData = roundProofs('royalty', activeRoyaltyEpochId);
  const userRoyaltyProofData = (address && activeRoyaltyData && activeRoyaltyData.claims) ? activeRoyaltyData.claims[address.toLowerCase()] : null;
  const hasConfirmedRoyaltyClaim = !!userRoyaltyProofData;
  const vibeClubRewardAmount = userRoyaltyProofData ? (userRoyaltyProofData.amount || 0) : 0;

  const activeRoyaltyClaimed = isRoundClaimed('vibeclub', activeRoyaltyEpochId);
  const activeRoyaltyLive = isRoundLive(activeRoyaltyRound);
  const activeRoyaltyAvailable = activeRoyaltyLive && !activeRoyaltyClaimed && claimStatus[roundClaimKey('vibeclub', activeRoyaltyEpochId)] !== undefined;

  // Check if connected wallet is Admin / Contract Owner

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

  // Auto-sync on mount and poll in background every 12 seconds
  useEffect(() => {
    if (authenticated && address) {
      fetchBalances();
      const interval = setInterval(() => {
        fetchBalances();
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [authenticated, address]);





  // Sends the claim. Returns the tx hash when the wallet reports one, null when it does not say.
  // A rejection in the wallet throws, and only an unsupported wallet_sendCalls falls back to eth_sendTransaction,
  // so a rejected claim never asks a second time.
  const sendClaimTx = async (provider, to, calldata) => {
    let callsRes;
    try {
      callsRes = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: '0x2105',
          from: address,
          calls: [{ to, value: '0x0', data: calldata }],
          capabilities: {
            dataSuffix: {
              value: DATA_SUFFIX,
              optional: true
            }
          }
        }]
      });
    } catch (e) {
      if (isWalletRejection(e)) throw e;
      return provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to, data: calldata, value: '0x0' }]
      });
    }
    const callId = typeof callsRes === 'object' ? (callsRes.id || callsRes) : callsRes;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      let status;
      try {
        status = await provider.request({ method: 'wallet_getCallsStatus', params: [callId] });
      } catch (e) {
        continue;
      }
      const receipt = status?.receipts?.[0];
      if (receipt?.transactionHash) {
        if (receipt.status === '0x0' || receipt.status === 0) throw new Error('Claim transaction reverted');
        return receipt.transactionHash;
      }
      // EIP-5792: 400+ means the batch was rejected or failed
      if (typeof status?.status === 'number' && status.status >= 400) throw new Error('Claim was rejected or failed');
    }
    return null;
  };

  // The contract decides whether a claim happened: hasClaimed() must turn true.
  const confirmClaimOnchain = async (distributor, roundId, txHash) => {
    const client = getPublicClient();
    if (txHash) {
      try {
        const receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });
        if (receipt.status !== 'success') return false;
      } catch (e) {}
    }
    for (let i = 0; i < (txHash ? 10 : 20); i++) {
      try {
        const done = await client.readContract({ address: distributor, abi: DISTRIBUTOR_ABI, functionName: 'hasClaimed', args: [BigInt(roundId), address] });
        if (done) return true;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 3000));
    }
    return false;
  };

  // Resolves to true only once the contract confirmed the claim; a rejected or failed claim resolves to false.
  const handleClaim = async (type, roundId, amountNum) => {
    const claimKey = `${type}-${roundId}`;

    // Read-only demo: show the exact claim that would be sent, and send nothing.
    if (isDemoActive()) {
      const isHolder = type === 'holder';
      const proof = roundProofs(isHolder ? 'holder' : 'royalty', roundId)?.claims?.[address?.toLowerCase()] || (isHolder ? userProofData : userRoyaltyProofData);
      const roundContract = distributorFor(isHolder ? 'holder' : 'royalty', roundId);
      const distributor = roundContract ? (roundContract.version === 1 && !isHolder ? ROYALTY_DISTRIBUTOR_CA : roundContract.address) : '';
      showDemoTxPreview({
        action: isHolder ? `Claim holder rewards · Unlock ${roundId}` : `Claim Vibe Club royalties · Round ${roundId}`,
        amount: `${Number(proof?.amount ?? amountNum ?? 0).toLocaleString('en-US')} $VIBE`,
        contract: distributor,
        contractLabel: 'Reward distributor',
        method: 'claim(roundId, amount, proof)',
        note: proof ? `The Merkle proof for this address has ${proof.proof?.length || 0} hashes.` : 'This address has no proof for this round.',
      });
      return 'demo';
    }

    setClaimStatus(prev => ({ ...prev, [claimKey]: 'claiming' }));

    try {
      const isHolder = type === 'holder';
      const proof = roundProofs(isHolder ? 'holder' : 'royalty', roundId)?.claims?.[address?.toLowerCase()] || (isHolder ? userProofData : userRoyaltyProofData);
      if (!proof || !wallets || wallets.length === 0) throw new Error('No allocation or wallet for this claim');
      const roundContract = distributorFor(isHolder ? 'holder' : 'royalty', roundId);
      if (!roundContract) throw new Error('This round is not available yet');
      const distributor = roundContract.version === 1 && !isHolder ? ROYALTY_DISTRIBUTOR_CA : roundContract.address;

      const activeWallet = wallets.find(w => w.address.toLowerCase() === address?.toLowerCase()) || wallets[0];
      const provider = guardProvider(await activeWallet.getEthereumProvider());
      const amountWei = parseUnits(proof.amount.toString(), 18);
      const calldataRaw = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'claim',
        args: [BigInt(roundId), amountWei, proof.proof]
      });
      // Append Official ERC-8021 Data Suffix for Base Builder Code
      const calldata = appendBuilderSuffix(calldataRaw);

      let txHashResult = await sendClaimTx(provider, distributor, calldata);
      if (typeof txHashResult !== 'string' || txHashResult.length !== 66) txHashResult = null;

      if (!(await confirmClaimOnchain(distributor, roundId, txHashResult))) {
        throw new Error('Claim was not confirmed onchain');
      }

      // Smart wallets do not always report the hash: take the transfer of exactly this allocation.
      if (!txHashResult) {
        try {
          const client = getPublicClient();
          const currentBlock = await client.getBlockNumber();
          const logs = await client.getLogs({
            address: CA,
            event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
            args: { from: distributor, to: address },
            fromBlock: currentBlock > 2000n ? currentBlock - 2000n : 0n,
            toBlock: currentBlock
          });
          txHashResult = logs.filter(l => l.args.value === amountWei).pop()?.transactionHash || null;
        } catch (e) {}
      }

      // Add to claimed history
      const newClaimItem = {
        id: claimKey,
        type,
        roundId,
        title: isHolder ? `Holder Rewards · Unlock ${roundId}` : `Vibe Club · Royalty ${roundId}`,
        amount: amountNum,
        txHash: txHashResult,
        timestamp: new Date().toISOString()
      };

      const prevHistory = Array.isArray(claimedHistory) ? claimedHistory : [];
      const updatedHistory = getSortedClaimedHistory([newClaimItem, ...prevHistory.filter(c => c && c.id !== claimKey)]);
      setClaimedHistory(updatedHistory);
      if (address) {
        localStorage.setItem(`vibe_claim_history_v2_${address.toLowerCase()}`, JSON.stringify(updatedHistory));
      }

      claimedThisSession.current.add(claimKey);
      invalidateClaimTransactions(address);
      setClaimStatus(prev => ({ ...prev, [claimKey]: 'claimed' }));
      return true;
    } catch (err) {
      console.error('Claim transaction error:', err);
      setClaimStatus(prev => ({ ...prev, [claimKey]: 'idle' }));
      return false;
    }
  };


  return (
    <section id={isProfileMode ? "profile-section" : "claim-portal"} style={{ padding: '24px 0 60px 0', background: 'transparent' }}>
      <div className="wrap" style={{ maxWidth: '1000px', padding: '0 14px' }}>
        {isProfileMode ? (
          <BaseAppProfileView
            address={address}
            login={login}
            balance={balance}
            nftCount={nftCount}
            userNft={userNft}
            claimedHistory={claimedHistory}
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
            nftCount={nftCount}
            currentTime={currentTime}
            claimStatus={claimStatus}
            claimedHistory={claimedHistory}
            handleClaim={handleClaim}
            isHolderEligibleLive={isHolderEligibleLive}
            holderRewardAmount={holderRewardAmount}
            hasConfirmedHolderClaim={hasConfirmedHolderClaim}
            isHolderRound1Available={isHolderRound1Available}
            activeHolderEpochId={activeHolderEpochId}
            activeHolderRound={activeHolderRound}
            activeHolderAvailable={activeHolderAvailable}
            vibeClubRewardAmount={vibeClubRewardAmount}
            hasConfirmedRoyaltyClaim={hasConfirmedRoyaltyClaim}
            isVibeClubRoyalty1Available={isVibeClubRoyalty1Available}
            activeRoyaltyEpochId={activeRoyaltyEpochId}
            activeRoyaltyRound={activeRoyaltyRound}
            activeRoyaltyAvailable={activeRoyaltyAvailable}
            totalAvailableCount={totalAvailableCount}
            upcomingHolderRound={upcomingHolderRound}
            upcomingVibeClubRound={upcomingVibeClubRound}
          />
        )}
      </div>
    </section>
  );
}
