import { useEffect, useState } from 'react';
import { formatEther, parseAbi } from 'viem';
import { publicClient } from '../config/rpc';

const STAKING = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const STAKING_ABI = parseAbi([
  'function getUserState(bytes32 vaultId, address user) view returns (uint64 nextLotId, uint192 totalStaked, uint16 penaltyRemainder)',
]);
const REFRESH_MS = 20_000;

/**
 * Live $VIBE amount the wallet has staked in one o1 vault. 0 with no wallet or no vault yet,
 * null until the first read succeeds, so a failed read never shows as an empty stake.
 */
export function useVaultStake(vaultId, address) {
  const canRead = Boolean(vaultId && address);
  const [loaded, setLoaded] = useState(null); // { key, amount }
  const key = `${vaultId}:${address}`;

  useEffect(() => {
    if (!canRead) return undefined;
    let active = true;
    const read = async () => {
      try {
        const [, staked] = await publicClient.readContract({
          address: STAKING,
          abi: STAKING_ABI,
          functionName: 'getUserState',
          args: [vaultId, address],
        });
        if (active) setLoaded({ key, amount: Number(formatEther(staked)) });
      } catch {} // the last known amount stays until the next refresh
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') read();
    };
    read();
    const timer = setInterval(read, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canRead, vaultId, address, key]);

  if (!canRead) return 0;
  return loaded?.key === key ? loaded.amount : null;
}
