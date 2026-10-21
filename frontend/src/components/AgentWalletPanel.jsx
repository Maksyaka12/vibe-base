import { useCallback, useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, formatEther, formatUnits, parseAbi, parseEther, parseUnits } from 'viem';
import { publicClient } from '../config/rpc';
import { VIBE_TOKEN } from '../config/distributors';
import { sendWalletTx, isWalletRejection, waitUntil } from '../config/walletTx';
import { useVibeWallets } from '../hooks/useVibeWallets';
import './AgentWalletPanel.css';

// Main / agent wallet switcher plus funding of the agent wallet (Privy embedded wallet created at login).
// Funding is sent and signed by the main wallet; withdrawing back is signed by the agent wallet itself.

const ERC20 = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const fmt = (n, max = 4) => Number(n).toLocaleString('en-US', { maximumFractionDigits: max });

async function readBalances(address) {
  const [eth, vibe] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({ address: VIBE_TOKEN, abi: ERC20, functionName: 'balanceOf', args: [address] }),
  ]);
  return { eth, vibe };
}

export default function AgentWalletPanel({ className = '' }) {
  const { wallets } = useWallets();
  const { mainAddress, agentAddress, hasAgentWallet, active, setActive } = useVibeWallets();
  const [balances, setBalances] = useState(null);
  const [direction, setDirection] = useState('fund');
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!agentAddress) return;
    try {
      const [agent, main] = await Promise.all([
        readBalances(agentAddress),
        hasAgentWallet ? readBalances(mainAddress) : null,
      ]);
      setBalances({ agent, main });
    } catch (e) {
      console.warn('Agent wallet balances failed:', e);
    }
  }, [agentAddress, mainAddress, hasAgentWallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!agentAddress) return null;

  const from = direction === 'fund' ? mainAddress : agentAddress;
  const to = direction === 'fund' ? agentAddress : mainAddress;
  const sourceBalance = balances?.[direction === 'fund' ? 'main' : 'agent'];
  const available = sourceBalance ? (token === 'ETH' ? sourceBalance.eth : sourceBalance.vibe) : null;

  let amountWei = null;
  try {
    amountWei = amount ? (token === 'ETH' ? parseEther(amount) : parseUnits(amount, 18)) : null;
  } catch (e) {
    amountWei = null;
  }
  const tooMuch = amountWei != null && available != null && amountWei > available;
  const canSend = hasAgentWallet && amountWei > 0n && !tooMuch && !busy;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(agentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    setNotice(null);
    const before = available;
    try {
      const tx = token === 'ETH'
        ? { to, data: '0x', value: amountWei }
        : { to: VIBE_TOKEN, data: encodeFunctionData({ abi: ERC20, functionName: 'transfer', args: [to, amountWei] }), value: 0n };
      const hash = await sendWalletTx({ wallets, address: from, ...tx });
      if (hash) {
        await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
      } else {
        // smart wallet without a reported hash: wait until the sender's balance drops
        await waitUntil(async () => {
          const b = await readBalances(from);
          return (token === 'ETH' ? b.eth : b.vibe) < before;
        });
      }
      setAmount('');
      setNotice({ tone: 'ok', text: direction === 'fund' ? 'Agent wallet funded' : 'Sent back to your main wallet' });
      refresh();
    } catch (e) {
      setNotice({ tone: 'err', text: isWalletRejection(e) ? 'Transaction cancelled' : (e?.shortMessage || e?.message || 'Transaction failed') });
    } finally {
      setBusy(false);
    }
  };

  const agentBal = balances?.agent;

  return (
    <div className={`vw-panel ${className}`}>
      <div className="vw-head">
        <span className="vw-title">Agent wallet</span>
        {hasAgentWallet && (
          <div className="vw-switch" role="tablist" aria-label="Active wallet">
            <button type="button" role="tab" aria-selected={active === 'main'} className={active === 'main' ? 'on' : ''} onClick={() => setActive('main')}>Main</button>
            <button type="button" role="tab" aria-selected={active === 'agent'} className={active === 'agent' ? 'on' : ''} onClick={() => setActive('agent')}>Agent</button>
          </div>
        )}
      </div>

      <p className="vw-note">
        {hasAgentWallet
          ? `Created for you at login. It is a separate participant with its own balance, streak and rewards. The site is showing your ${active} wallet.`
          : 'Created for you at login. It is your main wallet and the wallet your agent uses.'}
      </p>

      <div className="vw-row">
        <span className="vw-label">Address</span>
        <span className="vw-value">
          <a href={`https://basescan.org/address/${agentAddress}`} target="_blank" rel="noopener noreferrer">{short(agentAddress)}</a>
          <button type="button" className="vw-link" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </span>
      </div>
      <div className="vw-row">
        <span className="vw-label">Balance</span>
        <span className="vw-value">
          {agentBal ? `${fmt(formatEther(agentBal.eth), 5)} ETH · ${fmt(formatUnits(agentBal.vibe, 18), 0)} VIBE` : '…'}
        </span>
      </div>

      {hasAgentWallet ? (
        <div className="vw-transfer">
          <div className="vw-switch vw-switch-wide">
            <button type="button" className={direction === 'fund' ? 'on' : ''} onClick={() => setDirection('fund')}>Fund agent</button>
            <button type="button" className={direction === 'withdraw' ? 'on' : ''} onClick={() => setDirection('withdraw')}>Withdraw to main</button>
          </div>
          <div className="vw-input-row">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
              aria-label="Amount"
            />
            <select value={token} onChange={(e) => setToken(e.target.value)} aria-label="Token">
              <option value="ETH">ETH</option>
              <option value="VIBE">VIBE</option>
            </select>
            {available != null && (
              <button type="button" className="vw-link" onClick={() => setAmount(token === 'ETH' ? formatEther(available) : formatUnits(available, 18))}>Max</button>
            )}
          </div>
          <div className="vw-hint">
            {direction === 'fund' ? 'From' : 'To'} main wallet {short(mainAddress)}
            {available != null && ` · available ${fmt(token === 'ETH' ? formatEther(available) : formatUnits(available, 18), token === 'ETH' ? 5 : 0)} ${token}`}
          </div>
          {tooMuch && <div className="vw-notice err">Not enough {token}</div>}
          <button type="button" className="vw-send" disabled={!canSend} onClick={send}>
            {busy ? 'Confirming…' : direction === 'fund' ? 'Send to agent' : 'Send to main'}
          </button>
          {notice && <div className={`vw-notice ${notice.tone}`}>{notice.text}</div>}
        </div>
      ) : (
        <div className="vw-hint">Top it up by sending ETH (for gas) or VIBE to the address above.</div>
      )}
    </div>
  );
}
