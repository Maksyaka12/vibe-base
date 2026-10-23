import { Bot, Wallet } from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import './WalletPages.css';

// Quick Main / Agent switch. size "sm" sits in the header, "md" above the swap (with a label and the address).
// Hidden for accounts that have only one wallet.

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

export default function WalletToggle({ theme = 'o1', size = 'sm', label }) {
  const { hasAgentWallet, active, activeAddress, setActive } = useVibeWallets();
  if (!hasAgentWallet) return null;

  const options = [
    { key: 'main', text: 'Main', icon: Wallet },
    { key: 'agent', text: 'Agent', icon: Bot },
  ];

  const toggle = (
    <div className={`vwt-switch ${active === 'agent' ? 'is-agent' : ''}`} role="radiogroup" aria-label="Active wallet">
      <span className="vwt-thumb" aria-hidden="true" />
      {options.map(({ key, text, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={active === key}
          className={active === key ? 'on' : ''}
          onClick={() => setActive(key)}
          title={key === 'main' ? 'Use your main wallet' : 'Use your Vibe Agent Wallet'}
        >
          <Icon size={size === 'sm' ? 13 : 14} />
          <span className="vwt-text">{text}</span>
        </button>
      ))}
    </div>
  );

  if (size === 'sm') return <div className={`vwp-${theme} vwt vwt-sm`}>{toggle}</div>;

  return (
    <div className={`vwp-${theme} vwt vwt-md`}>
      <div className="vwt-info">
        <span className="vwt-label">{label || 'Wallet'}</span>
        <span className="vwt-address">{active === 'agent' ? 'Vibe Agent Wallet' : 'Main wallet'} · {short(activeAddress)}</span>
      </div>
      {toggle}
    </div>
  );
}
