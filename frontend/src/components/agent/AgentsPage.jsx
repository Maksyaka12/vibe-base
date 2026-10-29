import { useCallback, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  Bot, Copy, Check, CalendarCheck, Gift, Award, Layers, ArrowLeftRight, Send,
  ShieldCheck, KeyRound, Wallet, Lock, Gauge, Crown, Fuel, ArrowDownToLine, Gem,
} from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import { useWalletAssets } from '../../hooks/useWalletAssets';
import AgentAccessCard from '../wallet/AgentAccessCard';
import { DepositModal } from '../wallet/WalletPage';
import { InstallTiles, BankrCard, useCopy } from './InstallBlocks';
import '../wallet/WalletPages.css';
import './AgentsPage.css';

// /agents (Agent Zone): how to hand Vibe Hub to an AI agent. Step 1 enables the agent wallet, step 2 installs the
// skill in the user's AI (links open the app with a ready prompt), and Bankr users get the keyless skill instead.

const ABILITIES = [
  { icon: CalendarCheck, text: 'Daily check-in' },
  { icon: Gift, text: 'Rewards & royalties' },
  { icon: Award, text: 'Achievements' },
  { icon: Layers, text: 'Staking' },
  { icon: ArrowLeftRight, text: 'Swaps' },
  { icon: Send, text: 'Transfers' },
  { icon: Gem, text: 'NFT mint with ETH' },
  { icon: Crown, text: 'Claims for your main wallet' },
];

const ORBIT = ['/brands/claude.svg', '/brands/openai.svg', '/brands/cursor.svg', '/brands/bankr.png'];

const EXAMPLES = [
  'Do my Vibe check-in',
  'Claim all my Vibe rewards',
  'Claim holder rewards to my main wallet',
  'Stake 90% of my $VIBE',
  'Buy $VIBE for 0.01 ETH',
  'Mint a Vibe Club NFT',
  'Show the upcoming rewards schedule',
  'When is the next unlock?',
];

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

export default function AgentsPage({ theme = 'o1' }) {
  const { authenticated, login } = usePrivy();
  const { mainAddress, agentAddress, hasAgentWallet } = useVibeWallets();
  const assets = useWalletAssets();
  const [copied, copy] = useCopy();
  const [depositOpen, setDepositOpen] = useState(false);
  const closeDeposit = useCallback(() => setDepositOpen(false), []);

  return (
    <div className={`vwp-${theme} agp`}>
      <section className="agp-hero">
        <div className="agp-hero-text">
          <span className="agp-hero-badge"><Bot size={14} /> Agent Zone</span>
          <h1>Let your agent run <span>Vibe Hub</span> for you</h1>
          <p>Set up your agent and give it a wallet once. Then just ask.</p>
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
          <StepHead n={1} title="Enable your agent" text="Your agent works from the Vibe Agent Wallet, a separate wallet created for you at login. Enable it and copy the agent key." />
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
            <AgentAccessCard agentAddress={hasAgentWallet ? agentAddress : null} />
          )}
        </div>
      </section>

      <section className="agp-panel agp-topup">
        <StepHead n={2} title="Top up the agent wallet" text="Send a little ETH for gas, plus any $VIBE you want your agent to stake, swap or send." />
        <div className="agp-topup-action">
          {hasAgentWallet && (
            <button type="button" className="agp-address" onClick={() => copy('address', agentAddress)} title="Copy address">
              <Fuel size={15} />
              <span>{agentAddress.slice(0, 6)}…{agentAddress.slice(-4)}</span>
              {copied === 'address' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          {hasAgentWallet ? (
            <button type="button" className="agp-btn agp-btn-main" onClick={() => setDepositOpen(true)}>
              <ArrowDownToLine size={15} /> Deposit
            </button>
          ) : !authenticated && (
            <button type="button" className="agp-btn agp-btn-main" onClick={login}>
              <Wallet size={15} /> Connect wallet
            </button>
          )}
        </div>
      </section>

      <section className="agp-panel">
        <StepHead n={3} title="Install the skill in your AI" text="Install opens your app with the setup prompt ready. Send it, then paste your agent key." />
        <InstallTiles />
      </section>

      <section className="agp-panel">
        <StepHead n={4} title="Just ask your agent" />
        <div className="agp-examples">
          {EXAMPLES.map((e) => <span key={e} className="agp-example">{e}</span>)}
          <span className="agp-example agp-typing" aria-label="and more"><i /><i /><i /></span>
        </div>
      </section>

      <BankrCard />

      {depositOpen && hasAgentWallet && (
        <DepositModal
          theme={theme}
          assets={assets}
          title="Deposit to Vibe Agent Wallet"
          address={agentAddress}
          from={mainAddress}
          fromLabel="main wallet"
          onClose={closeDeposit}
        />
      )}
    </div>
  );
}
