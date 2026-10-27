import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Bot, Sparkles, MessageSquare, MousePointer2, Terminal, Landmark, Copy, Check, ExternalLink,
  CalendarCheck, Gift, Award, Layers, ArrowLeftRight, Send, ShieldCheck, KeyRound, Wallet,
} from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import AgentAccessCard from '../wallet/AgentAccessCard';
import '../wallet/WalletPages.css';
import './AgentsPage.css';

// /agents: how to hand Vibe Hub to an AI agent. Step 1 enables the agent wallet, step 2 connects the user's AI
// (one-click links open the app with a ready prompt), and Bankr users get the keyless skill instead.

const ORIGIN = 'https://vibehome.dog';
const AGENT_PROMPT = `Set up the Vibe Hub skill: read ${ORIGIN}/skills/vibe-hub/SKILL.md and follow it. You will run Vibe Hub for me from my Vibe Agent Wallet on Base. I will paste my agent key in the next message: keep it private.`;
const BANKR_PROMPT = `Install the Vibe Hub skill from ${ORIGIN}/skills/bankr/SKILL.md, then show my Vibe Hub status.`;

const CLIENTS = [
  { name: 'Claude', icon: Sparkles, tone: '#D97757', href: `https://claude.ai/new?q=${encodeURIComponent(AGENT_PROMPT)}`, note: 'Opens a new chat with the setup prompt' },
  { name: 'ChatGPT', icon: MessageSquare, tone: '#10A37F', href: `https://chatgpt.com/?q=${encodeURIComponent(AGENT_PROMPT)}`, note: 'Opens a new chat with the setup prompt' },
  { name: 'Cursor', icon: MousePointer2, tone: '#9AA4B2', href: `https://cursor.com/link/prompt?text=${encodeURIComponent(AGENT_PROMPT)}`, note: 'Opens Cursor with the setup prompt' },
  { name: 'Claude Code, Codex & others', icon: Terminal, tone: '#66BEFF', note: 'Copy the prompt and paste it into your agent' },
];

const ABILITIES = [
  { icon: CalendarCheck, text: 'Daily check-in' },
  { icon: Gift, text: 'Claim rewards & royalties' },
  { icon: Award, text: 'Claim achievements' },
  { icon: Layers, text: 'Stake $VIBE' },
  { icon: ArrowLeftRight, text: 'Swap ETH ↔ $VIBE' },
  { icon: Send, text: 'Send funds' },
];

const EXAMPLES = ['Do my Vibe check-in', 'Claim all my Vibe rewards', 'Stake 90% of my $VIBE', 'Buy $VIBE for 0.01 ETH', 'When is the next unlock?'];

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? '' : k)), 1600);
    } catch {}
  };
  return [copied, copy];
}

