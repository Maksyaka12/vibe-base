import React, { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits, encodeFunctionData, parseAbi } from 'viem';
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
import {
  Coins,
  Crown,
  Sparkles,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

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

  // Generic status & feedback state
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ═════════════════════════════════════════════════════════════════════════
  // 1. HOLDER & ROYALTIES STATES
  // ═════════════════════════════════════════════════════════════════════════
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

  // Multicall Live Metrics
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

  // ═════════════════════════════════════════════════════════════════════════
  // 2. NFT CLUB CONTRACT HOOK
  // ═════════════════════════════════════════════════════════════════════════
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

  // Live $VIBE ratio for dynamic VIBE Mint price
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

  // Generic Admin Transaction Sender
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

  // ═════════════════════════════════════════════════════════════════════════
  // 3. HIGH-SPEED PROD MULTICALL (<350ms) FOR HOLDERS & ROYALTIES
  // ═════════════════════════════════════════════════════════════════════════
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

      // Single multicall for contract token balance + all hasClaimed boolean statuses
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

      const totalWalletsCount = claims.length || (isHolder ? (epoch === '2' ? Object.keys(round2Data?.claims || {}).length : 42) : (epoch === '5' ? 111 : (epoch === '4' ? 111 : (epoch === '3' ? 111 : (epoch === '2' ? 111 : 109)))));
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
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, holderEpochId, royaltyEpochId, fetchDistributorMetrics]);

  // ═════════════════════════════════════════════════════════════════════════
  // 4. ACTION HANDLERS FOR HOLDERS / ROYALTIES
  // ═════════════════════════════════════════════════════════════════════════
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
      setSuccessMessage(`Merkle Root for ${isHolder ? 'Holder Round' : 'Royalty Epoch'} #${epoch} published successfully!`);
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
      setSuccessMessage(`Successfully withdrawn ${amountNum.toLocaleString()} $VIBE from ${isHolder ? 'Holders' : 'Royalties'} contract to Admin Wallet!`);
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

      // Step 1: Emergency withdraw from distributor to Admin
      const withdrawDataHex = encodeFunctionData({
        abi: DISTRIBUTOR_ABI,
        functionName: 'emergencyWithdraw',
        args: [VIBE_TOKEN_CA, amountWei]
      });

      await sendAdminTx(contractAddress, withdrawDataHex);

      // Step 2: Transfer to Dead address
      const burnDataHex = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [DEAD_ADDRESS, amountWei]
      });

      const hash2 = await sendAdminTx(VIBE_TOKEN_CA, burnDataHex);
      setTxHash(hash2);
      setSuccessMessage(`Successfully burned ${amountNum.toLocaleString()} $VIBE by sending to 0x0...dEaD!`);
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
      setErrorMessage('Please specify an amount to withdraw to Community Wallet');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setTxHash('');

    try {
      const amountWei = parseUnits(amountNum.toString(), 18);

      if (isNft) {
        // Step 1: Withdraw VIBE from NFT contract to Admin wallet
        const withdrawDataHex = encodeFunctionData({
          abi: parseAbi(['function withdrawVIBE() external']),
          functionName: 'withdrawVIBE'
        });
        await sendAdminTx(NFT_CONTRACT_ADDRESS, withdrawDataHex);
      } else {
        // Step 1: Emergency withdraw from Distributor contract to Admin wallet
        const withdrawDataHex = encodeFunctionData({
          abi: DISTRIBUTOR_ABI,
          functionName: 'emergencyWithdraw',
          args: [VIBE_TOKEN_CA, amountWei]
        });
        await sendAdminTx(contractAddress, withdrawDataHex);
      }

      // Step 2: Transfer VIBE from Admin wallet to Community wallet (0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf)
      const transferDataHex = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [COMMUNITY_WALLET, amountWei]
      });

      const hash2 = await sendAdminTx(VIBE_TOKEN_CA, transferDataHex);
      setTxHash(hash2);
      setSuccessMessage(`Successfully transferred ${amountNum.toLocaleString()} $VIBE to Community Wallet (${COMMUNITY_WALLET.slice(0, 6)}...${COMMUNITY_WALLET.slice(-4)})!`);

      if (isHolder) setHolderCommunityAmount('');
      else if (isRoyalty) setRoyaltyCommunityAmount('');
      else setNftCommunityAmount('');

      if (isNft) {
        await refetchNftState();
      } else {
        setTimeout(() => fetchDistributorMetrics(type), 3000);
      }
    } catch (e) {
      console.error('Withdraw to community error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Withdraw to community failed');
    } finally {
      setLoading(false);
    }
  };

  // Custom Router Setter Handler
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

  // Set Override Mint Price Handler
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
        ? 'Mint price reset to automated 4-phase calculation!'
        : `Mint price set to ${priceEth} ETH successfully!`);
      await refetchNftState();
    } catch (e) {
      console.error('Set Override Mint Price error:', e);
      setErrorMessage(e?.shortMessage || e?.message || 'Set Mint Price failed');
    } finally {
      setIsOverridePriceSaving(false);
    }
  };

  // Non-Admin Access Wall
  if (!authenticated || !isAdmin) {
    return (
      <div className="admin-view-container" style={{ padding: '40px 16px 80px 16px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(30, 10, 20, 0.95) 0%, rgba(10, 2, 8, 0.98) 100%)',
            border: '2px solid #ff4466',
            borderRadius: '20px',
            padding: '36px 20px',
            boxShadow: '0 0 30px rgba(255, 68, 102, 0.3)'
          }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 68, 102, 0.15)', border: '2px solid #ff4466', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <AlertTriangle size={30} color="#ff4466" />
          </div>
          <h2 style={{ fontSize: '14px', color: '#ff4466', fontFamily: "'Press Start 2P', monospace", marginBottom: '14px' }}>
            ACCESS RESTRICTED
          </h2>
          <p style={{ fontSize: '8px', color: '#cbd5e1', lineHeight: 1.8, fontFamily: "'Press Start 2P', monospace", maxWidth: '520px', margin: '0 auto 24px auto' }}>
            THIS ADMIN PANEL IS RESERVED EXCLUSIVELY FOR THE VIBE PROTOCOL OWNER. CONNECT WITH THE AUTHORIZED WALLET TO PROCEED.
          </p>
          <div style={{ fontSize: '7px', color: '#88aacc', fontFamily: 'monospace', marginBottom: '24px', background: 'rgba(2, 11, 26, 0.8)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
            REQUIRED: {ADMIN_WALLET}
          </div>
          <div>
            {!authenticated ? (
              <button
                onClick={login}
                style={{
                  background: '#ff4466',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(255, 68, 102, 0.5)'
                }}
              >
                CONNECT ADMIN WALLET
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    disconnect?.();
                    logout?.();
                  }}
                  style={{
                    background: 'rgba(255, 68, 102, 0.2)',
                    border: '1.5px solid #ff4466',
                    color: '#ff4466',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '8px',
                    cursor: 'pointer'
                  }}
                >
                  DISCONNECT (CURRENT: {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Consistent Pixel UI Style Constants
  const ACTION_CARD_STYLE = (borderColor) => ({
    background: 'rgba(4, 20, 48, 0.85)',
    border: `1.5px solid ${borderColor}`,
    borderRadius: '16px',
    padding: '18px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.35)'
  });

  const ACTION_HEADER_STYLE = (color) => ({
    fontSize: '8px',
    color: color,
    fontFamily: "'Press Start 2P', monospace",
    fontWeight: 900,
    marginBottom: '14px',
    letterSpacing: '0.4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  const INPUT_STYLE = (borderColor, textColor = '#ffffff', isMonospace = false) => ({
    height: '42px',
    background: 'rgba(2, 11, 26, 0.9)',
    border: `1.5px solid ${borderColor}`,
    borderRadius: '10px',
    padding: '0 14px',
    color: textColor,
    fontFamily: isMonospace ? 'monospace' : "'Press Start 2P', monospace",
    fontSize: isMonospace ? '8.5px' : '8px',
    outline: 'none',
    boxSizing: 'border-box'
  });

  const ACTION_BTN_STYLE = (bgGradient, borderColor, textColor = '#020b1a', isDanger = false) => ({
    height: '42px',
    background: bgGradient,
    border: `1.5px solid ${borderColor}`,
    color: textColor,
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '0 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    boxShadow: isDanger ? '0 0 16px rgba(255, 68, 102, 0.3)' : 'none',
    transition: 'all 0.15s ease'
  });

  const BADGE_BTN_STYLE = (bg, border, color) => ({
    height: '26px',
    background: bg,
    border: `1px solid ${border}`,
    color: color,
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '6.5px',
    fontWeight: 800,
    padding: '0 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease'
  });

  return (
    <div className="admin-view-container" style={{ padding: '20px 12px 80px 12px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: '0', letterSpacing: '0.6px', textAlign: 'center' }}>
          ADMIN <span style={{ color: '#ff4466' }}>PANEL</span>
        </h2>
      </div>

      {/* Global Status Banner (Success / Error / TxHash) */}
      {(errorMessage || nftErrorMessage) && (
        <div
          style={{
            background: 'rgba(255, 68, 102, 0.15)',
            border: '1.5px solid #ff4466',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '8px',
            color: '#ff6688',
            fontFamily: "'Press Start 2P', monospace",
            lineHeight: 1.6,
            marginBottom: '20px',
            boxShadow: '0 0 16px rgba(255, 68, 102, 0.2)'
          }}
        >
          ⚠️ {errorMessage || nftErrorMessage}
        </div>
      )}

      {(successMessage || withdrawSuccess || withdrawVibeSuccess || adminSwapSuccess || setRouterSuccess || customRouterSuccess || adminPaidMintSuccess) && (
        <div
          style={{
            background: 'rgba(0, 255, 136, 0.15)',
            border: '1.5px solid #00ff88',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '8.5px',
            color: '#00ff88',
            fontFamily: "'Press Start 2P', monospace",
            lineHeight: 1.6,
            marginBottom: '20px',
            boxShadow: '0 0 16px rgba(0, 255, 136, 0.25)'
          }}
        >
          {successMessage || (
            withdrawSuccess ? '✓ ETH WITHDRAWN TO ADMIN WALLET SUCCESSFULLY!' :
            withdrawVibeSuccess ? '✓ ALL CONTRACT $VIBE WITHDRAWN TO ADMIN WALLET SUCCESSFULLY!' :
            adminSwapSuccess ? '✓ SWAP & AUTO-BURN EXECUTED ON BASE! 80% $VIBE BURNED!' :
            (setRouterSuccess || customRouterSuccess) ? '✓ DEX ROUTER CONNECTED SUCCESSFULLY!' :
            adminPaidMintSuccess ? `✓ ADMIN NFT MINTED & DELIVERED (ID #${adminPaidMintedTokenId || '?'}) TO ${adminPaidRecipient ? (adminPaidRecipient.slice(0, 6) + '...' + adminPaidRecipient.slice(-4)) : 'ADMIN'}!` :
            '✓ ACTION COMPLETED SUCCESSFULLY!'
          )}
          {(txHash || adminTxHash) && (
            <div style={{ marginTop: '8px' }}>
              <a
                href={`https://basescan.org/tx/${txHash || adminTxHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#00f5ff', textDecoration: 'underline', fontSize: '7.5px' }}
              >
                VIEW TX ON BASESCAN ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* 3 Main Module Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: 'rgba(4, 14, 36, 0.8)',
          border: '1.5px solid rgba(0, 245, 255, 0.25)',
          borderRadius: '14px',
          padding: '6px',
          marginBottom: '24px'
        }}
      >
        <button
          onClick={() => setActiveTab('holder')}
          style={{
            padding: '12px 8px',
            borderRadius: '10px',
            border: activeTab === 'holder' ? '1.5px solid #00f5ff' : '1px solid transparent',
            background: activeTab === 'holder' ? 'linear-gradient(135deg, rgba(0, 245, 255, 0.25) 0%, rgba(0, 184, 255, 0.15) 100%)' : 'transparent',
            color: activeTab === 'holder' ? '#00f5ff' : '#88aacc',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            fontWeight: 900,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            textAlign: 'center'
          }}
        >
          <Coins size={16} color={activeTab === 'holder' ? '#00f5ff' : '#88aacc'} />
          <span>HOLDERS</span>
        </button>

        <button
          onClick={() => setActiveTab('royalty')}
          style={{
            padding: '12px 8px',
            borderRadius: '10px',
            border: activeTab === 'royalty' ? '1.5px solid #c084fc' : '1px solid transparent',
            background: activeTab === 'royalty' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(192, 132, 252, 0.15) 100%)' : 'transparent',
            color: activeTab === 'royalty' ? '#c084fc' : '#88aacc',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            fontWeight: 900,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            textAlign: 'center'
          }}
        >
          <Crown size={16} color={activeTab === 'royalty' ? '#c084fc' : '#88aacc'} />
          <span>ROYALTIES</span>
        </button>

        <button
          onClick={() => setActiveTab('nft')}
          style={{
            padding: '12px 8px',
            borderRadius: '10px',
            border: activeTab === 'nft' ? '1.5px solid #ffd700' : '1px solid transparent',
            background: activeTab === 'nft' ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.25) 0%, rgba(255, 170, 0, 0.15) 100%)' : 'transparent',
            color: activeTab === 'nft' ? '#ffd700' : '#88aacc',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            fontWeight: 900,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            textAlign: 'center'
          }}
        >
          <Sparkles size={16} color={activeTab === 'nft' ? '#ffd700' : '#88aacc'} />
          <span>VIBE CLUB</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: HOLDERS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'holder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header & Contract Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
              <h3 style={{ fontSize: '10.5px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, letterSpacing: '0.4px' }}>
                HOLDER REWARDS VESTING CONTROLS
              </h3>
            </div>
            <a
              href="https://basescan.org/address/0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '7.5px', color: '#88aacc', textDecoration: 'none', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.3px' }}
            >
              CA: 0x77e0...d089 ↗
            </a>
          </div>

          {/* 4 Metric Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 245, 255, 0.35)' }}>
              <div className="admin-metric-label">
                CONTRACT $VIBE BALANCE
              </div>
              <div className="admin-metric-value" style={{ color: '#00f5ff' }}>
                {holderMetrics.loading ? '...' : `${holderMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 255, 136, 0.35)' }}>
              <div className="admin-metric-label">
                WALLETS CLAIMED
              </div>
              <div className="admin-metric-value" style={{ color: '#00ff88' }}>
                {holderMetrics.loading ? '...' : `${holderMetrics.claimedWalletsCount} / ${holderMetrics.totalWalletsCount}`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 245, 255, 0.35)' }}>
              <div className="admin-metric-label">
                TOTAL CLAIMED
              </div>
              <div className="admin-metric-value" style={{ color: '#ffffff' }}>
                {holderMetrics.loading ? '...' : `+${holderMetrics.claimedTokens.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(255, 215, 0, 0.35)' }}>
              <div className="admin-metric-label">
                UNCLAIMED IN ROUND
              </div>
              <div className="admin-metric-value" style={{ color: '#ffd700' }}>
                {holderMetrics.loading ? '...' : `${holderMetrics.unclaimedTokens.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>
          </div>

          {/* Action 1: Set Merkle Root */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 245, 255, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00f5ff' }}>
              1. PUBLISH MERKLE ROOT PROOF
            </div>
            <div className="admin-merkle-row">
              <div className="admin-merkle-inputs">
                <input
                  type="number"
                  value={holderEpochId}
                  onChange={(e) => {
                    const newEpoch = e.target.value;
                    setHolderEpochId(newEpoch);
                    if (newEpoch === '2') {
                      setHolderMerkleRoot(round2Data?.merkleRoot || '');
                    } else if (newEpoch === '1') {
                      setHolderMerkleRoot(round1Data?.merkleRoot || '');
                    }
                    fetchDistributorMetrics('holder', newEpoch);
                  }}
                  placeholder="Round"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 245, 255, 0.3)', '#ffffff'),
                    width: '80px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="text"
                  value={holderMerkleRoot}
                  onChange={(e) => setHolderMerkleRoot(e.target.value)}
                  placeholder="0x... Merkle Root"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 245, 255, 0.3)', '#00f5ff', true),
                    flex: 1
                  }}
                />
              </div>
              <button
                onClick={() => handleSetMerkleRoot('holder')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)', '#00f5ff', '#020b1a'),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'SAVING...' : 'PUBLISH ROOT'}
              </button>
            </div>
          </div>

          {/* Action 2: Withdraw Tokens */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 245, 255, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00f5ff' }}>
              2. WITHDRAW $VIBE TO ADMIN WALLET
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={holderWithdrawAmount}
                  onChange={(e) => setHolderWithdrawAmount(e.target.value)}
                  placeholder={`Max: ${holderMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 245, 255, 0.3)', '#00f5ff'),
                    width: '100%',
                    paddingRight: '65px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setHolderWithdrawAmount(holderMetrics.contractBalance.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(0, 245, 255, 0.18)', 'rgba(0, 245, 255, 0.45)', '#00f5ff'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  MAX
                </button>
              </div>
              <button
                onClick={() => handleWithdrawDistributorTokens('holder')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)', '#00f5ff', '#020b1a'),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'WITHDRAW TO ADMIN'}
              </button>
            </div>
          </div>

          {/* Action 3: Burn Unclaimed Tokens */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(255, 68, 102, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#ff4466' }}>
              3. BURN UNCLAIMED TOKENS
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={holderBurnAmount}
                  onChange={(e) => setHolderBurnAmount(e.target.value)}
                  placeholder="Amount in $VIBE to burn"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(255, 68, 102, 0.3)', '#ff4466'),
                    width: '100%',
                    paddingRight: '125px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setHolderBurnAmount(holderMetrics.unclaimedTokens.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(255, 68, 102, 0.18)', 'rgba(255, 68, 102, 0.45)', '#ff4466'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  ALL UNCLAIMED
                </button>
              </div>
              <button
                onClick={() => handleBurnDistributorTokens('holder')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #ff4466 0%, #cc0033 100%)', '#ff4466', '#ffffff', true),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'BURN TOKENS'}
              </button>
            </div>
          </div>

          {/* Action 4: Withdraw Community */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 255, 136, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00ff88' }}>
              4. WITHDRAW COMMUNITY
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={holderCommunityAmount}
                  onChange={(e) => setHolderCommunityAmount(e.target.value)}
                  placeholder={`Max: ${holderMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 255, 136, 0.3)', '#00ff88'),
                    width: '100%',
                    paddingRight: '65px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setHolderCommunityAmount(holderMetrics.contractBalance.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(0, 255, 136, 0.18)', 'rgba(0, 255, 136, 0.45)', '#00ff88'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  MAX
                </button>
              </div>
              <button
                onClick={() => handleWithdrawCommunityTokens('holder')}
                disabled={loading || holderMetrics.contractBalance <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00ff88 0%, #00b8ff 100%)', '#00ff88', '#020b1a'),
                  cursor: (loading || holderMetrics.contractBalance <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'WITHDRAW COMMUNITY'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ROYALTIES                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'royalty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header & Contract Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 8px #c084fc' }} />
              <h3 style={{ fontSize: '10.5px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, letterSpacing: '0.4px' }}>
                VIBE CLUB ROYALTIES CONTROLS
              </h3>
            </div>
            <a
              href="https://basescan.org/address/0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '7.5px', color: '#c084fc', textDecoration: 'none', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.3px' }}
            >
              CA: 0x3753...97c1 ↗
            </a>
          </div>

          {/* 4 Metric Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(168, 85, 247, 0.35)' }}>
              <div className="admin-metric-label">
                CONTRACT $VIBE BALANCE
              </div>
              <div className="admin-metric-value" style={{ color: '#c084fc' }}>
                {royaltyMetrics.loading ? '...' : `${royaltyMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 255, 136, 0.35)' }}>
              <div className="admin-metric-label">
                WALLETS CLAIMED
              </div>
              <div className="admin-metric-value" style={{ color: '#00ff88' }}>
                {royaltyMetrics.loading ? '...' : `${royaltyMetrics.claimedWalletsCount} / ${royaltyMetrics.totalWalletsCount}`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(168, 85, 247, 0.35)' }}>
              <div className="admin-metric-label">
                TOTAL CLAIMED
              </div>
              <div className="admin-metric-value" style={{ color: '#ffffff' }}>
                {royaltyMetrics.loading ? '...' : `+${royaltyMetrics.claimedTokens.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(255, 215, 0, 0.35)' }}>
              <div className="admin-metric-label">
                UNCLAIMED IN ROUND
              </div>
              <div className="admin-metric-value" style={{ color: '#ffd700' }}>
                {royaltyMetrics.loading ? '...' : `${royaltyMetrics.unclaimedTokens.toLocaleString('en-US')} $VIBE`}
              </div>
            </div>
          </div>

          {/* Action 1: Set Merkle Root */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(168, 85, 247, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#c084fc' }}>
              1. PUBLISH ROYALTIES MERKLE ROOT
            </div>
            <div className="admin-merkle-row">
              <div className="admin-merkle-inputs">
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
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(168, 85, 247, 0.3)', '#ffffff'),
                    width: '80px',
                    textAlign: 'center'
                  }}
                />
                <input
                  type="text"
                  value={royaltyMerkleRoot}
                  onChange={(e) => setRoyaltyMerkleRoot(e.target.value)}
                  placeholder="0x... Merkle Root"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(168, 85, 247, 0.3)', '#c084fc', true),
                    flex: 1
                  }}
                />
              </div>
              <button
                onClick={() => handleSetMerkleRoot('royalty')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', '#c084fc', '#020b1a'),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'SAVING...' : 'PUBLISH ROOT'}
              </button>
            </div>
          </div>

          {/* Action 2: Withdraw Tokens */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(168, 85, 247, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#c084fc' }}>
              2. WITHDRAW $VIBE TO ADMIN WALLET
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={royaltyWithdrawAmount}
                  onChange={(e) => setRoyaltyWithdrawAmount(e.target.value)}
                  placeholder={`Max: ${royaltyMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(168, 85, 247, 0.3)', '#c084fc'),
                    width: '100%',
                    paddingRight: '65px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRoyaltyWithdrawAmount(royaltyMetrics.contractBalance.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(168, 85, 247, 0.18)', 'rgba(168, 85, 247, 0.45)', '#c084fc'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  MAX
                </button>
              </div>
              <button
                onClick={() => handleWithdrawDistributorTokens('royalty')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', '#c084fc', '#020b1a'),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'WITHDRAW TO ADMIN'}
              </button>
            </div>
          </div>

          {/* Action 3: Burn Unclaimed Tokens */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(255, 68, 102, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#ff4466' }}>
              3. BURN UNCLAIMED TOKENS
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={royaltyBurnAmount}
                  onChange={(e) => setRoyaltyBurnAmount(e.target.value)}
                  placeholder="Amount in $VIBE to burn"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(255, 68, 102, 0.3)', '#ff4466'),
                    width: '100%',
                    paddingRight: '125px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRoyaltyBurnAmount(royaltyMetrics.unclaimedTokens.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(255, 68, 102, 0.18)', 'rgba(255, 68, 102, 0.45)', '#ff4466'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  ALL UNCLAIMED
                </button>
              </div>
              <button
                onClick={() => handleBurnDistributorTokens('royalty')}
                disabled={loading}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #ff4466 0%, #cc0033 100%)', '#ff4466', '#ffffff', true),
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'BURN TOKENS'}
              </button>
            </div>
          </div>

          {/* Action 4: Withdraw Community */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 255, 136, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00ff88' }}>
              4. WITHDRAW COMMUNITY
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={royaltyCommunityAmount}
                  onChange={(e) => setRoyaltyCommunityAmount(e.target.value)}
                  placeholder={`Max: ${royaltyMetrics.contractBalance.toLocaleString('en-US')} $VIBE`}
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 255, 136, 0.3)', '#00ff88'),
                    width: '100%',
                    paddingRight: '65px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setRoyaltyCommunityAmount(royaltyMetrics.contractBalance.toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(0, 255, 136, 0.18)', 'rgba(0, 255, 136, 0.45)', '#00ff88'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  MAX
                </button>
              </div>
              <button
                onClick={() => handleWithdrawCommunityTokens('royalty')}
                disabled={loading || royaltyMetrics.contractBalance <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00ff88 0%, #a855f7 100%)', '#00ff88', '#020b1a'),
                  cursor: (loading || royaltyMetrics.contractBalance <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'WITHDRAW COMMUNITY'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: VIBE CLUB (MATCHING HOLDERS & ROYALTIES UNIFIED STRUCTURE)    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'nft' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header & Contract Link */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 8px #ffd700' }} />
              <h3 style={{ fontSize: '10.5px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, letterSpacing: '0.4px' }}>
                VIBE CLUB NFT CONTROLS
              </h3>
            </div>
            <a
              href="https://basescan.org/address/0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '7.5px', color: '#ffd700', textDecoration: 'none', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.3px' }}
            >
              CA: 0x9E92...b886 ↗
            </a>
          </div>

          {/* 3 Metric Cards (Balance VIBE, Balance ETH, Current DEX Router) */}
          <div className="admin-metrics-grid-3">
            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(255, 215, 0, 0.35)' }}>
              <div className="admin-metric-label">
                CONTRACT $VIBE BALANCE
              </div>
              <div className="admin-metric-value" style={{ color: '#ffd700' }}>
                {Number(contractVibeBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} $VIBE
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 245, 255, 0.35)' }}>
              <div className="admin-metric-label">
                CONTRACT ETH BALANCE
              </div>
              <div className="admin-metric-value" style={{ color: '#00f5ff' }}>
                {parseFloat(contractEthBalance || '0').toFixed(4)} ETH
              </div>
            </div>

            <div className="admin-metric-card" style={{ border: '1.5px solid rgba(0, 255, 136, 0.35)' }}>
              <div className="admin-metric-label">
                CURRENT DEX ROUTER
              </div>
              <div className="admin-metric-value" style={{ color: '#00ff88' }}>
                {aggregatorRouterAddress ? `${aggregatorRouterAddress.slice(0, 6)}...${aggregatorRouterAddress.slice(-4)}` : '0x6131...37b5'}
              </div>
            </div>
          </div>

          {/* Action 1: Execute Swap & Burn */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(255, 215, 0, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#ffd700' }}>
              1. EXECUTE SWAP & BURN
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  value={adminEthInput}
                  onChange={(e) => setAdminEthInput(e.target.value)}
                  placeholder="0.005"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(255, 215, 0, 0.3)', '#ffd700'),
                    width: '100%',
                    paddingRight: '155px'
                  }}
                />
                <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                  {['0.001', '0.005', contractEthBalance || '0.005'].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminEthInput(Number(preset).toFixed(4))}
                      className="admin-badge-btn"
                      style={{
                        ...BADGE_BTN_STYLE('rgba(255, 215, 0, 0.18)', 'rgba(255, 215, 0, 0.45)', '#ffd700'),
                        padding: '0 6px'
                      }}
                    >
                      {idx === 2 ? 'MAX' : `${preset}`}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => executeAdminSwapAndBurn(adminEthInput)}
                disabled={isAdminSwapping || parseFloat(adminEthInput || '0') <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #ffd700 0%, #ff4466 100%)', '#ffffff', '#ffffff', true),
                  cursor: (isAdminSwapping || parseFloat(adminEthInput || '0') <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {isAdminSwapping ? 'PROCESSING...' : 'SWAP & BURN'}
              </button>
            </div>
          </div>

          {/* Action 2: Withdraw $VIBE to Admin Wallet */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(255, 215, 0, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#ffd700' }}>
              2. WITHDRAW $VIBE TO ADMIN WALLET
            </div>
            <div className="admin-action-row">
              <input
                type="text"
                readOnly
                value={`CONTRACT BALANCE: ${Number(contractVibeBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} $VIBE`}
                className="admin-input"
                style={{
                  ...INPUT_STYLE('rgba(255, 215, 0, 0.3)', '#ffd700'),
                  flex: 1,
                  width: '100%'
                }}
              />
              <button
                onClick={executeWithdrawVibe}
                disabled={isWithdrawingVibe || parseFloat(contractVibeBalance || '0') <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)', '#ffd700', '#020b1a'),
                  cursor: (isWithdrawingVibe || parseFloat(contractVibeBalance || '0') <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {isWithdrawingVibe ? 'PROCESSING...' : 'WITHDRAW $VIBE'}
              </button>
            </div>
          </div>

          {/* Action 3: Withdraw $ETH to Admin Wallet */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 245, 255, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00f5ff' }}>
              3. WITHDRAW $ETH TO ADMIN WALLET
            </div>
            <div className="admin-action-row">
              <input
                type="text"
                readOnly
                value={`CONTRACT BALANCE: ${parseFloat(contractEthBalance || '0').toFixed(4)} ETH`}
                className="admin-input"
                style={{
                  ...INPUT_STYLE('rgba(0, 245, 255, 0.3)', '#00f5ff'),
                  flex: 1,
                  width: '100%'
                }}
              />
              <button
                onClick={executeWithdrawEth}
                disabled={isWithdrawingEth || parseFloat(contractEthBalance || '0') <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)', '#00f5ff', '#020b1a'),
                  cursor: (isWithdrawingEth || parseFloat(contractEthBalance || '0') <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {isWithdrawingEth ? 'PROCESSING...' : 'WITHDRAW $ETH'}
              </button>
            </div>
          </div>

          {/* Action 4: Mint to Admin Wallet */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 245, 255, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00f5ff' }}>
              4. MINT TO ADMIN WALLET
            </div>
            <div className="admin-mint-action-row">
              <input
                type="text"
                value={adminGiveawayRecipient}
                onChange={(e) => setAdminGiveawayRecipient(e.target.value)}
                placeholder={activeAddress || '0x... (Winner Address or Leave empty for Admin)'}
                className="admin-input"
                style={{
                  ...INPUT_STYLE('rgba(0, 245, 255, 0.3)', '#00f5ff', true),
                  flex: 1,
                  width: '100%'
                }}
              />
              <div className="admin-mint-buttons-grid">
                <button
                  onClick={() => executeAdminPaidMintWithEth(adminGiveawayRecipient)}
                  disabled={isAdminPaidMinting}
                  className="admin-action-btn"
                  style={{
                    ...ACTION_BTN_STYLE('linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)', '#00f5ff', '#020b1a'),
                    cursor: isAdminPaidMinting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAdminPaidMinting ? 'MINTING...' : 'MINT WITH ETH'}
                </button>
                <button
                  onClick={() => executeAdminPaidMintWithVibe(adminGiveawayRecipient, parseEther(String(currentDynamicVibeAmount)))}
                  disabled={isAdminPaidMinting}
                  className="admin-action-btn"
                  style={{
                    ...ACTION_BTN_STYLE('linear-gradient(135deg, #ff9900 0%, #ff5500 100%)', '#ff9900', '#ffffff'),
                    cursor: isAdminPaidMinting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAdminPaidMinting ? 'MINTING...' : 'MINT WITH $VIBE'}
                </button>
              </div>
            </div>
          </div>

          {/* Action 5: Set New DEX Router */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(168, 85, 247, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#c084fc' }}>
              5. SET NEW DEX ROUTER
            </div>
            <div className="admin-action-row">
              <input
                type="text"
                value={customRouterInput}
                onChange={(e) => setCustomRouterInput(e.target.value)}
                placeholder={aggregatorRouterAddress || '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'}
                className="admin-input"
                style={{
                  ...INPUT_STYLE('rgba(168, 85, 247, 0.3)', '#c084fc', true),
                  flex: 1,
                  width: '100%'
                }}
              />
              <button
                onClick={handleSaveCustomRouter}
                disabled={isCustomRouterSaving}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #a855f7 0%, #c084fc 100%)', '#c084fc', '#020b1a'),
                  cursor: isCustomRouterSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isCustomRouterSaving ? 'SAVING...' : 'SET ROUTER'}
              </button>
            </div>
          </div>

          {/* Action 6: Withdraw Community */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(0, 255, 136, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#00ff88' }}>
              6. WITHDRAW COMMUNITY
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  value={nftCommunityAmount}
                  onChange={(e) => setNftCommunityAmount(e.target.value)}
                  placeholder={`Max: ${Number(contractVibeBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} $VIBE`}
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(0, 255, 136, 0.3)', '#00ff88'),
                    width: '100%',
                    paddingRight: '65px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setNftCommunityAmount(Math.floor(Number(contractVibeBalance || 0)).toString())}
                  className="admin-badge-btn"
                  style={{
                    ...BADGE_BTN_STYLE('rgba(0, 255, 136, 0.18)', 'rgba(0, 255, 136, 0.45)', '#00ff88'),
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  MAX
                </button>
              </div>
              <button
                onClick={() => handleWithdrawCommunityTokens('nft')}
                disabled={loading || parseFloat(contractVibeBalance || '0') <= 0}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #00ff88 0%, #ffd700 100%)', '#00ff88', '#020b1a'),
                  cursor: (loading || parseFloat(contractVibeBalance || '0') <= 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'PROCESSING...' : 'WITHDRAW COMMUNITY'}
              </button>
            </div>
          </div>

          {/* Action 7: Set Mint Price (Override) */}
          <div className="admin-action-card" style={{ background: 'rgba(4, 20, 48, 0.9)', border: '1.5px solid rgba(255, 215, 0, 0.3)' }}>
            <div className="admin-action-header" style={{ color: '#ffd700' }}>
              7. SET MINT PRICE
            </div>
            <div className="admin-action-row">
              <div style={{ position: 'relative', flex: 1, width: '100%', height: '42px' }}>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={overridePriceInput}
                  onChange={(e) => setOverridePriceInput(e.target.value)}
                  placeholder="0.005 (in ETH)"
                  className="admin-input"
                  style={{
                    ...INPUT_STYLE('rgba(255, 215, 0, 0.3)', '#ffd700'),
                    width: '100%',
                    paddingRight: '190px'
                  }}
                />
                <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setOverridePriceInput('0.005'); handleSetOverrideMintPrice('0.005'); }}
                    className="admin-badge-btn"
                    style={{
                      ...BADGE_BTN_STYLE('rgba(0, 255, 136, 0.18)', 'rgba(0, 255, 136, 0.45)', '#00ff88'),
                      padding: '0 6px'
                    }}
                  >
                    0.005
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverridePriceInput('0.015'); handleSetOverrideMintPrice('0.015'); }}
                    className="admin-badge-btn"
                    style={{
                      ...BADGE_BTN_STYLE('rgba(255, 215, 0, 0.18)', 'rgba(255, 215, 0, 0.45)', '#ffd700'),
                      padding: '0 6px'
                    }}
                  >
                    0.015
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOverridePriceInput('0'); handleSetOverrideMintPrice('0'); }}
                    className="admin-badge-btn"
                    style={{
                      ...BADGE_BTN_STYLE('rgba(0, 245, 255, 0.18)', 'rgba(0, 245, 255, 0.45)', '#00f5ff'),
                      padding: '0 6px'
                    }}
                  >
                    AUTO
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleSetOverrideMintPrice(overridePriceInput)}
                disabled={isOverridePriceSaving}
                className="admin-action-btn"
                style={{
                  ...ACTION_BTN_STYLE('linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)', '#ffd700', '#020b1a'),
                  cursor: isOverridePriceSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isOverridePriceSaving ? 'SAVING...' : 'SET PRICE'}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default BaseAppAdminView;
