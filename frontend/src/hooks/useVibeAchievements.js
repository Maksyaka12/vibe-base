import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { publicClient } from '../config/rpc';
import { sendWalletTx, waitUntil } from '../config/walletTx';
import {
  VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
  ACHIEVEMENTS_ABI,
  ACHIEVEMENT_ID_MAP,
  ACHIEVEMENT_NUMERIC_MAP
} from '../config/achievements';

const EVENT_NAME = 'vibe_achievements_update';
const EMPTY = { claimedMap: {}, claimableMap: {}, progress: { longestStreak: 0, vaultsJoined: 0, largestStake: 0 } };

// Maps keyed both by numeric id and by the string key the profile uses.
function toMaps(ids, claimed, claimable) {
  const claimedMap = {};
  const claimableMap = {};
  ids.forEach((id, i) => {
    const num = Number(id);
    const key = ACHIEVEMENT_NUMERIC_MAP[num];
    claimedMap[num] = Boolean(claimed[i]);
    claimableMap[num] = Boolean(claimable[i]);
    if (key) {
      claimedMap[key] = claimedMap[num];
      claimableMap[key] = claimableMap[num];
    }
  });
  return { claimedMap, claimableMap };
}

/**
 * Achievements of one wallet, straight from VibeAchievementsV2: which are claimed, which the wallet has
 * earned (the contract checks streak, staking vaults and stake itself), and the numbers behind them.
 */
export function useVibeAchievements(address) {
  const { wallets } = useWallets();
  const [state, setState] = useState(EMPTY);
  const [claimingId, setClaimingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastTxHash, setLastTxHash] = useState(null);

  const fetchOnChainState = useCallback(async () => {
    if (!address) {
      setState(EMPTY);
      return;
    }
    try {
      const [status, progress] = await Promise.all([
        publicClient.readContract({ address: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS, abi: ACHIEVEMENTS_ABI, functionName: 'statusOf', args: [address] }),
        publicClient.readContract({ address: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS, abi: ACHIEVEMENTS_ABI, functionName: 'progressOf', args: [address] })
      ]);
      const [ids, claimed, claimable] = status;
      const [longestStreak, vaultsJoined, largestStake] = progress;
      setState({
        ...toMaps(ids, claimed, claimable),
        progress: {
          longestStreak: Number(longestStreak),
          vaultsJoined: Number(vaultsJoined),
          largestStake: Number(largestStake / 10n ** 18n)
        }
      });
    } catch (err) {
      console.warn('Error reading onchain achievements:', err);
    }
  }, [address]);

  useEffect(() => {
    fetchOnChainState();
    window.addEventListener(EVENT_NAME, fetchOnChainState);
    const interval = setInterval(fetchOnChainState, 25000);
    return () => {
      window.removeEventListener(EVENT_NAME, fetchOnChainState);
      clearInterval(interval);
    };
  }, [fetchOnChainState]);

  // Claims one achievement; true only once the contract shows it as claimed.
  const claimAchievement = async (achId) => {
    if (!address || claimingId) return false;
    const id = ACHIEVEMENT_ID_MAP[achId] || Number(achId);
    setClaimingId(achId);
    setErrorMessage('');
    setLastTxHash(null);
    try {
      const hash = await sendWalletTx({
        wallets,
        address,
        to: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
        data: encodeFunctionData({ abi: ACHIEVEMENTS_ABI, functionName: 'claim', args: [BigInt(id)] })
      });
      if (hash) {
        setLastTxHash(hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error('Achievement claim reverted');
      }
      const claimed = await waitUntil(() => publicClient.readContract({
        address: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
        abi: ACHIEVEMENTS_ABI,
        functionName: 'hasClaimed',
        args: [address, BigInt(id)]
      }), hash ? 10 : 30);
      if (!claimed) throw new Error('The achievement was not confirmed onchain');
      await fetchOnChainState();
      window.dispatchEvent(new Event(EVENT_NAME));
      return true;
    } catch (err) {
      console.error('Achievement claim error:', err);
      setErrorMessage(err?.shortMessage || err?.message || 'Achievement claim failed');
      return false;
    } finally {
      setClaimingId(null);
    }
  };

  return {
    claimedMap: state.claimedMap,
    claimableMap: state.claimableMap,
    progress: state.progress,
    claimingId,
    errorMessage,
    lastTxHash,
    claimAchievement,
    refetch: fetchOnChainState,
    isContractActive: true
  };
}
