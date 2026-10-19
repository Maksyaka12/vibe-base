import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';
import { parseEther, parseUnits, formatUnits, encodeFunctionData, parseAbi } from 'viem';
import { Coins, Crown, Sparkles, ShieldAlert, ExternalLink, Wallet, CalendarClock, Camera } from 'lucide-react';
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
  const [holderEpochId, setHolderEpochId] = useState('2');
  const [holderMerkleRoot, setHolderMerkleRoot] = useState(round2Data?.merkleRoot || round1Data?.merkleRoot || '');
  const [holderWithdrawAmount, setHolderWithdrawAmount] = useState('');
  const [holderBurnAmount, setHolderBurnAmount] = useState('');
  const [holderCommunityAmount, setHolderCommunityAmount] = useState('');

  const [royaltyEpochId, setRoyaltyEpochId] = useState('5');
  const [royaltyMerkleRoot, setRoyaltyMerkleRoot] = useState(royalty5Data?.merkleRoot || '0xf9b9bfb3b409ed97ed3923b0d8c506a057ec659feb2d9199831369373c7d3903');
  const [royaltyWithdrawAmount, setRoyaltyWithdrawAmount] = useState('');
  const [royaltyBurnAmount, setRoyaltyBurnAmount] = useState('');
  const [royaltyCommunityAmount, setRoyaltyCommunityAmount] = useState('');

  const [nftCommunityAmount, setNftCommunityAmount] = useState('');

  // Live Metrics
  const [holderMetrics, setHolderMetrics] = useState({
    contractBalance: 0,
    claimedTokens: 0,
    claimedWalletsCount: 0,
    totalWalletsCount: 42,
    unclaimedTokens: 0,
    loading: false
  });

  const [royaltyMetrics, setRoyaltyMetrics] = useState({
    contractBalance: 0,
    claimedTokens: 0,
    claimedWalletsCount: 0,
    totalWalletsCount: 111,
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
    const contractAddress = isHolder ? DISTRIBUTOR_CA : ROYALTY_DISTRIBUTOR_CA;
    const epoch = overrideEpoch || (isHolder ? holderEpochId : royaltyEpochId) || '1';

    if (isHolder) setHolderMetrics(prev => ({ ...prev, loading: true }));
    else setRoyaltyMetrics(prev => ({ ...prev, loading: true }));

    try {
      const claims = Object.values(
        isHolder
          ? (epoch === '2' ? (round2Data?.claims || {}) : (round1Data?.claims || {}))
          : (epoch === '5' ? (royalty5Data?.claims || {}) : (epoch === '4' ? (royalty4Data?.claims || {}) : (epoch === '3' ? (royalty3Data?.claims || {}) : (epoch === '2' ? (royalty2Data?.claims || {}) : (royalty1Data?.claims || {})))))
      );

      const calls = [
        {
          address: VIBE_TOKEN_CA,
          abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
          functionName: 'balanceOf',
          args: [contractAddress]
        },
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

      let claimedWalletsCount = 0;
      let claimedTokens = 0;

      for (let i = 0; i < claims.length; i++) {
        if (results[i + 1]?.status === 'success' && results[i + 1]?.result === true) {
          claimedWalletsCount++;
          claimedTokens += (claims[i].amount || 0);
        }
      }

      const totalWalletsCount = claims.length || (isHolder ? (epoch === '2' ? Object.keys(round2Data?.claims || {}).length : 42) : 111);
      const totalPool = isHolder ? 10000000 : (epoch === '5' ? (royalty5Data?.poolAmount || 800000) : (epoch === '4' ? 1100000 : (epoch === '3' ? 2000000 : (epoch === '2' ? 1900000 : 2500000))));
      const unclaimedTokens = Math.max(0, totalPool - claimedTokens);

      const metrics = {
        contractBalance,
        claimedTokens,
        claimedWalletsCount,
        totalWalletsCount,
        unclaimedTokens,
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
    const contractAddress = isHolder ? DISTRIBUTOR_CA : ROYALTY_DISTRIBUTOR_CA;
    const epoch = isHolder ? holderEpochId : royaltyEpochId;
    const root = isHolder ? holderMerkleRoot : royaltyMerkleRoot;

    if (!root || !root.startsWith('0x') || root.length !== 66) {
      setErrorMessage('Invalid Merkle Root bytes32 format (must be 66 hex characters)');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const dataHex = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'setMerkleRoot',
        args: [BigInt(epoch), root]
      });

      const hash = await sendAdminTx(contractAddress, dataHex);
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

  const handleWithdrawDistributorTokens = async (type) => {
    const isHolder = type === 'holder';
    const contractAddress = isHolder ? DISTRIBUTOR_CA : ROYALTY_DISTRIBUTOR_CA;
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
      const dataHex = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'emergencyWithdraw',
        args: [VIBE_TOKEN_CA, amountWei]
      });

      const hash = await sendAdminTx(contractAddress, dataHex);
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
    const contractAddress = isHolder ? DISTRIBUTOR_CA : ROYALTY_DISTRIBUTOR_CA;
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

      const withdrawDataHex = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'emergencyWithdraw',
        args: [VIBE_TOKEN_CA, amountWei]
      });
      await sendAdminTx(contractAddress, withdrawDataHex);

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

    if (isHolder) {
      contractAddress = DISTRIBUTOR_CA;
      amountNum = parseFloat(holderCommunityAmount) || holderMetrics.contractBalance;
    } else if (isRoyalty) {
      contractAddress = ROYALTY_DISTRIBUTOR_CA;
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
        const withdrawDataHex = encodeFunctionData({
          abi: DISTRIBUTOR_ABI,
          functionName: 'emergencyWithdraw',
          args: [VIBE_TOKEN_CA, amountWei]
        });
        await sendAdminTx(contractAddress, withdrawDataHex);
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

      {activeTab === 'schedule' && <AdminScheduleEditor activeAddress={activeAddress} wallets={wallets} />}
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
                  if (newEpoch === '2') setHolderMerkleRoot(round2Data?.merkleRoot || '');
                  else if (newEpoch === '1') setHolderMerkleRoot(round1Data?.merkleRoot || '');
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
                  if (ep === '5') setRoyaltyMerkleRoot(royalty5Data?.merkleRoot || '0xf9b9bfb3b409ed97ed3923b0d8c506a057ec659feb2d9199831369373c7d3903');
                  else if (ep === '4') setRoyaltyMerkleRoot(royalty4Data?.merkleRoot || '0xc0623fa72aa0c8e17c3b91d6e44707cb8222b323390ced057b7d233105682b8f');
                  else if (ep === '3') setRoyaltyMerkleRoot(royalty3Data?.merkleRoot || '0xc733c726b9082f9038c5d1ea28f7ca7cc7e72783f5f7f80258246c95c0a6c706');
                  else if (ep === '2') setRoyaltyMerkleRoot(royalty2Data?.merkleRoot || '0x6d1de63ef8aa00a4c851ce6ec950e9424961c6e1b8df44e344bfbc5d13b31766');
                  else if (ep === '1') setRoyaltyMerkleRoot(royalty1Data?.merkleRoot || '0xb07d57c152a5a549646b9bb74b62fbe755910c2cfae868a2bf613e5bc8565a0c');
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
