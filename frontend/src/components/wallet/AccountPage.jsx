import { usePrivy, useExportWallet } from '@privy-io/react-auth';
import { Bot, Wallet as WalletIcon, KeyRound, ArrowRight } from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import { CopyButton, shortAddr } from './WalletPage';
import './WalletPages.css';

// Account settings shared by both themes: the account's two wallets. Login is wallet-only:
// the connected wallet is the main one, the Privy embedded wallet created at login is the agent wallet.

export default function AccountPage({ theme = 'o1', onOpenWallet }) {
  const { user } = usePrivy();
  const { exportWallet } = useExportWallet();
  const { mainAddress, agentAddress, hasAgentWallet, active } = useVibeWallets();

  if (!user || !mainAddress) {
    return <div className={`vwp vwp-${theme}`}><div className="vwp-card vwp-empty">Log in to manage your account.</div></div>;
  }

    const handle = shortAddr(mainAddress);
  const avatar = '/new-logo-vibe.png';

  const wallets = hasAgentWallet
    ? [
        { key: 'agent', name: 'Vibe Agent Wallet', address: agentAddress, icon: <Bot size={18} />, embedded: true },
        { key: 'main', name: 'Main wallet', address: mainAddress, icon: <WalletIcon size={18} />, embedded: false },
      ]
    : [{ key: 'main', name: 'Vibe Wallet', address: mainAddress, icon: <Bot size={18} />, embedded: agentAddress?.toLowerCase() === mainAddress.toLowerCase() }];

  return (
    <div className={`vwp vwp-${theme}`}>
      <div className="vwp-identity">
        <img src={avatar} alt="" className="vwp-avatar" />
        <div className="vwp-handle">{handle}</div>
      </div>

      <div className="vwp-card">
        <div className="vwp-card-title">Wallets</div>
        <div className="vwp-muted vwp-sub">
          {hasAgentWallet
            ? 'Your account has two wallets: the one you connected and the agent wallet created for you at login.'
            : 'The wallet created for you at login. You and your agent both use it.'}
        </div>
        <div className="vwp-wallets">
          {wallets.map((w) => (
            <div key={w.key} className="vwp-wallet-row static">
              <span className="vwp-wallet-icon">{w.icon}</span>
              <span className="vwp-wallet-text">
                <span className="vwp-wallet-name">
                  {w.name}
                  {hasAgentWallet && w.key === active && <span className="vwp-badge">Active</span>}
                </span>
                <span className="vwp-address-line">
                  <a className="vwp-mono vwp-muted" href={`https://basescan.org/address/${w.address}`} target="_blank" rel="noopener noreferrer">{shortAddr(w.address)}</a>
                  <CopyButton value={w.address} size={12} />
                </span>
              </span>
              {w.embedded && (
                <button type="button" className="vwp-btn vwp-btn-sm" onClick={() => exportWallet({ address: w.address }).catch(() => {})} title="Show the private key of this wallet">
                  <KeyRound size={14} /> Export key
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="vwp-btn vwp-btn-full" onClick={onOpenWallet}>
          Open wallet <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}
