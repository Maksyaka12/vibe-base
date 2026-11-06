import { useEffect, useState } from 'react';
import { formatEther, parseAbi } from 'viem';
import { publicClient } from '../config/rpc';

const STAKING = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const STAKING_ABI = parseAbi([
  'function getVault(bytes32 vaultId) view returns (((address stakingToken, address rewardCurrency, uint64 startTime, uint64 epochDuration, uint64 epochCount, uint192 rewardPerEpoch, uint8 earlyExitMode, uint16 penaltyBps) config, address creator, uint64 endTime, uint192 totalStaked, uint256 rewardRemaining) vault, uint64 depositOpenTime)',
  'function getUserState(bytes32 vaultId, address user) view returns (uint64 nextLotId, uint192 totalStaked, uint16 penaltyRemainder)',
]);
const REFRESH_MS = 20_000;
const YEAR_SECONDS = 365 * 24 * 60 * 60;

// The same Live APR o1 shows: yearly rewards over everything staked, 0 once the vault has ended.
// Rewards and stake must be the same token for it to hold without prices; otherwise there is no figure.
function liveApr(vault) {
  const { stakingToken, rewardCurrency, epochDuration, rewardPerEpoch } = vault.config;
  if (stakingToken.toLowerCase() !== rewardCurrency.toLowerCase()) return null;
  if (BigInt(Math.floor(Date.now() / 1000)) >= vault.endTime) return 0;
  const staked = Number(formatEther(vault.totalStaked));
  if (!staked || !epochDuration) return null;
  return (Number(formatEther(rewardPerEpoch)) / Number(epochDuration)) * YEAR_SECONDS / staked * 100;
}

/**
 * The wallet's live position in one o1 vault: { amount, apr }.
 * amount is 0 with no wallet or no vault yet; amount and apr are null until read, so a failed read never
 * shows as an empty stake.
 */
export function useVaultPosition(vaultId, address) {
  const [loaded, setLoaded] = useState(null); // { key, amount, apr }
  const key = `${vaultId}:${address}`;

  useEffect(() => {
    if (!vaultId) return undefined;
    let active = true;
    const read = async () => {
      try {
        const [vaultRes, state] = await Promise.all([
          publicClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'getVault', args: [vaultId] }),
          address ? publicClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'getUserState', args: [vaultId, address] }) : null,
        ]);
        if (active) setLoaded({ key, amount: state ? Number(formatEther(state[1])) : 0, apr: liveApr(vaultRes[0]) });
      } catch {} // the last known values stay until the next refresh
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
  }, [vaultId, address, key]);

  if (!vaultId) return { amount: 0, apr: null };
  return loaded?.key === key ? loaded : { amount: null, apr: null };
}
