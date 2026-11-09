import { useState } from 'react';
import { Play, Copy, Check, Terminal } from 'lucide-react';
import { DEMO_ADDRESS } from '../../config/demo';
import './demo.css';

// Agent Zone in the read-only demo: the public agent API, run live for the demo address.
// These are the same GET endpoints an agent calls; none of them can move funds.
export const API_EXAMPLES = [
  { id: 'claims', path: `/api/claims?address=${DEMO_ADDRESS}`, text: 'Every claim round for the address: eligible, amount, claimed or open.' },
  { id: 'status', path: `/api/status?address=${DEMO_ADDRESS}`, text: 'Balances, check-in streak, achievements and what can be done next.' },
  { id: 'staking', path: `/api/staking?address=${DEMO_ADDRESS}`, text: 'Staking vaults and this address’s position in them.' },
  { id: 'rounds', path: '/api/rounds', text: 'The reward schedule: past, live and upcoming rounds.' },
];

const MAX_CHARS = 20000;

function ApiRow({ example }) {
  const [state, setState] = useState({ loading: false, status: null, ms: null, body: '' });
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${example.path}`;

  const run = async () => {
    setState({ loading: true, status: null, ms: null, body: '' });
    const started = performance.now();
    try {
      const res = await fetch(example.path, { headers: { Accept: 'application/json' } });
      const text = await res.text();
      let body;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch (e) {
        body = `Not a JSON answer (the API runs on Vercel deployments, not in vite dev).\n\n${text.slice(0, 400)}`;
      }
      if (body.length > MAX_CHARS) body = `${body.slice(0, MAX_CHARS)}\n… (${body.length - MAX_CHARS} more characters, open the URL to see all)`;
      setState({ loading: false, status: res.status, ms: Math.round(performance.now() - started), body });
    } catch (e) {
      setState({ loading: false, status: 'error', ms: null, body: String(e?.message || e) });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`curl -s "${url}"`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const ok = typeof state.status === 'number' && state.status < 400;

  return (
    <div className="vibe-api-try-row" data-testid={`api-try-${example.id}`}>
      <div className="vibe-api-try-head">
        <span className="vibe-api-try-method">GET</span>
        <a className="vibe-api-try-path" href={example.path} target="_blank" rel="noopener noreferrer">{example.path}</a>
        {state.status !== null && (
          <span className={`vibe-api-try-status ${ok ? 'ok' : 'err'}`}>
            {state.status}{state.ms !== null ? ` · ${state.ms} ms` : ''}
          </span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy} title="Copy as curl">
          {copied ? <Check size={13} /> : <Copy size={13} />} curl
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={state.loading}>
          <Play size={13} /> {state.loading ? 'Running…' : 'Run'}
        </button>
      </div>
      <div className="vibe-api-try-desc">{example.text}</div>
      {state.body && <pre className="vibe-api-try-out">{state.body}</pre>}
    </div>
  );
}

export default function ApiPlayground() {
  return (
    <section className="agp-panel vibe-api-try" data-testid="api-playground">
      <div className="agp-head">
        <span className="agp-num"><Terminal size={14} /></span>
        <div>
          <h2>Try the API</h2>
          <p>The public, read-only endpoints your agent uses, live for the demo address. Run one to see the real JSON.</p>
        </div>
      </div>
      <div className="vibe-api-try-list">
        {API_EXAMPLES.map((e) => <ApiRow key={e.id} example={e} />)}
      </div>
    </section>
  );
}
