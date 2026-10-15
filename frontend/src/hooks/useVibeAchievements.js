import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData } from 'viem';
import { publicClient } from '../config/rpc';
import { appendBuilderSuffix, DATA_SUFFIX } from '../config/builderCode';
import {
  VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
  ACHIEVEMENTS_ABI,
  ACHIEVEMENT_ID_MAP,
  ACHIEVEMENT_NUMERIC_MAP
} from '../config/achievements';

const EVENT_NAME = 'vibe_achievements_update';

function getStorageKey(address) {
  return address ? `vibe_claimed_achievements_${address.toLowerCase()}` : null;
}

function getInitialLocalState(address) {
  if (!address) return {};
  try {
    const key = getStorageKey(address);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local achievement state:', e);
  }
  return {};
}

export function useVibeAchievements(address) {
  const { wallets } = useWallets();
  const [claimedMap, setClaimedMap] = useState(() => getInitialLocalState(address));
  const [claimingId, setClaimingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastTxHash, setLastTxHash] = useState(null);

  const isContractActive = Boolean(
    VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS &&
    VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  );

  const fetchOnChainState = useCallback(async () => {
    if (!address) {
      setClaimedMap({});
      return;
    }

    if (!isContractActive) {
      const local = getInitialLocalState(address);
      setClaimedMap(local);
      return;
    }

    try {
      // Query statuses for all 8 base achievements (IDs 1 to 8)
      const ids = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
      const results = await publicClient.readContract({
        address: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
        abi: ACHIEVEMENTS_ABI,
        functionName: 'getUserAchievements',
        args: [address, ids]
      });

      if (results && Array.isArray(results)) {
        const newMap = {};
        for (let i = 0; i < ids.length; i++) {
          const numId = Number(ids[i]);
          const stringKey = ACHIEVEMENT_NUMERIC_MAP[numId];
          const isClaimed = Boolean(results[i]);
          if (stringKey) {
            newMap[stringKey] = isClaimed;
          }
          newMap[numId] = isClaimed;
        }

        setClaimedMap(newMap);

        const key = getStorageKey(address);
        if (key) {
          localStorage.setItem(key, JSON.stringify(newMap));
        }
      }
    } catch (err) {
      console.warn('Error reading onchain achievements, using fallback:', err);
      const local = getInitialLocalState(address);
      setClaimedMap(local);
    }
  }, [address, isContractActive]);

  useEffect(() => {
    fetchOnChainState();
    window.addEventListener(EVENT_NAME, fetchOnChainState);
    window.addEventListener('storage', fetchOnChainState);
    const interval = setInterval(fetchOnChainState, 25000);
    return () => {
      window.removeEventListener(EVENT_NAME, fetchOnChainState);
      window.removeEventListener('storage', fetchOnChainState);
      clearInterval(interval);
    };
  }, [fetchOnChainState]);

  const claimAchievement = async (achId) => {
    if (!address || claimingId) return false;

    setClaimingId(achId);
    setErrorMessage('');
    setLastTxHash(null);

    const numericId = ACHIEVEMENT_ID_MAP[achId] || (typeof achId === 'number' ? achId : parseInt(achId, 10));

    try {
      if (isContractActive) {
        const activeWallet = wallets.find(
          (w) => w.address?.toLowerCase() === address.toLowerCase()
        ) || wallets[0];

        if (!activeWallet) {
          throw new Error('Wallet not connected');
        }

        const provider = await activeWallet.getEthereumProvider();

        // Encode calldata for claimAchievement(uint256)
        const rawCalldata = encodeFunctionData({
          abi: ACHIEVEMENTS_ABI,
          functionName: 'claimAchievement',
          args: [BigInt(numericId)]
        });

        // Attach Base ERC-8021 Builder Code suffix
        const calldataWithSuffix = appendBuilderSuffix(rawCalldata);

        let txHashResult = null;

        // Try direct eth_sendTransaction first
        try {
          txHashResult = await provider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: address,
                to: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS,
                data: calldataWithSuffix,
                value: '0x0'
              }
            ]
          });
        } catch (sendTxErr) {
          console.warn('eth_sendTransaction fallback to wallet_sendCalls if supported:', sendTxErr);
          try {
            const callsRes = await provider.request({
              method: 'wallet_sendCalls',
              params: [{
                version: '1.0',
                chainId: '0x2105',
                from: address,
                calls: [{ to: VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS, value: '0x0', data: calldataWithSuffix }],
                capabilities: DATA_SUFFIX ? {
                  dataSuffix: {
                    value: DATA_SUFFIX,
                    optional: true
                  }
                } : undefined
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
          } catch (callsErr) {
            throw sendTxErr || callsErr;
          }
        }

        if (txHashResult) {
          setLastTxHash(txHashResult);
          try {
            await publicClient.waitForTransactionReceipt({ hash: txHashResult });
          } catch (e) {
            console.warn('Waiting for receipt warning:', e);
          }
        }

        await fetchOnChainState();
      } else {
        // Fallback simulation
        await new Promise((resolve) => setTimeout(resolve, 600));
        setClaimedMap((prev) => {
          const next = { ...prev, [achId]: true, [numericId]: true };
          const key = getStorageKey(address);
          if (key) {
            localStorage.setItem(key, JSON.stringify(next));
          }
          return next;
        });
      }

      window.dispatchEvent(new Event(EVENT_NAME));
      return true;
    } catch (err) {
      console.error('Achievement claim error:', err);
      setErrorMessage(err?.message || 'Achievement claim failed');
      return false;
    } finally {
      setClaimingId(null);
    }
  };

  return {
    claimedMap,
    claimingId,
    errorMessage,
    lastTxHash,
    claimAchievement,
    refetch: fetchOnChainState,
    isContractActive
  };
}
