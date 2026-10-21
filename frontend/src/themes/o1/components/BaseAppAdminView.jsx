import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';
import { parseEther, parseUnits, formatUnits, encodeFunctionData, parseAbi } from 'viem';
import { Coins, Crown, Sparkles, ShieldAlert, ExternalLink, Wallet, CalendarClock, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { publicClient } from '../../../config/rpc';
import { DATA_SUFFIX, appendBuilderSuffix } from '../../../config/builderCode';
import { useVibeNftContract } from '../../../hooks/useVibeNftContract';
import round1Data from '../../../data/round_1_proofs.json';
import round2Data from '../../../data/round_2_proofs.json';
import royalty1Data from '../../../data/royalty_1_proofs.json';
import royalty2Data from '../../../data/royalty_2_proofs.json';
import royalty3Data from '../../../data/royalty_3_proofs.json';
import royalty4Data from '../../../data/royalty_4_proofs.json';
import royalty5Data from '../../../data/royalty_5_proofs.json';
import { Card, Tile, Button, Alert } from './ui';
import { AdminScheduleEditor } from './AdminScheduleEditor';
import { AdminSnapshotTool } from './AdminSnapshotTool';
import { HOLDER_ROUNDS, VIBECLUB_ROUNDS, SCHEDULE } from '../../../data/rewardsSchedule';
import { VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS } from '../../../config/achievements';
import { roundProofs } from '../../../data/claimRounds';
import { distributorFor, rootCall, rootFromResult, withdrawCalldata, V2_ABI } from '../../../config/distributors';

// The round the Rewards Hub shows as current: the latest one whose snapshot has passed.
const currentRoundId = (rounds) => String(([...rounds].reverse().find((r) => Date.now() >= new Date(r.snapshotIso).getTime()) || rounds[0])?.id || 1);

export const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';
export const VIBE_TOKEN_CA = '0xb200000000000000000000df24ecb8bf51100a01';
export const DISTRIBUTOR_CA = '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089';
export const ROYALTY_DISTRIBUTOR_CA = '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1';
export const NFT_CONTRACT_ADDRESS = '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886';
export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
export const COMMUNITY_WALLET = '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf';

const DISTRIBUTOR_ABI = parseAbi([
  'function setMerkleRoot(uint256 epochId, bytes32 _merkleRoot) external',
  'function emergencyWithdraw(address token, uint256 amount) external',
  'function merkleRoots(uint256 epochId) view returns (bytes32)',
  'function hasClaimed(uint256 epochId, address user) view returns (bool)'
]);

const NFT_ABI = parseAbi([
  'function setAggregatorRouter(address _newAggregator) external',
  'function setOverridePrices(uint256 _ethPrice, uint256 _vibePrice) external'
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
]);

// Proofs bundled with the site, by epoch. Pools are the amounts each round distributed.
const BUILT_IN_HOLDER_ROUNDS = {
  1: { claims: round1Data?.claims, merkleRoot: round1Data?.merkleRoot, pool: 10000000 },
  2: { claims: round2Data?.claims, merkleRoot: round2Data?.merkleRoot, pool: 10000000 },
};
const BUILT_IN_ROYALTY_ROUNDS = {
  1: { claims: royalty1Data?.claims, merkleRoot: royalty1Data?.merkleRoot, pool: 2500000 },
  2: { claims: royalty2Data?.claims, merkleRoot: royalty2Data?.merkleRoot, pool: 1900000 },
  3: { claims: royalty3Data?.claims, merkleRoot: royalty3Data?.merkleRoot, pool: 2000000 },
  4: { claims: royalty4Data?.claims, merkleRoot: royalty4Data?.merkleRoot, pool: 1100000 },
  5: { claims: royalty5Data?.claims, merkleRoot: royalty5Data?.merkleRoot, pool: royalty5Data?.poolAmount || 800000 },
};

// One line under the distributor metrics: where the round's data comes from and whether the contract has its root.
// A root no proof can match. Setting it closes a round on the old royalty distributor, which has no claim deadline
// (it rejects an empty root, so a 'one' root is used instead).
const CLOSED_ROOT = `0x${'0'.repeat(63)}1`;

function RoundStatus({ metrics, label }) {
  if (metrics.loading || !metrics.rootStatus) return null;
  const funded = metrics.contractBalance >= metrics.unclaimedTokens;
  const text = {
    'no-snapshot': `${label}: no published snapshot. Run and publish it in the Snapshots tab.`,
    'not-set': `${label}: snapshot ready (${metrics.totalPool.toLocaleString()} $VIBE pool), Merkle root not set on the contract yet.`,
    match: `${label}: Merkle root on the contract matches the snapshot (${metrics.totalPool.toLocaleString()} $VIBE pool).${funded ? '' : ' The contract balance does not cover the unclaimed amount yet.'}`,
    closed: `${label}: closed. The claim window has ended and the contract no longer accepts claims for this round.`,
    'no-v2': `${label}: this round lives on the new rewards contract, which is not configured on the site yet (VITE_${label.startsWith('Unlock') ? 'HOLDER' : 'ROYALTY'}_DISTRIBUTOR_V2).`,
    mismatch: `${label}: the Merkle root on the contract differs from the published snapshot. Claims will fail until they match.`,
  }[metrics.rootStatus];
  const tone = metrics.rootStatus === 'closed' ? 'info' : metrics.rootStatus === 'match' && funded ? 'success' : metrics.rootStatus === 'mismatch' ? 'danger' : 'warn';
  const fmt = (s) => new Date(s * 1000).toUTCString().replace(':00 GMT', ' UTC');
  const windowText = metrics.version === 2 && metrics.claimStart
    ? ` New contract, claim window ${fmt(metrics.claimStart)} → ${fmt(metrics.claimEnd)}.`
    : '';
  return (
    <Alert tone={tone} icon={tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}>
      {text}{windowText}
    </Alert>
  );
}

// Staking vaults the achievements contract counts (participation and stake). Every new staking epoch's vault
// has to be added once, otherwise deposits into it do not count for the staking achievements.
const ACHIEVEMENT_VAULTS_ABI = parseAbi([
  'function isVault(bytes32) view returns (bool)',
  'function addVault(bytes32 vaultId)'
]);

function AchievementVaultsCard({ sendAdminTx }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const epochs = SCHEDULE.staking.filter((e) => /^0x[0-9a-fA-F]{64}$/.test(e.vaultId || ''));
    const results = await publicClient.multicall({
      contracts: epochs.map((e) => ({ address: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS, abi: ACHIEVEMENT_VAULTS_ABI, functionName: 'isVault', args: [e.vaultId] })),
      allowFailure: true
    });
    setRows(epochs.map((e, i) => ({ epoch: e.epoch, vaultId: e.vaultId, counted: results[i]?.status === 'success' ? results[i].result : null })));
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (row) => {
    setBusy(row.vaultId);
    setMessage('');
    try {
      await sendAdminTx(VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS, encodeFunctionData({ abi: ACHIEVEMENT_VAULTS_ABI, functionName: 'addVault', args: [row.vaultId] }));
      setMessage(`Epoch ${row.epoch} vault added to the achievements contract`);
      setTimeout(load, 3000);
    } catch (e) {
      setMessage(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setBusy('');
    }
  };

  const missing = rows.filter((r) => r.counted === false);
  const withoutVault = SCHEDULE.staking.filter((e) => !e.vaultId && new Date(e.start) <= new Date());
  return (
    <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Staking vaults in achievements</span>
      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
        Staking achievements only count the vaults registered in the achievements contract. Add each new epoch's vault once (vault ID from the schedule above).
      </span>
      {withoutVault.length > 0 && (
        <Alert tone="warn" icon={<AlertCircle size={16} />}>
          {withoutVault.map((e) => `Epoch ${e.epoch}`).join(', ')} started but has no vault ID in the schedule yet. Add the o1 vault ID in the schedule first.
        </Alert>
      )}
      {rows.map((r) => (
        <div key={r.vaultId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-2)' }}>
            Epoch {r.epoch} · <span style={{ fontFamily: 'var(--mono)' }}>{r.vaultId.slice(0, 10)}…{r.vaultId.slice(-6)}</span>
          </span>
          {r.counted ? (
            <span style={{ color: 'var(--green)' }}>Counted</span>
          ) : r.counted === false ? (
            <Button variant="primary" size="sm" disabled={Boolean(busy)} onClick={() => add(r)}>
              {busy === r.vaultId ? 'Adding…' : 'Add to achievements'}
            </Button>
          ) : (
            <span style={{ color: 'var(--text-3)' }}>…</span>
          )}
        </div>
      ))}
      {missing.length === 0 && rows.length > 0 && <span style={{ fontSize: '12px', color: 'var(--green)' }}>All scheduled vaults are counted.</span>}
      {message && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{message}</span>}
    </Card>
  );
}

// Snapshots published from Admin → Snapshots, fetched once per round and kept for the session.
const publishedSnapshots = {};
async function loadPublishedSnapshot(type, epoch) {
  const k = `${type}:${epoch}`;
  if (!(k in publishedSnapshots)) {
    publishedSnapshots[k] = fetch(`/api/snapshots?type=${type}&round=${epoch}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  const snap = await publishedSnapshots[k];
  if (!snap) delete publishedSnapshots[k]; // try again next refresh (it may be published later)
  return snap;
}

export function BaseAppAdminView() {
  const { authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress } = useAccount();
  const { disconnect } = useDisconnect();

  const activeAddress = user?.wallet?.address || wallets?.[0]?.address || wagmiAddress;
  const isAdmin = !!(activeAddress && activeAddress.toLowerCase() === ADMIN_WALLET.toLowerCase());

  // Active module tab: 'holder' | 'royalty' | 'nft'
  const [activeTab, setActiveTab] = useState('holder');

  // Status & feedback state
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Holder & Royalties states
  const [holderEpochId, setHolderEpochId] = useState(() => currentRoundId(HOLDER_ROUNDS));
  const [holderMerkleRoot, setHolderMerkleRoot] = useState(() => roundProofs('holder', currentRoundId(HOLDER_ROUNDS))?.merkleRoot || '');
  const [holderWithdrawAmount, setHolderWithdrawAmount] = useState('');
  const [holderBurnAmount, setHolderBurnAmount] = useState('');
  const [holderCommunityAmount, setHolderCommunityAmount] = useState('');

  const [royaltyEpochId, setRoyaltyEpochId] = useState(() => currentRoundId(VIBECLUB_ROUNDS));
  const [royaltyMerkleRoot, setRoyaltyMerkleRoot] = useState(() => roundProofs('royalty', currentRoundId(VIBECLUB_ROUNDS))?.merkleRoot || '');
  const [royaltyWithdrawAmount, setRoyaltyWithdrawAmount] = useState('');
  const [royaltyBurnAmount, setRoyaltyBurnAmount] = useState('');
  const [royaltyCommunityAmount, setRoyaltyCommunityAmount] = useState('');

  const [nftCommunityAmount, setNftCommunityAmount] = useState('');

  // Live Metrics
  const [holderMetrics, setHolderMetrics] = useState({
    contractBalance: 0,
    claimedTokens: 0,
    claimedWalletsCount: 0,
    totalWalletsCount: 0,
    unclaimedTokens: 0,
    loading: false
  });

  const [royaltyMetrics, setRoyaltyMetrics] = useState({
    contractBalance: 0,
    claimedTokens: 0,
    claimedWalletsCount: 0,
    totalWalletsCount: 0,
    unclaimedTokens: 0,
    loading: false
  });

  // 2. NFT Contract hook
  const {
    contractEthBalance,
    contractVibeBalance,
    ethPriceFormatted,
    vibePriceFormatted,
    aggregatorRouterAddress,
    isAdminSwapping,
    adminSwapSuccess,
    adminTxHash,
    isSettingRouter,
    setRouterSuccess,
    isWithdrawingEth,
    withdrawSuccess,
    isWithdrawingVibe,
    withdrawVibeSuccess,
    isAdminPaidMinting,
    adminPaidMintSuccess,
    adminPaidMintedTokenId,
    adminPaidRecipient,
    errorMessage: nftErrorMessage,
    executeAdminSwapAndBurn,
    executeSetAggregatorRouter,
    executeWithdrawEth,
    executeWithdrawVibe,
    executeAdminPaidMintWithEth,
    executeAdminPaidMintWithVibe,
    refetch: refetchNftState
  } = useVibeNftContract();

  const [adminEthInput, setAdminEthInput] = useState('0.005');
  const [adminGiveawayRecipient, setAdminGiveawayRecipient] = useState('');
  const [customRouterInput, setCustomRouterInput] = useState('');
  const [isCustomRouterSaving, setIsCustomRouterSaving] = useState(false);
  const [customRouterSuccess, setCustomRouterSuccess] = useState(false);
  const [overridePriceInput, setOverridePriceInput] = useState('0.005');
  const [isOverridePriceSaving, setIsOverridePriceSaving] = useState(false);
  const [overridePriceSuccess, setOverridePriceSuccess] = useState(false);

  // Live VIBE ratio
  const [vibePerEthRatio, setVibePerEthRatio] = useState(50000000);

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

  const ethPriceNum = parseFloat(ethPriceFormatted) || 0.005;
  const currentDynamicVibeAmount = Math.floor(ethPriceNum * vibePerEthRatio);

  const sendAdminTx = async (to, data, value = '0x0') => {
    const activeWallet = wallets.find(w => w.address.toLowerCase() === activeAddress?.toLowerCase()) || wallets[0];
    if (!activeWallet) throw new Error('No active wallet found. Please connect your admin wallet.');

    const provider = await activeWallet.getEthereumProvider();
    const calldata = appendBuilderSuffix(data);

    try {
      const callsRes = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: '0x2105',
          from: activeAddress,
          calls: [{ to, value, data: calldata }],
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
        params: [{ from: activeAddress, to, data: calldata, value }]
      });
    }
  };

  const fetchDistributorMetrics = useCallback(async (type, overrideEpoch) => {
    const isHolder = type === 'holder';
    const epoch = overrideEpoch || (isHolder ? holderEpochId : royaltyEpochId) || '1';
    const distributor = distributorFor(type, epoch);

    if (!distributor) {
      // the round belongs to the v2 contract, whose address is not configured yet
      const metrics = { contractBalance: 0, claimedTokens: 0, claimedWalletsCount: 0, totalWalletsCount: 0, unclaimedTokens: 0, totalPool: 0, rootStatus: 'no-v2', version: 2, loading: false };
      if (isHolder) setHolderMetrics(metrics);
      else setRoyaltyMetrics(metrics);
      return;
    }
    const contractAddress = distributor.address;

    if (isHolder) setHolderMetrics(prev => ({ ...prev, loading: true }));
    else setRoyaltyMetrics(prev => ({ ...prev, loading: true }));

    try {
      // Rounds shipped with the site use their bundled proofs; newer ones use the snapshot published from Admin → Snapshots.
      const builtIn = isHolder ? BUILT_IN_HOLDER_ROUNDS[epoch] : BUILT_IN_ROYALTY_ROUNDS[epoch];
      const published = builtIn ? null : await loadPublishedSnapshot(type, epoch);
      const source = builtIn || published;
      const claims = Object.values(source?.claims || {});
      const snapshotRoot = source?.merkleRoot || null;

      const calls = [
        {
          address: VIBE_TOKEN_CA,
          abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
          functionName: 'balanceOf',
          args: [contractAddress]
        },
        rootCall(type, epoch),
        ...claims.map(c => ({
          address: contractAddress,
          abi: parseAbi(['function hasClaimed(uint256, address) view returns (bool)']),
          functionName: 'hasClaimed',
          args: [BigInt(epoch), c.address]
        }))
      ];

      const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

      const balWei = (results[0]?.status === 'success' && results[0].result !== undefined) ? results[0].result : 0n;
      const contractBalance = Math.round(Number(formatUnits(balWei, 18)));

      const onchainRoot = results[1]?.status === 'success' ? rootFromResult(distributor.version, results[1].result) : null;
      const onchainRound = distributor.version === 2 && results[1]?.status === 'success' ? results[1].result : null;

      let claimedWalletsCount = 0;
      let claimedTokens = 0;

      for (let i = 0; i < claims.length; i++) {
        if (results[i + 2]?.status === 'success' && results[i + 2]?.result === true) {
          claimedWalletsCount++;
          claimedTokens += (claims[i].amount || 0);
        }
      }

      const totalWalletsCount = claims.length;
      const totalPool = source?.pool || 0;
      const unclaimedTokens = Math.max(0, totalPool - claimedTokens);
      const ZERO_ROOT = `0x${'0'.repeat(64)}`;
      const rootStatus = onchainRoot?.toLowerCase() === CLOSED_ROOT
        ? 'closed'
        : !source
        ? 'no-snapshot'
        : !onchainRoot || onchainRoot === ZERO_ROOT
          ? 'not-set'
          : onchainRoot.toLowerCase() === snapshotRoot?.toLowerCase() ? 'match' : 'mismatch';

      const metrics = {
        contractBalance,
        claimedTokens,
        claimedWalletsCount,
        totalWalletsCount,
        unclaimedTokens,
        totalPool,
        rootStatus,
        version: distributor.version,
        contractAddress,
        // v2 only: the window and state stored with the round
        claimStart: onchainRound?.merkleRoot && onchainRound.merkleRoot !== ZERO_ROOT ? Number(onchainRound.claimStart) : null,
        claimEnd: onchainRound?.merkleRoot && onchainRound.merkleRoot !== ZERO_ROOT ? Number(onchainRound.claimEnd) : null,
        expiredWithdrawn: Boolean(onchainRound?.expiredWithdrawn),
        snapshotPoolWei: (source?.claims ? Object.values(source.claims).reduce((s, c) => s + BigInt(c.amountWei || 0), 0n) : 0n),
        snapshotRoot,
        loading: false
      };

      if (isHolder) setHolderMetrics(metrics);
      else setRoyaltyMetrics(metrics);

    } catch (e) {
      console.warn('Failed to fetch distributor metrics:', e);
      if (isHolder) setHolderMetrics(prev => ({ ...prev, loading: false }));
      else setRoyaltyMetrics(prev => ({ ...prev, loading: false }));
    }
  }, [holderEpochId, royaltyEpochId]);

  useEffect(() => {
    if (isAdmin) {
      fetchDistributorMetrics('holder', holderEpochId);
      fetchDistributorMetrics('royalty', royaltyEpochId);
      const interval = setInterval(() => {
        fetchDistributorMetrics('holder', holderEpochId);
        fetchDistributorMetrics('royalty', royaltyEpochId);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, holderEpochId, royaltyEpochId, fetchDistributorMetrics]);

  const handleSetMerkleRoot = async (type) => {
    const isHolder = type === 'holder';
    const epoch = isHolder ? holderEpochId : royaltyEpochId;
    const root = isHolder ? holderMerkleRoot : royaltyMerkleRoot;
    const metrics = isHolder ? holderMetrics : royaltyMetrics;
    const distributor = distributorFor(type, epoch);

    if (!root || !root.startsWith('0x') || root.length !== 66) {
      setErrorMessage('Invalid Merkle Root bytes32 format (must be 66 hex characters)');
      return;
    }
    if (!distributor) {
      setErrorMessage(`${isHolder ? 'Unlock' : 'Royalty'} #${epoch} uses the new rewards contract, which is not configured on the site yet`);
      return;
    }

    // v2: the round is opened with its pool and claim window from the schedule (claim time → next snapshot)
    let dataHex;
    let summary = '';
    if (distributor.version === 2) {
      const round = (isHolder ? HOLDER_ROUNDS : VIBECLUB_ROUNDS).find((r) => String(r.id) === String(epoch));
      if (!round) {
        setErrorMessage(`${isHolder ? 'Unlock' : 'Royalty'} #${epoch} is not in the schedule`);
        return;
      }
      if (!metrics.snapshotRoot || root.toLowerCase() !== metrics.snapshotRoot.toLowerCase()) {
        setErrorMessage('For the new contract the root must be the one of the published snapshot (its pool is taken from that snapshot)');
        return;
      }
      const claimStart = BigInt(Math.floor(new Date(round.targetDate).getTime() / 1000));
      const claimEnd = BigInt(Math.floor(new Date(round.nextSnapshotDate).getTime() / 1000));
      const pool = metrics.snapshotPoolWei;
      const isOpened = metrics.rootStatus !== 'not-set';
      summary = `${isOpened ? 'Update' : 'Open'} ${isHolder ? 'Unlock' : 'Royalty'} #${epoch} on the new contract:\n` +
        `pool ${formatUnits(pool, 18)} $VIBE\nclaim ${new Date(round.targetDate).toUTCString()}\nuntil ${new Date(round.nextSnapshotDate).toUTCString()}`;
      if (!window.confirm(summary)) return;
      dataHex = encodeFunctionData({
        abi: V2_ABI,
        functionName: isOpened ? 'updateRound' : 'openRound',
        args: [BigInt(epoch), root, pool, claimStart, claimEnd]
      });
    } else {
      dataHex = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'setMerkleRoot',
        args: [BigInt(epoch), root]
      });
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const hash = await sendAdminTx(distributor.address, dataHex);
      setTxHash(hash);
      setSuccessMessage(`Merkle root for ${isHolder ? 'Holder round' : 'Royalty epoch'} #${epoch} published successfully`);
      setTimeout(() => fetchDistributorMetrics(type, epoch), 3000);
    } catch (e) {
      console.error('Set Merkle Root error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // New contract: after a round's window, its unclaimed rest goes to the admin wallet (burn or pool by hand).
  const handleWithdrawExpired = async (type) => {
    const isHolder = type === 'holder';
    const epoch = isHolder ? holderEpochId : royaltyEpochId;
    const distributor = distributorFor(type, epoch);
    if (!distributor || distributor.version !== 2) return;
    if (!window.confirm(`Withdraw the unclaimed rest of ${isHolder ? 'Unlock' : 'Royalty'} #${epoch} to ${activeAddress}?`)) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');
    try {
      const dataHex = encodeFunctionData({ abi: V2_ABI, functionName: 'withdrawExpired', args: [BigInt(epoch), activeAddress] });
      const hash = await sendAdminTx(distributor.address, dataHex);
      setTxHash(hash);
      setSuccessMessage(`Unclaimed rest of ${isHolder ? 'Unlock' : 'Royalty'} #${epoch} withdrawn to the admin wallet`);
      setTimeout(() => fetchDistributorMetrics(type, epoch), 3000);
    } catch (e) {
      console.error('Withdraw expired error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const expiredAction = (type, metrics, epoch) => {
    if (metrics.version !== 2 || !metrics.claimEnd || metrics.expiredWithdrawn || Date.now() / 1000 < metrics.claimEnd) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          The claim window of #{epoch} has ended. Its unclaimed rest can be withdrawn to the admin wallet.
        </span>
        <Button variant="secondary" size="md" onClick={() => handleWithdrawExpired(type)} disabled={loading}>
          Withdraw unclaimed #{epoch}
        </Button>
      </div>
    );
  };

  // Old royalty distributor only: once a round's claim window is over, stop direct contract claims for it.
  const handleCloseRoyaltyRound = async () => {
    const epoch = royaltyEpochId;
    if (distributorFor('royalty', epoch)?.version !== 1) return; // the new contract closes rounds by itself
    const round = VIBECLUB_ROUNDS.find((r) => String(r.id) === String(epoch));
    if (!round || Date.now() < new Date(round.nextSnapshotDate).getTime()) {
      setErrorMessage(`Royalty #${epoch} is still in its claim window, it can be closed after ${round ? new Date(round.nextSnapshotDate).toUTCString() : 'the window ends'}`);
      return;
    }
    if (!window.confirm(`Close Royalty #${epoch}? Nobody will be able to claim it anymore, also not through the contract.`)) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');
    try {
      const dataHex = encodeFunctionData({ abi: DISTRIBUTOR_ABI, functionName: 'setMerkleRoot', args: [BigInt(epoch), CLOSED_ROOT] });
      const hash = await sendAdminTx(ROYALTY_DISTRIBUTOR_CA, dataHex);
      setTxHash(hash);
      setSuccessMessage(`Royalty #${epoch} closed`);
      setTimeout(() => fetchDistributorMetrics('royalty', epoch), 3000);
    } catch (e) {
      console.error('Close round error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawDistributorTokens = async (type) => {
    const isHolder = type === 'holder';
    const distributor = distributorFor(type, isHolder ? holderEpochId : royaltyEpochId);
    if (!distributor) return setErrorMessage('The new rewards contract is not configured on the site yet');
    const amountStr = isHolder ? holderWithdrawAmount : royaltyWithdrawAmount;
    const metrics = isHolder ? holderMetrics : royaltyMetrics;

    const amountNum = parseFloat(amountStr) || metrics.contractBalance;
    if (!amountNum || amountNum <= 0) {
      setErrorMessage('Please specify an amount to withdraw');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const amountWei = parseUnits(amountNum.toString(), 18);
      const dataHex = withdrawCalldata(distributor.version, amountWei, activeAddress);

      const hash = await sendAdminTx(distributor.address, dataHex);
      setTxHash(hash);
      setSuccessMessage(`Withdrawn ${amountNum.toLocaleString()} $VIBE from ${isHolder ? 'Holders' : 'Royalties'} contract to admin wallet`);
      if (isHolder) setHolderWithdrawAmount('');
      else setRoyaltyWithdrawAmount('');
      setTimeout(() => fetchDistributorMetrics(type), 3000);
    } catch (e) {
      console.error('Emergency withdraw error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBurnDistributorTokens = async (type) => {
    const isHolder = type === 'holder';
    const distributor = distributorFor(type, isHolder ? holderEpochId : royaltyEpochId);
    if (!distributor) return setErrorMessage('The new rewards contract is not configured on the site yet');
    const amountStr = isHolder ? holderBurnAmount : royaltyBurnAmount;
    const metrics = isHolder ? holderMetrics : royaltyMetrics;

    const amountNum = parseFloat(amountStr) || metrics.unclaimedTokens;
    if (!amountNum || amountNum <= 0) {
      setErrorMessage('Please specify an amount to burn');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const amountWei = parseUnits(amountNum.toString(), 18);

      await sendAdminTx(distributor.address, withdrawCalldata(distributor.version, amountWei, activeAddress));

      const burnDataHex = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [DEAD_ADDRESS, amountWei]
      });

      const hash2 = await sendAdminTx(VIBE_TOKEN_CA, burnDataHex);
      setTxHash(hash2);
      setSuccessMessage(`Burned ${amountNum.toLocaleString()} $VIBE by transferring to dead address`);
      if (isHolder) setHolderBurnAmount('');
      else setRoyaltyBurnAmount('');
      setTimeout(() => fetchDistributorMetrics(type), 3000);
    } catch (e) {
      console.error('Burn tokens error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Burn failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawCommunityTokens = async (type) => {
    const isHolder = type === 'holder';
    const isRoyalty = type === 'royalty';
    const isNft = type === 'nft';

    let amountNum = 0;
    let contractAddress = '';

    const distributor = isNft ? null : distributorFor(type, isHolder ? holderEpochId : royaltyEpochId);
    if (!isNft && !distributor) return setErrorMessage('The new rewards contract is not configured on the site yet');
    if (isHolder) {
      contractAddress = distributor.address;
      amountNum = parseFloat(holderCommunityAmount) || holderMetrics.contractBalance;
    } else if (isRoyalty) {
      contractAddress = distributor.address;
      amountNum = parseFloat(royaltyCommunityAmount) || royaltyMetrics.contractBalance;
    } else if (isNft) {
      contractAddress = NFT_CONTRACT_ADDRESS;
      amountNum = parseFloat(nftCommunityAmount) || parseFloat(contractVibeBalance || 0);
    }

    if (!amountNum || amountNum <= 0) {
      setErrorMessage('Please specify an amount to withdraw to community wallet');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const amountWei = parseUnits(amountNum.toString(), 18);

      if (isNft) {
        const withdrawDataHex = encodeFunctionData({
          abi: parseAbi(['function withdrawVIBE() external']),
          functionName: 'withdrawVIBE'
        });
        await sendAdminTx(NFT_CONTRACT_ADDRESS, withdrawDataHex);
      } else {
        await sendAdminTx(contractAddress, withdrawCalldata(distributor.version, amountWei, activeAddress));
      }

      const transferDataHex = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [COMMUNITY_WALLET, amountWei]
      });

      const hash2 = await sendAdminTx(VIBE_TOKEN_CA, transferDataHex);
      setTxHash(hash2);
      setSuccessMessage(`Transferred ${amountNum.toLocaleString()} $VIBE to community wallet`);

      if (isHolder) setHolderCommunityAmount('');
      else if (isRoyalty) setRoyaltyCommunityAmount('');
      else setNftCommunityAmount('');

      if (isNft) await refetchNftState();
      else setTimeout(() => fetchDistributorMetrics(type), 3000);
    } catch (e) {
      console.error('Withdraw to community error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Withdraw to community failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomRouter = async () => {
    const routerToSet = (customRouterInput && customRouterInput.trim().length === 42)
      ? customRouterInput.trim()
      : '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5';

    setIsCustomRouterSaving(true);
    setCustomRouterSuccess(false);
    setErrorMessage('');

    try {
      const dataHex = encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'setAggregatorRouter',
        args: [routerToSet]
      });

      const hash = await sendAdminTx(NFT_CONTRACT_ADDRESS, dataHex);
      setTxHash(hash);
      setCustomRouterSuccess(true);
      await refetchNftState();
    } catch (e) {
      console.error('Set Custom Router error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Set Router failed');
    } finally {
      setIsCustomRouterSaving(false);
    }
  };

  const handleSetOverrideMintPrice = async (customPrice) => {
    const priceEth = customPrice !== undefined ? customPrice : overridePriceInput;
    setIsOverridePriceSaving(true);
    setOverridePriceSuccess(false);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const ethWei = parseEther(String(priceEth || '0.005'));
      const dataHex = encodeFunctionData({
        abi: NFT_ABI,
        functionName: 'setOverridePrices',
        args: [ethWei, 0n]
      });

      const hash = await sendAdminTx(NFT_CONTRACT_ADDRESS, dataHex);
      setTxHash(hash);
      setOverridePriceSuccess(true);
      setSuccessMessage(Number(priceEth) === 0
        ? 'Mint price reset to automated 4-phase calculation'
        : `Mint price set to ${priceEth} ETH successfully`);
      await refetchNftState();
    } catch (e) {
      console.error('Set Override Mint Price error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Set Mint Price failed');
    } finally {
      setIsOverridePriceSaving(false);
    }
  };

  // Non-Admin Access Gate
  if (!authenticated || !isAdmin) {
    return (
      <div className="o1-admin-container" style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center' }}>
        <Card style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text)' }}>
              Access restricted
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
              This administration dashboard requires authorization from the protocol owner address.
            </p>
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>
            Required: {ADMIN_WALLET}
          </div>
          {!authenticated ? (
            <Button variant="primary" size="lg" onClick={login}>
              <Wallet size={16} /> Connect admin wallet
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={() => { disconnect?.(); logout?.(); }}>
              Disconnect ({activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)})
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="o1-admin-container">
      {/* Feedback alerts */}
      {(errorMessage || nftErrorMessage) && (
        <Alert tone="danger">{errorMessage || nftErrorMessage}</Alert>
      )}

      {(successMessage || withdrawSuccess || withdrawVibeSuccess || adminSwapSuccess || setRouterSuccess || customRouterSuccess || adminPaidMintSuccess) && (
        <Alert tone="success">
          {successMessage || (
            withdrawSuccess ? 'ETH withdrawn to admin wallet successfully' :
            withdrawVibeSuccess ? 'All contract $VIBE withdrawn to admin wallet successfully' :
            adminSwapSuccess ? 'Swap & auto-burn executed on Base' :
            (setRouterSuccess || customRouterSuccess) ? 'DEX router connected successfully' :
            adminPaidMintSuccess ? `Admin NFT minted (ID #${adminPaidMintedTokenId || '?'})` :
            'Action completed successfully'
          )}
          {(txHash || adminTxHash) && (
            <a
              href={`https://basescan.org/tx/${txHash || adminTxHash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', marginLeft: '8px' }}
            >
              View on BaseScan ↗
            </a>
          )}
        </Alert>
      )}

      {/* Navigation tabs */}
      <div className="o1-admin-tabs">
        <button
          className={`o1-admin-tab-btn ${activeTab === 'holder' ? 'active' : ''}`}
          onClick={() => setActiveTab('holder')}
        >
          <Coins size={15} /> Holders
        </button>
        <button
          className={`o1-admin-tab-btn ${activeTab === 'royalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('royalty')}
        >
          <Crown size={15} /> Royalties
        </button>
        <button
          className={`o1-admin-tab-btn ${activeTab === 'nft' ? 'active' : ''}`}
          onClick={() => setActiveTab('nft')}
        >
          <Sparkles size={15} /> Vibe Club
        </button>
        <button
          className={`o1-admin-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <CalendarClock size={15} /> Schedule
        </button>
        <button
          className={`o1-admin-tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
          onClick={() => setActiveTab('snapshots')}
        >
          <Camera size={15} /> Snapshots
        </button>
      </div>

      {activeTab === 'schedule' && (
        <>
          <AdminScheduleEditor activeAddress={activeAddress} wallets={wallets} />
          <AchievementVaultsCard sendAdminTx={sendAdminTx} />
        </>
      )}
      {activeTab === 'snapshots' && (
        <AdminSnapshotTool
          activeAddress={activeAddress}
          wallets={wallets}
          onUseRoot={({ type, round, root }) => {
            const epoch = String(round);
            if (type === 'holder') {
              setHolderEpochId(epoch);
              setHolderMerkleRoot(root);
              setActiveTab('holder');
            } else {
              setRoyaltyEpochId(epoch);
              setRoyaltyMerkleRoot(root);
              setActiveTab('royalty');
            }
            fetchDistributorMetrics(type, epoch);
          }}
        />
      )}

      {/* ── TAB 1: HOLDERS ── */}
      {activeTab === 'holder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              Holder rewards vesting distributor
            </span>
            <a
              href="https://basescan.org/address/0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span style={{ fontFamily: 'var(--mono)' }}>0x77e0...d089</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="o1-admin-metrics-grid">
            <Tile
              label="Contract balance"
              value={holderMetrics.loading ? '...' : `${holderMetrics.contractBalance.toLocaleString()} $VIBE`}
            />
            <Tile
              label="Wallets claimed"
              value={holderMetrics.loading ? '...' : `${holderMetrics.claimedWalletsCount} / ${holderMetrics.totalWalletsCount}`}
            />
            <Tile
              label="Total claimed"
              value={holderMetrics.loading ? '...' : `${holderMetrics.claimedTokens.toLocaleString()} $VIBE`}
            />
            <Tile
              label="Unclaimed in round"
              value={holderMetrics.loading ? '...' : `${holderMetrics.unclaimedTokens.toLocaleString()} $VIBE`}
            />
          </div>
          <RoundStatus metrics={holderMetrics} label={`Unlock #${holderEpochId}`} />

          {/* Action 1: Merkle Root */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              1. Publish Merkle root proof
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={holderEpochId}
                onChange={(e) => {
                  const newEpoch = e.target.value;
                  setHolderEpochId(newEpoch);
                  setHolderMerkleRoot(roundProofs('holder', newEpoch)?.merkleRoot || '');
                  fetchDistributorMetrics('holder', newEpoch);
                }}
                placeholder="Round"
                className="o1-admin-input"
                style={{ maxWidth: '100px' }}
              />
              <input
                type="text"
                value={holderMerkleRoot}
                onChange={(e) => setHolderMerkleRoot(e.target.value)}
                placeholder="0x... Merkle root bytes32"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="primary" size="md" onClick={() => handleSetMerkleRoot('holder')} disabled={loading}>
                {loading ? 'Saving...' : 'Publish root'}
              </Button>
            </div>
            {expiredAction('holder', holderMetrics, holderEpochId)}
          </Card>

          {/* Action 2: Withdraw to Admin */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              2. Withdraw $VIBE to admin wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={holderWithdrawAmount}
                onChange={(e) => setHolderWithdrawAmount(e.target.value)}
                placeholder={`Max: ${holderMetrics.contractBalance.toLocaleString()} $VIBE`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setHolderWithdrawAmount(holderMetrics.contractBalance.toString())}>
                Max
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleWithdrawDistributorTokens('holder')} disabled={loading}>
                {loading ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </Card>

          {/* Action 3: Burn Unclaimed */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
              3. Burn unclaimed tokens
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={holderBurnAmount}
                onChange={(e) => setHolderBurnAmount(e.target.value)}
                placeholder="Amount in $VIBE to burn"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setHolderBurnAmount(holderMetrics.unclaimedTokens.toString())}>
                All unclaimed
              </Button>
              <Button variant="primary" size="md" onClick={() => handleBurnDistributorTokens('holder')} disabled={loading}>
                {loading ? 'Processing...' : 'Burn tokens'}
              </Button>
            </div>
          </Card>

          {/* Action 4: Withdraw to Community */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              4. Transfer to community wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={holderCommunityAmount}
                onChange={(e) => setHolderCommunityAmount(e.target.value)}
                placeholder={`Max: ${holderMetrics.contractBalance.toLocaleString()} $VIBE`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setHolderCommunityAmount(holderMetrics.contractBalance.toString())}>
                Max
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleWithdrawCommunityTokens('holder')} disabled={loading || holderMetrics.contractBalance <= 0}>
                {loading ? 'Processing...' : 'Transfer'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: ROYALTIES ── */}
      {activeTab === 'royalty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              Vibe Club NFT royalty distributor
            </span>
            <a
              href="https://basescan.org/address/0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span style={{ fontFamily: 'var(--mono)' }}>0x3753...97c1</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="o1-admin-metrics-grid">
            <Tile
              label="Contract balance"
              value={royaltyMetrics.loading ? '...' : `${royaltyMetrics.contractBalance.toLocaleString()} $VIBE`}
            />
            <Tile
              label="Wallets claimed"
              value={royaltyMetrics.loading ? '...' : `${royaltyMetrics.claimedWalletsCount} / ${royaltyMetrics.totalWalletsCount}`}
            />
            <Tile
              label="Total claimed"
              value={royaltyMetrics.loading ? '...' : `${royaltyMetrics.claimedTokens.toLocaleString()} $VIBE`}
            />
            <Tile
              label="Unclaimed in round"
              value={royaltyMetrics.loading ? '...' : `${royaltyMetrics.unclaimedTokens.toLocaleString()} $VIBE`}
            />
          </div>
          <RoundStatus metrics={royaltyMetrics} label={`Royalty #${royaltyEpochId}`} />

          {/* Action 1: Merkle Root */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              1. Publish royalties Merkle root
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={royaltyEpochId}
                onChange={(e) => {
                  const ep = e.target.value;
                  setRoyaltyEpochId(ep);
                  setRoyaltyMerkleRoot(roundProofs('royalty', ep)?.merkleRoot || '');
                  fetchDistributorMetrics('royalty', ep);
                }}
                placeholder="Epoch"
                className="o1-admin-input"
                style={{ maxWidth: '100px' }}
              />
              <input
                type="text"
                value={royaltyMerkleRoot}
                onChange={(e) => setRoyaltyMerkleRoot(e.target.value)}
                placeholder="0x... Merkle root bytes32"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="primary" size="md" onClick={() => handleSetMerkleRoot('royalty')} disabled={loading}>
                {loading ? 'Saving...' : 'Publish root'}
              </Button>
            </div>
            {(() => {
              const round = VIBECLUB_ROUNDS.find((r) => String(r.id) === String(royaltyEpochId));
              const windowOver = round && Date.now() >= new Date(round.nextSnapshotDate).getTime();
              if (!windowOver || royaltyMetrics.rootStatus === 'closed' || royaltyMetrics.version !== 1) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    The claim window of Royalty #{royaltyEpochId} has ended, but this contract has no deadline: close the round so nobody can still claim it directly.
                  </span>
                  <Button variant="secondary" size="md" onClick={handleCloseRoyaltyRound} disabled={loading}>
                    Close round #{royaltyEpochId}
                  </Button>
                </div>
              );
            })()}
            {expiredAction('royalty', royaltyMetrics, royaltyEpochId)}
          </Card>

          {/* Action 2: Withdraw to Admin */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              2. Withdraw $VIBE to admin wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={royaltyWithdrawAmount}
                onChange={(e) => setRoyaltyWithdrawAmount(e.target.value)}
                placeholder={`Max: ${royaltyMetrics.contractBalance.toLocaleString()} $VIBE`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setRoyaltyWithdrawAmount(royaltyMetrics.contractBalance.toString())}>
                Max
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleWithdrawDistributorTokens('royalty')} disabled={loading}>
                {loading ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </Card>

          {/* Action 3: Burn Unclaimed */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
              3. Burn unclaimed tokens
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={royaltyBurnAmount}
                onChange={(e) => setRoyaltyBurnAmount(e.target.value)}
                placeholder="Amount in $VIBE to burn"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setRoyaltyBurnAmount(royaltyMetrics.unclaimedTokens.toString())}>
                All unclaimed
              </Button>
              <Button variant="primary" size="md" onClick={() => handleBurnDistributorTokens('royalty')} disabled={loading}>
                {loading ? 'Processing...' : 'Burn tokens'}
              </Button>
            </div>
          </Card>

          {/* Action 4: Withdraw to Community */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              4. Transfer to community wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                value={royaltyCommunityAmount}
                onChange={(e) => setRoyaltyCommunityAmount(e.target.value)}
                placeholder={`Max: ${royaltyMetrics.contractBalance.toLocaleString()} $VIBE`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setRoyaltyCommunityAmount(royaltyMetrics.contractBalance.toString())}>
                Max
              </Button>
              <Button variant="secondary" size="md" onClick={() => handleWithdrawCommunityTokens('royalty')} disabled={loading || royaltyMetrics.contractBalance <= 0}>
                {loading ? 'Processing...' : 'Transfer'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: VIBE CLUB NFT ── */}
      {activeTab === 'nft' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              Vibe Club NFT contract operations
            </span>
            <a
              href="https://basescan.org/address/0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <span style={{ fontFamily: 'var(--mono)' }}>0x9E92...b886</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="o1-admin-metrics-grid">
            <Tile
              label="Contract $VIBE balance"
              value={`${Number(contractVibeBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} $VIBE`}
            />
            <Tile
              label="Contract ETH balance"
              value={`${parseFloat(contractEthBalance || '0').toFixed(4)} ETH`}
            />
            <Tile
              label="DEX Router"
              value={aggregatorRouterAddress ? `${aggregatorRouterAddress.slice(0, 6)}...${aggregatorRouterAddress.slice(-4)}` : '0x6131...37b5'}
            />
            <Tile
              label="Mint price"
              value={`${ethPriceFormatted} ETH`}
            />
          </div>

          {/* Action 1: Execute Swap & Burn */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              1. Execute swap & burn
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={adminEthInput}
                onChange={(e) => setAdminEthInput(e.target.value)}
                placeholder="0.005 ETH"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => setAdminEthInput('0.001')}>0.001</Button>
              <Button variant="secondary" size="md" onClick={() => setAdminEthInput('0.005')}>0.005</Button>
              <Button variant="secondary" size="md" onClick={() => setAdminEthInput(Number(contractEthBalance || '0.005').toFixed(4))}>Max</Button>
              <Button variant="primary" size="md" onClick={() => executeAdminSwapAndBurn(adminEthInput)} disabled={isAdminSwapping || parseFloat(adminEthInput || '0') <= 0}>
                {isAdminSwapping ? 'Processing...' : 'Swap & burn'}
              </Button>
            </div>
          </Card>

          {/* Action 2: Withdraw $VIBE */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              2. Withdraw $VIBE to admin wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="text"
                readOnly
                value={`Available: ${Number(contractVibeBalance || 0).toLocaleString()} $VIBE`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={executeWithdrawVibe} disabled={isWithdrawingVibe || parseFloat(contractVibeBalance || '0') <= 0}>
                {isWithdrawingVibe ? 'Processing...' : 'Withdraw $VIBE'}
              </Button>
            </div>
          </Card>

          {/* Action 3: Withdraw ETH */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              3. Withdraw ETH to admin wallet
            </span>
            <div className="o1-admin-action-row">
              <input
                type="text"
                readOnly
                value={`Available: ${parseFloat(contractEthBalance || '0').toFixed(4)} ETH`}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={executeWithdrawEth} disabled={isWithdrawingEth || parseFloat(contractEthBalance || '0') <= 0}>
                {isWithdrawingEth ? 'Processing...' : 'Withdraw ETH'}
              </Button>
            </div>
          </Card>

          {/* Action 4: Mint to Admin Wallet */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              4. Mint NFT to recipient or admin
            </span>
            <div className="o1-admin-action-row">
              <input
                type="text"
                value={adminGiveawayRecipient}
                onChange={(e) => setAdminGiveawayRecipient(e.target.value)}
                placeholder={activeAddress ? `Default: ${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : '0x... recipient address'}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="primary" size="md" onClick={() => executeAdminPaidMintWithEth(adminGiveawayRecipient)} disabled={isAdminPaidMinting}>
                {isAdminPaidMinting ? 'Minting...' : 'Mint with ETH'}
              </Button>
              <Button variant="secondary" size="md" onClick={() => executeAdminPaidMintWithVibe(adminGiveawayRecipient, parseEther(String(currentDynamicVibeAmount)))} disabled={isAdminPaidMinting}>
                {isAdminPaidMinting ? 'Minting...' : 'Mint with $VIBE'}
              </Button>
            </div>
          </Card>

          {/* Action 5: Set DEX Router */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              5. Set aggregator DEX router
            </span>
            <div className="o1-admin-action-row">
              <input
                type="text"
                value={customRouterInput}
                onChange={(e) => setCustomRouterInput(e.target.value)}
                placeholder={aggregatorRouterAddress || '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'}
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={handleSaveCustomRouter} disabled={isCustomRouterSaving}>
                {isCustomRouterSaving ? 'Saving...' : 'Set router'}
              </Button>
            </div>
          </Card>

          {/* Action 6: Set Mint Price Override */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              6. Set override mint price
            </span>
            <div className="o1-admin-action-row">
              <input
                type="number"
                step="0.001"
                min="0"
                value={overridePriceInput}
                onChange={(e) => setOverridePriceInput(e.target.value)}
                placeholder="0.005 ETH"
                className="o1-admin-input"
                style={{ flex: 1 }}
              />
              <Button variant="secondary" size="md" onClick={() => { setOverridePriceInput('0.005'); handleSetOverrideMintPrice('0.005'); }}>0.005</Button>
              <Button variant="secondary" size="md" onClick={() => { setOverridePriceInput('0.015'); handleSetOverrideMintPrice('0.015'); }}>0.015</Button>
              <Button variant="secondary" size="md" onClick={() => { setOverridePriceInput('0'); handleSetOverrideMintPrice('0'); }}>Auto</Button>
              <Button variant="primary" size="md" onClick={() => handleSetOverrideMintPrice(overridePriceInput)} disabled={isOverridePriceSaving}>
                {isOverridePriceSaving ? 'Saving...' : 'Set price'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default BaseAppAdminView;
