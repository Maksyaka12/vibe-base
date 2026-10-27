import { useCallback, useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, formatUnits, parseAbi, parseUnits } from 'viem';
import { publicClient } from '../config/rpc';
import { VIBE_TOKEN } from '../config/distributors';
import { sendWalletTx, waitUntil } from '../config/walletTx';
import { fetchPrices } from '../config/prices';
import { useVibeWallets } from './useVibeWallets';

// Balances (ETH, VIBE, USDC) and USD value of the user's main and agent wallets, plus sending
// from either of them. Shared by the Wallet and Account pages of both themes.

export const TOKENS = [
  { symbol: 'VIBE', name: 'Vibe', address: VIBE_TOKEN, decimals: 18, icon: '/new-logo.png' },
  { symbol: 'ETH', name: 'Ethereum', address: null, decimals: 18, icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, icon: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
];

const ERC20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

async function readBalances(address) {
  const [eth, ...erc20] = await Promise.all([
    publicClient.getBalance({ address }),
    ...TOKENS.filter((t) => t.address).map((t) =>
      publicClient.readContract({ address: t.address, abi: ERC20, functionName: 'balanceOf', args: [address] })
    ),
  ]);
  const out = {};
  let i = 0;
  for (const t of TOKENS) out[t.symbol] = t.address ? erc20[i++] : eth;
  return out;
}

async function readPrices() {
  const p = await fetchPrices();
  return { VIBE: p?.vibe || 0, ETH: p?.eth || 0, USDC: 1 };
}

export const tokenAmount = (token, raw) => (raw == null ? null : Number(formatUnits(raw, TOKENS.find((t) => t.symbol === token).decimals)));

export function useWalletAssets() {
  const { wallets } = useWallets();
  const vw = useVibeWallets();
  const { mainAddress, agentAddress, hasAgentWallet } = vw;
  const [balances, setBalances] = useState({});
  const [prices, setPrices] = useState({ VIBE: 0, ETH: 0, USDC: 1 });

  const refresh = useCallback(async () => {
    const addrs = [mainAddress, hasAgentWallet ? agentAddress : null].filter(Boolean);
    const results = await Promise.all(addrs.map((a) => readBalances(a).catch(() => null)));
    const next = {};
    addrs.forEach((a, i) => {
      if (results[i]) next[a.toLowerCase()] = results[i];
    });
    setBalances((prev) => ({ ...prev, ...next }));
  }, [mainAddress, agentAddress, hasAgentWallet]);

  useEffect(() => {
    refresh();
    readPrices().then(setPrices).catch(() => {});
  }, [refresh]);

  const balancesOf = (address) => (address ? balances[address.toLowerCase()] || null : null);

  const usdValue = (address) => {
    const b = balancesOf(address);
    if (!b) return null;
    return TOKENS.reduce((sum, t) => sum + (tokenAmount(t.symbol, b[t.symbol]) || 0) * (prices[t.symbol] || 0), 0);
  };

  /** Sends `amount` (decimal string) of `token` from one of the user's wallets; resolves with the tx hash or null. */
  const send = async ({ from, to, token, amount }) => {
    const t = TOKENS.find((x) => x.symbol === token);
    const value = parseUnits(amount, t.decimals);
    const before = balancesOf(from)?.[token];
    const tx = t.address
      ? { to: t.address, data: encodeFunctionData({ abi: ERC20, functionName: 'transfer', args: [to, value] }), value: 0n }
      : { to, data: '0x', value };
    const hash = await sendWalletTx({ wallets, address: from, ...tx });
    if (hash) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
      if (receipt.status !== 'success') throw new Error('Transaction reverted on Base');
    } else if (before != null) {
      // smart wallet without a reported hash: wait until the sender's balance drops
      await waitUntil(async () => (await readBalances(from))[token] < before);
    }
    await refresh();
    return hash;
  };

  return { ...vw, balancesOf, usdValue, prices, refresh, send };
}
