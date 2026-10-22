import { useCallback, useEffect, useState } from 'react';
import { usePrivy, useSigners } from '@privy-io/react-auth';
import { Bot, ShieldCheck, ShieldOff, RefreshCw } from 'lucide-react';
import { isWalletRejection } from '../../config/walletTx';
import { CopyButton } from './WalletPage';

// "Agent access" on the Account page: lets our server sign for the user's agent wallet (Privy signer, the user
// approves once, revocable) and issues the agent key the user hands to their AI agent.

const AGENT_SIGNER_ID = import.meta.env.VITE_PRIVY_SIGNER_ID || 'y71vnth4hmzgtq71ehfipceq';

export default function AgentAccessCard({ agentAddress }) {
  const { getAccessToken } = usePrivy();
  const { addSigners, removeSigners } = useSigners();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');

  const api = useCallback(async (method) => {
    const token = await getAccessToken();
    const res = await fetch('/api/agent/token', { method, headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    try {
      setState(await api('GET'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [api]);

  useEffect(() => {
    if (agentAddress) load();
  }, [agentAddress, load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(isWalletRejection(e) ? 'Cancelled' : (e.message || 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const enable = () => run(async () => {
    if (!state?.signer) await addSigners({ address: agentAddress, signers: [{ signerId: AGENT_SIGNER_ID }] });
    const { token } = await api('POST');
    setNewKey(token);
    await load();
  });

  const rotate = () => run(async () => {
    const { token } = await api('POST');
    setNewKey(token);
    await load();
  });

  const disable = () => run(async () => {
    await api('DELETE');
    if (state?.signer) await removeSigners({ address: agentAddress });
    setNewKey('');
    await load();
  });

  if (!agentAddress) return null;
  const enabled = Boolean(state?.signer && state?.hasKey);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="vwp-card">
      <div className="vwp-card-head">
        <div className="vwp-card-title">Agent access</div>
        {state && (
          <span className={`vwp-badge ${enabled ? '' : 'off'}`}>{enabled ? 'Enabled' : 'Off'}</span>
        )}
      </div>
      <p className="vwp-hint">
        Let your AI agent use the Vibe Agent Wallet on its own: check in, claim rewards and achievements, stake, swap and send funds,
        with no signatures. Transfers to your main wallet are unlimited, to other addresses they are capped per day. Minting is not available to agents.
        Your main wallet is never touched.
      </p>

      {newKey && (
        <div className="vwp-key">
          <div className="vwp-section-label">Your agent key: copy it now, it is shown only once</div>
          <div className="vwp-address-box">
            <span className="vwp-mono">{newKey}</span>
            <CopyButton value={newKey} />
          </div>
          <p className="vwp-hint">
            Give it to your agent with the API: <span className="vwp-mono">{origin}/api/agent</span>. The agent sends
            {' '}<span className="vwp-mono">Authorization: Bearer &lt;key&gt;</span> to <span className="vwp-mono">POST /api/agent/act</span>.
          </p>
        </div>
      )}

      {state && !enabled && (
        <button type="button" className="vwp-btn vwp-btn-primary vwp-btn-full" onClick={enable} disabled={busy}>
          <Bot size={16} /> {busy ? 'Confirming…' : state.signer ? 'Create agent key' : 'Enable agent'}
        </button>
      )}
      {enabled && (
        <>
          <div className="vwp-muted">
            <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Key created {new Date(state.keyCreatedAt).toLocaleString()}
          </div>
          <div className="vwp-actions vwp-actions-2">
            <button type="button" className="vwp-btn" onClick={rotate} disabled={busy}>
              <RefreshCw size={15} /> New key
            </button>
            <button type="button" className="vwp-btn vwp-btn-danger" onClick={disable} disabled={busy}>
              <ShieldOff size={15} /> Disable agent
            </button>
          </div>
        </>
      )}
      {!state && !error && <div className="vwp-muted">Checking…</div>}
      {error && <div className="vwp-notice err">{error}</div>}
    </div>
  );
}
