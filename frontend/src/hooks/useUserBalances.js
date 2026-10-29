import { useState, useEffect, useCallback } from 'react';
import { formatUnits } from 'viem';
import { publicClient } from '../config/rpc';

const VIBE_TOKEN_ADDRESS = '0xb200000000000000000000df24ecb8bf51100a01';
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export function useUserBalances(address) {
  const [balances, setBalances] = useState({
    eth: '0',
    vibe: '0',
    ethFormatted: '0.0000',
    vibeFormatted: '0',
    exactVibeStr: '0',
    loading: false,
    rawEth: 0n,
    rawVibe: 0n
  });

  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances({
        eth: '0',
        vibe: '0',
        ethFormatted: '0.0000',
        vibeFormatted: '0',
        exactVibeStr: '0',
        loading: false,
        rawEth: 0n,
        rawVibe: 0n
      });
      return;
    }

    setBalances((prev) => ({ ...prev, loading: true }));
    try {
      const [ethBalance, vibeBalance] = await Promise.all([
        publicClient.getBalance({ address }).catch(() => 0n),
        publicClient.readContract({
          address: VIBE_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }).catch(() => 0n),
      ]);

      const exactVibeStr = formatUnits(vibeBalance, 18);
      const ethNum = parseFloat(formatUnits(ethBalance, 18));
      const vibeNum = parseFloat(exactVibeStr);

      const ethFormatted = ethNum.toFixed(4);
      const vibeFormatted = vibeNum >= 1000000
        ? (vibeNum / 1000000).toFixed(2) + 'M'
        : vibeNum >= 1000
        ? (vibeNum / 1000).toFixed(2) + 'K'
        : vibeNum.toLocaleString(undefined, { maximumFractionDigits: 2 });

      setBalances({
        eth: ethNum.toString(),
        vibe: exactVibeStr,
        ethFormatted,
        vibeFormatted,
        exactVibeStr,
        loading: false,
        rawEth: ethBalance,
        rawVibe: vibeBalance
      });
    } catch (err) {
      console.error('Error fetching onchain balances:', err);
      setBalances((prev) => ({ ...prev, loading: false }));
    }
  }, [address]);

  useEffect(() => {
    fetchBalances();
    const timer = setInterval(fetchBalances, 15000);
    return () => clearInterval(timer);
  }, [fetchBalances]);

  return { ...balances, refetch: fetchBalances };
}
