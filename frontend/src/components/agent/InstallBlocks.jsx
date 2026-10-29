import { useState } from 'react';
import { Terminal, Copy, Check, ArrowUpRight, Clock } from 'lucide-react';
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
  { name: 'Bankr', sub: 'Its own wallet on Base', logo: '/brands/bankr.png', full: true, href: 'https://bankr.bot', prompt: BANKR_PROMPT, note: 'No keys needed', soon: true },
  { name: 'Any agent', sub: 'Claude Code, Codex, OpenClaw…', icon: Terminal, prompt: AGENT_PROMPT, note: 'Just send it to your agent' },
];

// Bankr is not live yet: its tile and card carry this badge and their buttons stay off until launch.
export function SoonBadge() {
  return <span className="agp-soon"><i />In progress</span>;
}

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
        {CLIENTS.map(({ name, sub, logo, icon: Icon, href, full, prompt, note, soon }) => (
          <div key={name} className={`agp-client ${soon ? 'is-soon' : ''}`}>
            {soon && <SoonBadge />}
            <span className={`agp-logo ${full ? 'full' : ''}`}>
              {logo ? <img src={logo} alt={name} /> : <Icon size={24} />}
            </span>
            <div className="agp-client-name">{name}</div>
            <div className="agp-client-sub">{sub}</div>
            <div className="agp-client-actions">
              {soon ? (
                <span className="agp-btn agp-btn-main agp-btn-off" aria-disabled="true">
                  <Clock size={15} /> Coming soon
                </span>
              ) : href ? (
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

// A short Bankr chat that plays on a loop: install the skill, then just ask.
const BANKR_CHAT = [
  { me: true, text: 'Install the Vibe skill' },
  { text: 'Done. Vibe Hub skill installed', ok: true },
  { me: true, text: 'Do my vibe check-in' },
  { text: 'Checked in on Base', ok: true },
];

export function BankrCard() {
  return (
    <section className="agp-panel agp-bankr is-soon">
      <div className="agp-bankr-info">
        <div className="agp-bankr-title">
          <span className="agp-logo full"><img src="/brands/bankr.png" alt="Bankr" /></span>
          <div>
            <h2>Using Bankr? No keys needed <SoonBadge /></h2>
            <p>Bankr has its own wallet. Just install the skill, then just ask.</p>
          </div>
        </div>
        <ol className="agp-bankr-steps">
          <li><span className="agp-bankr-num">1</span>Log in to Bankr: you get a wallet on Base</li>
          <li><span className="agp-bankr-num">2</span>Install the Vibe skill for your Bankr agent</li>
          <li><span className="agp-bankr-num">3</span>Just ask your agent in the chat</li>
        </ol>
      </div>
      <div className="agp-bankr-action">
        <div className="agp-bankr-chat" aria-hidden="true">
          <div className="agp-bankr-chat-head">
            <img src="/brands/bankr.png" alt="" />
            <b>Bankr</b>
            <span className="agp-bankr-live"><i />Base</span>
          </div>
          <div className="agp-bankr-chat-body">
            {BANKR_CHAT.map(({ me, text, ok }) => (
              <span key={text} className={`agp-bankr-msg ${me ? 'me' : ''}`}>
                {ok && <Check size={13} />}
                {text}
              </span>
            ))}
          </div>
        </div>
        <span className="agp-btn agp-btn-main agp-bankr-open agp-btn-off" aria-disabled="true">
          <Clock size={15} /> Coming soon
        </span>
      </div>
    </section>
  );
}
