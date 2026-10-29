import {
  Puzzle, Bot, Wallet, Zap, ShieldCheck, CalendarCheck, Gift, Award, Layers, ArrowLeftRight, Gem, Crown, BarChart3,
  FileText, ArrowUpRight, KeyRound,
} from 'lucide-react';
import { InstallTiles, BankrCard, SKILL_URL, BANKR_SKILL_URL, API_URL } from './InstallBlocks';
import '../wallet/WalletPages.css';
import './AgentsPage.css';
import './SkillPage.css';

// /skill (Tools → Skill): what the Vibe Hub skill is, how the agent gets a wallet, and how to install it.

const CAN_DO = [
  { icon: CalendarCheck, title: 'Daily check-in', text: 'Keeps your streak alive' },
  { icon: Gift, title: 'Rewards & royalties', text: 'Claims every open round' },
  { icon: Award, title: 'Achievements', text: 'Claims soulbound SBTs' },
  { icon: Layers, title: 'Staking', text: 'Stakes, claims, withdraws' },
  { icon: ArrowLeftRight, title: 'Swaps & transfers', text: 'ETH ↔ $VIBE, sends funds' },
  { icon: Gem, title: 'NFT mint', text: 'Mints Vibe Club with ETH' },
  { icon: Crown, title: 'Main wallet claims', text: 'Rewards straight to your wallet' },
  { icon: BarChart3, title: 'Answers', text: 'Schedule, eligibility, earnings' },
];

const HOW = [
  { icon: Wallet, title: 'Your agent gets its own wallet', text: 'The Vibe Agent Wallet is created for you at login. Your agent works from it, never from your main wallet.' },
  { icon: Zap, title: 'It acts without you', text: 'No pop-ups, no signatures. You just say what you need in chat, and your agent does the rest.' },
  { icon: ShieldCheck, title: 'You stay in control', text: 'Only Vibe Hub contracts, daily caps for transfers, every action can be switched off in Settings.' },
];

const FILES = [
  { title: 'SKILL.md', sub: 'For agents with the Vibe Agent Wallet', href: SKILL_URL },
  { title: 'Bankr SKILL.md', sub: 'For Bankr, no keys', href: BANKR_SKILL_URL },
  { title: 'API.md', sub: 'Every endpoint the skill uses', href: API_URL },
];

export default function SkillPage({ theme = 'o1', onOpenAgents }) {
  return (
    <div className={`vwp-${theme} agp skp`}>
      <section className="agp-hero">
        <div className="agp-hero-text">
          <span className="agp-hero-badge"><Puzzle size={14} /> Vibe Hub Skill</span>
          <h1>One skill. <span>Your agent</span> runs Vibe Hub.</h1>
          <p>Teach any AI agent to check in, claim, stake and swap for you. Install once, then just ask.</p>
          {onOpenAgents && (
            <button type="button" className="agp-btn agp-btn-main skp-cta" onClick={onOpenAgents}>
              <Bot size={16} /> Set up in Agent Zone
            </button>
          )}
        </div>
        <div className="skp-file" aria-hidden="true">
          <div className="skp-file-head">
            <span /><span /><span />
            <b>SKILL.md</b>
          </div>
          <pre>
            <i>---</i>{'\n'}
            <em>name:</em> vibe-hub{'\n'}
            <em>chain:</em> base{'\n'}
            <i>---</i>{'\n'}
            {'\n'}
            <strong># Vibe Hub</strong>{'\n'}
            <i>-</i> check in{'\n'}
            <i>-</i> claim rewards{'\n'}
            <i>-</i> stake $VIBE{'\n'}
            <i>-</i> swap ETH ↔ VIBE<span className="skp-caret" />
          </pre>
        </div>
      </section>

      <section className="agp-panel">
        <h2 className="skp-title">What your agent can do</h2>
        <div className="skp-grid">
          {CAN_DO.map(({ icon: Icon, title, text }) => (
            <div key={title} className="skp-cap">
              <span className="skp-cap-icon"><Icon size={18} /></span>
              <b>{title}</b>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="skp-how">
        {HOW.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="skp-how-card">
            <div className="skp-how-top">
              <span className="skp-how-icon"><Icon size={20} /></span>
              <span className="skp-how-num">0{i + 1}</span>
            </div>
            <b>{title}</b>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="agp-panel">
        <div className="skp-install-head">
          <div>
            <h2 className="skp-title">Install the skill in your AI</h2>
            <p className="skp-sub">Install opens your app with the setup prompt ready. Send it, then paste your agent key.</p>
          </div>
          {onOpenAgents && (
            <button type="button" className="agp-btn skp-key-btn" onClick={onOpenAgents}>
              <KeyRound size={15} /> Get an agent key
            </button>
          )}
        </div>
        <InstallTiles />
      </section>

      <BankrCard />

      <section className="agp-panel">
        <h2 className="skp-title">Skill files</h2>
        <div className="skp-files">
          {FILES.map(({ title, sub, href }) => (
            <a key={title} className="skp-file-link" href={href} target="_blank" rel="noopener noreferrer">
              <span className="skp-cap-icon"><FileText size={18} /></span>
              <span className="skp-file-text">
                <b>{title}</b>
                <span>{sub}</span>
              </span>
              <ArrowUpRight size={16} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
