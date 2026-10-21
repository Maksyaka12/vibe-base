import { useCallback, useSyncExternalStore } from 'react';
import { usePrivy } from '@privy-io/react-auth';

// One Vibe Hub account = the wallet the user connected (main) + the Privy embedded wallet created at their
// first login (the agent wallet). Both are separate participants (own balances, streak, rewards); the site
// shows and acts with the active one. Users who log in with X / email / Telegram have only the embedded
// wallet, which is then their main wallet too.

const STORAGE_KEY = 'vibe_active_wallet';
const EVENT = 'vibe_active_wallet_change';
const EMBEDDED_TYPES = ['privy', 'privy-v2'];

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'agent' ? 'agent' : 'main';
  } catch (e) {
    return 'main';
  }
};

const subscribe = (cb) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

export function setActiveWallet(which) {
  try {
    localStorage.setItem(STORAGE_KEY, which === 'agent' ? 'agent' : 'main');
  } catch (e) {}
  window.dispatchEvent(new Event(EVENT));
}

/** The user's main and agent wallets, and which one the site is showing / acting with. */
export function useVibeWallets() {
  const { user } = usePrivy();
  const choice = useSyncExternalStore(subscribe, read, () => 'main');

  const wallets = (user?.linkedAccounts || []).filter((a) => a.type === 'wallet' && a.chainType !== 'solana');
  const embedded = wallets.find((a) => EMBEDDED_TYPES.includes(a.walletClientType));
  const external = wallets.find((a) => !EMBEDDED_TYPES.includes(a.walletClientType));

  const mainAddress = external?.address || embedded?.address || user?.wallet?.address || null;
  const agentAddress = embedded?.address || null;
  // a separate agent wallet exists only when the user also connected their own wallet
  const hasAgentWallet = Boolean(agentAddress && mainAddress && agentAddress.toLowerCase() !== mainAddress.toLowerCase());
  const active = choice === 'agent' && hasAgentWallet ? 'agent' : 'main';

  return {
    mainAddress,
    agentAddress,
    hasAgentWallet,
    active,
    activeAddress: active === 'agent' ? agentAddress : mainAddress,
    setActive: useCallback((which) => setActiveWallet(which), []),
  };
}