function Step({ n, title, children }) {
  return (
    <div className="agp-step">
      <div className="agp-step-rail">
        <span className="agp-step-num">{n}</span>
      </div>
      <div className="agp-step-body">
        <h2 className="agp-step-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function AgentsPage({ theme = 'o1', onOpenWallet }) {
  const { authenticated, login } = usePrivy();
  const { agentAddress, hasAgentWallet } = useVibeWallets();
  const [copied, copy] = useCopy();

  return (
    <div className={`vwp-${theme} agp`}>
      <section className="agp-hero">
        <span className="agp-hero-badge"><Bot size={14} /> Vibe Agents</span>
        <h1>Let your AI run Vibe Hub for you</h1>
        <p>Connect Claude, ChatGPT, Cursor or Bankr once, then just ask. Your agent checks in, claims and stakes on its own.</p>
        <div className="agp-abilities">
          {ABILITIES.map(({ icon: Icon, text }) => (
            <span key={text} className="agp-ability"><Icon size={14} /> {text}</span>
          ))}
        </div>
      </section>

      <Step n={1} title="Enable your agent">
        <p className="agp-text">
          Your agent works from the <b>Vibe Agent Wallet</b>, a separate wallet created for you at login. Enable it once and copy the
          agent key. Top it up with a little ETH for gas.
        </p>
        {!authenticated ? (
          <button type="button" className="vwp-btn vwp-btn-primary vwp-btn-full" onClick={login}>
            <Wallet size={16} /> Connect wallet to start
          </button>
        ) : (
          <>
            <AgentAccessCard agentAddress={hasAgentWallet ? agentAddress : null} />
            {hasAgentWallet && onOpenWallet && (
              <button type="button" className="agp-link" onClick={onOpenWallet}>Top up the agent wallet →</button>
            )}
          </>
        )}
      </Step>

      <Step n={2} title="Connect your AI">
        <p className="agp-text">Pick your app: it opens with the setup prompt ready. Send it, then paste your agent key.</p>
        <div className="agp-clients">
          {CLIENTS.map(({ name, icon: Icon, tone, href, note }) => (
            <div key={name} className="agp-client">
              <span className="agp-client-icon" style={{ '--tone': tone }}><Icon size={20} /></span>
              <div className="agp-client-info">
                <span className="agp-client-name">{name}</span>
                <span className="agp-client-note">{note}</span>
              </div>
              <div className="agp-client-actions">
                {href && (
                  <a className="vwp-btn vwp-btn-primary agp-btn-sm" href={href} target="_blank" rel="noopener noreferrer" onClick={() => copy(name, AGENT_PROMPT)}>
                    Open <ExternalLink size={13} />
                  </a>
                )}
                <button type="button" className="vwp-btn agp-btn-sm" onClick={() => copy(`${name}-copy`, AGENT_PROMPT)} title="Copy prompt">
                  {copied === `${name}-copy` ? <Check size={14} /> : <Copy size={14} />}
                  {!href && (copied === `${name}-copy` ? 'Copied' : 'Copy prompt')}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="agp-note">
          <KeyRound size={14} />
          <span>Chat apps can read your stats and plan with you. To act on its own, an agent needs web requests (Claude Code, Cursor, Codex, OpenClaw and similar).</span>
        </div>
      </Step>

      <Step n={3} title="Just ask">
        <div className="agp-examples">
          {EXAMPLES.map((e) => <span key={e} className="agp-example">“{e}”</span>)}
        </div>
      </Step>

      <section className="agp-bankr vwp-card">
        <div className="agp-bankr-head">
          <span className="agp-client-icon" style={{ '--tone': '#F5B83D' }}><Landmark size={20} /></span>
          <div>
            <div className="agp-bankr-title">Using Bankr? No keys needed</div>
            <div className="agp-client-note">Bankr has its own wallet. Install the Vibe Hub skill there and it acts from your Bankr wallet.</div>
          </div>
        </div>
        <ol className="agp-bankr-steps">
          <li>Log in to Bankr: it gives you a wallet on Base.</li>
          <li>Send it the install prompt below.</li>
          <li>Ask it anything: “do my vibe check-in”, “claim my vibe rewards”.</li>
        </ol>
        <div className="agp-prompt">
          <span>{BANKR_PROMPT}</span>
          <button type="button" className="vwp-btn agp-btn-sm" onClick={() => copy('bankr', BANKR_PROMPT)}>
            {copied === 'bankr' ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <a className="vwp-btn vwp-btn-primary vwp-btn-full" href="https://bankr.bot" target="_blank" rel="noopener noreferrer" onClick={() => copy('bankr', BANKR_PROMPT)}>
          Open Bankr <ExternalLink size={14} />
        </a>
      </section>

      <div className="agp-safety">
        <ShieldCheck size={16} />
        <span>
          Your main wallet is never touched. The agent can only use Vibe Hub contracts, transfers to other addresses are capped per day,
          and you can revoke the key any time.
        </span>
      </div>
    </div>
  );
}
