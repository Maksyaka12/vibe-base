import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Bot, Terminal, Copy, Check, ArrowUpRight, CalendarCheck, Gift, Award, Layers, ArrowLeftRight, Send,
  ShieldCheck, KeyRound, Wallet, Lock, Gauge,
} from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import AgentAccessCard from '../wallet/AgentAccessCard';
import '../wallet/WalletPages.css';
import './AgentsPage.css';

// /agents (Agent Zone): how to hand Vibe Hub to an AI agent. Step 1 enables the agent wallet, step 2 installs the
// skill in the user's AI (links open the app with a ready prompt), and Bankr users get the keyless skill instead.

const ORIGIN = 'https://vibehome.dog';
const AGENT_PROMPT = `Set up the Vibe Hub skill: read ${ORIGIN}/skills/vibe-hub/SKILL.md and follow it. You will run Vibe Hub for me from my Vibe Agent Wallet on Base. I will paste my agent key in the next message: keep it private.`;
const BANKR_PROMPT = `Install the Vibe Hub skill from ${ORIGIN}/skills/bankr/SKILL.md, then show my Vibe Hub status.`;

const CLIENTS = [
  { name: 'Claude', sub: 'claude.ai', logo: '/brands/claude.svg', href: `https://claude.ai/new?q=${encodeURIComponent(AGENT_PROMPT)}` },
  { name: 'ChatGPT', sub: 'chatgpt.com', logo: '/brands/openai.svg', href: `https://chatgpt.com/?q=${encodeURIComponent(AGENT_PROMPT)}` },
  { name: 'Cursor', sub: 'Cursor app', logo: '/brands/cursor.svg', href: `https://cursor.com/link/prompt?text=${encodeURIComponent(AGENT_PROMPT)}`, full: true },
  { name: 'Any agent', sub: 'Claude Code, Codex, OpenClaw…', icon: Terminal },
];

const ABILITIES = [
  { icon: CalendarCheck, text: 'Daily check-in' },
  { icon: Gift, text: 'Rewards & royalties' },
  { icon: Award, text: 'Achievements' },
  { icon: Layers, text: 'Staking' },
  { icon: ArrowLeftRight, text: 'Swaps' },
  { icon: Send, text: 'Transfers' },
];

const ORBIT = ['/brands/claude.svg', '/brands/openai.svg', '/brands/cursor.svg', '/brands/bankr.png'];

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

function StepHead({ n, title, text }) {
  return (
    <div className="agp-head">
      <span className="agp-num">{n}</span>
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
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
        <div className="agp-hero-text">
          <span className="agp-hero-badge"><Bot size={14} /> Agent Zone</span>
          <h1>Let your AI run <span>Vibe Hub</span> for you</h1>
          <p>Connect Claude, ChatGPT, Cursor or Bankr once. Then just ask.</p>
          <div className="agp-abilities">
            {ABILITIES.map(({ icon: Icon, text }) => (
              <span key={text} className="agp-ability"><Icon size={14} /> {text}</span>
            ))}
          </div>
        </div>
        <div className="agp-orbit" aria-hidden="true">
          <span className="agp-orbit-ring" />
          <span className="agp-orbit-ring agp-orbit-ring-2" />
          <div className="agp-orbit-spin">
            {ORBIT.map((src, i) => (
              <span key={src} className="agp-orbit-item" style={{ '--i': i }}>
                <img src={src} alt="" />
              </span>
            ))}
          </div>
          <span className="agp-orbit-core"><img src="/new-logo.png" alt="" /></span>
        </div>
      </section>

      <section className="agp-panel agp-enable">
        <div className="agp-enable-info">
          <StepHead n={1} title="Enable your agent" text="Your agent works from the Vibe Agent Wallet, a separate wallet created for you at login. Enable it, copy the key and add a little ETH for gas." />
          <ul className="agp-safety">
            <li><ShieldCheck size={15} /> Your main wallet is never touched</li>
            <li><Lock size={15} /> Only Vibe Hub contracts are allowed</li>
            <li><Gauge size={15} /> Transfers to other addresses are capped per day</li>
            <li><KeyRound size={15} /> Revoke the key any time</li>
          </ul>
        </div>
        <div className="agp-enable-action">
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
        </div>
      </section>

      <section className="agp-panel">
        <StepHead n={2} title="Install the skill in your AI" text="Install opens your app with the setup prompt ready. Send it, then paste your agent key." />
        <div className="agp-clients">
          {CLIENTS.map(({ name, sub, logo, icon: Icon, href, full }) => (
            <div key={name} className="agp-client">
              <span className={`agp-logo ${full ? 'full' : ''}`}>
                {logo ? <img src={logo} alt={name} /> : <Icon size={24} />}
              </span>
              <div className="agp-client-name">{name}</div>
              <div className="agp-client-sub">{sub}</div>
              <div className="agp-client-actions">
                {href ? (
                  <a className="agp-btn agp-btn-main" href={href} target="_blank" rel="noopener noreferrer" onClick={() => copy(`${name}-open`, AGENT_PROMPT)}>
                    Install <ArrowUpRight size={15} />
                  </a>
                ) : (
                  <button type="button" className="agp-btn agp-btn-main" onClick={() => copy(name, AGENT_PROMPT)}>
                    {copied === name ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy prompt</>}
                  </button>
                )}
                {href && (
                  <button type="button" className="agp-btn" onClick={() => copy(name, AGENT_PROMPT)}>
                    {copied === name ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy prompt</>}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="agp-foot">
          Chat apps read your stats and plan with you. To act on its own, the agent needs web requests: Claude Code, Cursor, Codex, OpenClaw and similar.
        </p>
      </section>

      <section className="agp-panel">
        <StepHead n={3} title="Just ask" />
        <div className="agp-examples">
          {EXAMPLES.map((e) => <span key={e} className="agp-example">{e}</span>)}
        </div>
      </section>

      <section className="agp-panel agp-bankr">
        <div className="agp-bankr-info">
          <div className="agp-bankr-title">
            <span className="agp-logo full"><img src="/brands/bankr.png" alt="Bankr" /></span>
            <div>
              <h2>Using Bankr? No keys needed</h2>
              <p>Bankr has its own wallet. Install the skill and it acts from your Bankr wallet.</p>
            </div>
          </div>
          <ol className="agp-bankr-steps">
            <li>Log in to Bankr: you get a wallet on Base</li>
            <li>Send it the install prompt</li>
            <li>Ask: “do my vibe check-in”</li>
          </ol>
        </div>
        <div className="agp-bankr-action">
          <div className="agp-prompt">{BANKR_PROMPT}</div>
          <div className="agp-client-actions">
            <a className="agp-btn agp-btn-main" href="https://bankr.bot" target="_blank" rel="noopener noreferrer" onClick={() => copy('bankr-open', BANKR_PROMPT)}>
              Open Bankr <ArrowUpRight size={15} />
            </a>
            <button type="button" className="agp-btn" onClick={() => copy('bankr', BANKR_PROMPT)}>
              {copied === 'bankr' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy prompt</>}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
