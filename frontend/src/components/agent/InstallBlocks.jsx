import { useState } from 'react';
import { Terminal, Copy, Check, ArrowUpRight } from 'lucide-react';
import './AgentsPage.css';

// Install blocks shared by Agent Zone and the Skill page: one-click tiles for AI apps (they open with the setup
// prompt; the prompt is also copied, in case the app does not prefill it) and the keyless Bankr route.

export const ORIGIN = 'https://vibehome.dog';
export const SKILL_URL = `${ORIGIN}/skills/vibe-hub/SKILL.md`;
export const BANKR_SKILL_URL = `${ORIGIN}/skills/bankr/SKILL.md`;
export const API_URL = `${ORIGIN}/skills/API.md`;

export const AGENT_PROMPT = `Set up the Vibe Hub skill: read ${SKILL_URL} and follow it. You will run Vibe Hub for me from my Vibe Agent Wallet on Base. I will paste my agent key in the next message: keep it private.`;
export const BANKR_PROMPT = `Install the Vibe Hub skill from ${BANKR_SKILL_URL}, then show my Vibe Hub status.`;

// Each tile: a main action (Install opens the app, the prompt is copied too) and a second line, either
// "Copy prompt" or a short note.
const CLIENTS = [
  { name: 'Claude', sub: 'claude.ai', logo: '/brands/claude.svg', href: `https://claude.ai/new?q=${encodeURIComponent(AGENT_PROMPT)}`, prompt: AGENT_PROMPT },
  { name: 'ChatGPT', sub: 'chatgpt.com', logo: '/brands/openai.svg', href: `https://chatgpt.com/?q=${encodeURIComponent(AGENT_PROMPT)}`, prompt: AGENT_PROMPT },
  { name: 'Bankr', sub: 'Its own wallet on Base', logo: '/brands/bankr.png', full: true, href: 'https://bankr.bot', prompt: BANKR_PROMPT, note: 'No keys needed' },
  { name: 'Any agent', sub: 'Claude Code, Codex, OpenClaw…', icon: Terminal, prompt: AGENT_PROMPT, note: 'Just send it to your agent' },
];

export function useCopy() {
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

export function InstallTiles() {
  const [copied, copy] = useCopy();
  return (
    <>
      <div className="agp-clients">
        {CLIENTS.map(({ name, sub, logo, icon: Icon, href, full, prompt, note }) => (
          <div key={name} className="agp-client">
            <span className={`agp-logo ${full ? 'full' : ''}`}>
              {logo ? <img src={logo} alt={name} /> : <Icon size={24} />}
            </span>
            <div className="agp-client-name">{name}</div>
            <div className="agp-client-sub">{sub}</div>
            <div className="agp-client-actions">
              {href ? (
                <a className="agp-btn agp-btn-main" href={href} target="_blank" rel="noopener noreferrer" onClick={() => copy(`${name}-open`, prompt)}>
                  Install <ArrowUpRight size={15} />
                </a>
              ) : (
                <button type="button" className="agp-btn agp-btn-main" onClick={() => copy(name, prompt)}>
                  {copied === name ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy prompt</>}
                </button>
              )}
              {note ? (
                <span className="agp-btn-note">{note}</span>
              ) : (
                <button type="button" className="agp-btn" onClick={() => copy(name, prompt)}>
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
    </>
  );
}

export function BankrCard() {
  const [copied, copy] = useCopy();
  return (
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
  );
}
