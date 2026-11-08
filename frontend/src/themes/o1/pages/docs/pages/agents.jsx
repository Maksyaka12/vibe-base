import { Badge } from '../../../components/ui';
import { C, Callout, Code, Ext, H3, N, Shot, Steps, Table, To, Ui } from '../kit';

const SETUP_PROMPT = 'Set up the Vibe Hub skill: read https://vibehome.dog/skills/vibe-hub/SKILL.md and follow it. You will run Vibe Hub for me from my Vibe Agent Wallet on Base. I will paste my agent key in the next message: keep it private.';

export const agents = [
  {
    slug: 'agent-zone',
    title: 'Agent Zone',
    lead: 'Give an AI agent its own wallet, then ask it to check in, claim, stake and swap for you',
    sections: [
      {
        id: 'what-it-is',
        title: 'What an agent can do',
        body: (
          <>
            <p>Once set up, you tell your agent what you need in a chat, and it acts from the Vibe Agent Wallet with no wallet pop-ups. Open <Ext href="https://vibehome.dog/agents">Agent Zone</Ext> with the teal button in the header.</p>
            <Shot name="agents-hero" alt="The Agent Zone header with the list of abilities" />
            <Table
              columns={['Ability', 'What the agent does', 'Can be turned off']}
              rows={[
                ['Daily check-in', 'Keeps the streak of the agent wallet', 'No'],
                ['Rewards and royalties', 'Claims every open round of the agent wallet', 'No'],
                ['Achievements', 'Claims every earned badge', 'No'],
                ['Claims for your main wallet', 'See below', 'No'],
                ['Staking', 'Deposits, claims staking rewards, withdraws', 'Yes'],
                ['Swaps', 'ETH to $VIBE and back', 'Yes'],
                ['NFT mint', 'Mints one Vibe Club NFT with ETH', 'Yes'],
                ['Transfers to other addresses', 'Sends ETH, $VIBE or USDC, within daily limits', 'Yes'],
                ['Answers', 'Schedule, eligibility, what you earned', 'No'],
              ]}
            />
            <H3 id="abilities">Claims for your main wallet</H3>
            <p>
              Your agent can send claims for your main wallet when you ask it to. This works for achievements and for rewards from <N>Unlock 3</N> and <N>Royalty 7</N> onwards. The agent wallet pays the gas, and the tokens and badges go straight to your main wallet. Your main wallet signs nothing and the agent cannot redirect the reward.
            </p>
          </>
        ),
      },
      {
        id: 'setup',
        title: 'Set up in four steps',
        body: (
          <>
            <H3 id="step-1">1. Enable your agent</H3>
            <p>Connect your wallet and press <Ui>Enable agent</Ui>. You approve once, which lets Vibe Hub's server sign for the Vibe Agent Wallet within the rules below. You then get your agent key.</p>
            <Shot name="agents-enable" alt="Step 1: Enable your agent, with the safety list and the Agent access card" />
            <H3 id="step-2">2. Top up the agent wallet</H3>
            <p>Send a little ETH for gas, plus any $VIBE you want your agent to stake, swap or send. <Ui>Deposit</Ui> can pull directly from your main wallet.</p>
            <Shot name="agents-topup" alt="Step 2: Top up the agent wallet, with its address and a Deposit button" />
            <H3 id="step-3">3. Install the skill in your AI</H3>
            <p><Ui>Install</Ui> opens your AI app with the setup prompt ready. Send it, then paste your agent key in the next message.</p>
            <Shot name="agents-install" alt="Step 3: tiles for Claude, ChatGPT, Bankr and any other agent" />
            <H3 id="step-4">4. Just ask</H3>
            <Shot name="agents-ask" alt="Step 4: examples such as Do my Vibe check-in and Claim all my Vibe rewards" />
            <Callout type="note">
              Chat apps can read your stats and plan with you. To act on its own, the agent needs to make web requests, which works in Claude Code, Cursor, Codex, OpenClaw and similar tools.
            </Callout>
          </>
        ),
      },
      {
        id: 'agent-key',
        title: 'Your agent key',
        body: (
          <>
            <p>The agent key is a password for one thing: asking Vibe Hub to act from your Vibe Agent Wallet within your settings. It is not the wallet's private key, and it gives no access to your main wallet.</p>
            <Shot name="agent-key" width={560} alt="The Agent access card with a new key, shown once, and the New key and Disable agent buttons" />
            <Table
              columns={['Action', 'What happens']}
              rows={[
                [<Ui>Enable agent</Ui>, 'You approve Vibe Hub as a signer of the agent wallet once, and the first key is created'],
                [<Ui>New key</Ui>, 'A new key replaces the old one, which stops working immediately'],
                [<Ui>Disable agent</Ui>, 'The key is revoked and the signer is removed from the wallet'],
              ]}
            />
            <Callout type="danger"><strong>The key is shown only once.</strong> Copy it right away and give it only to your agent. If it leaks, press <Ui>New key</Ui>.</Callout>
          </>
        ),
      },
      {
        id: 'safety',
        title: 'What keeps you in control',
        body: (
          <ul>
            <li><strong>Your main wallet is never touched.</strong> The agent has no way to spend from it.</li>
            <li><strong>Only Vibe Hub contracts are allowed.</strong> The server refuses any transaction to another contract, apart from the transfers you allow.</li>
            <li><strong>You set the rules.</strong> Turn abilities off and set daily limits in <To page="agent-settings">Settings</To>. The server enforces them on every action.</li>
            <li><strong>Exposure is limited to what you deposit.</strong> The agent wallet holds only what you put in it.</li>
            <li><strong>You can stop at any time.</strong> Revoke the key or disable the agent with one button.</li>
            <li><strong>Agents are told to confirm.</strong> The skill tells agents to confirm with you before they stake, swap, mint or send.</li>
          </ul>
        ),
      },
    ],
  },
  {
    slug: 'agent-settings',
    title: 'Agent settings',
    lead: 'Choose what your agent can do with the Vibe Agent Wallet and set its daily limits',
    sections: [
      {
        id: 'open',
        title: 'Status at a glance',
        body: (
          <>
            <p>Open Settings from the wallet pill at the bottom of the menu. The top card shows whether the agent is active, the agent wallet's balance, the ETH left for gas and when the key was created.</p>
            <Shot name="settings-hero" width={640} alt="The Vibe Agent Wallet card with status, balance, ETH for gas and agent key date" />
          </>
        ),
      },
      {
        id: 'permissions',
        title: 'What your agent can do',
        body: (
          <>
            <Shot name="settings-permissions" width={640} alt="Switches for swaps, staking, Vibe Club NFT mint and transfers" />
            <Table
              columns={['Switch', 'Controls', 'Default']}
              rows={[
                ['Swaps', 'Swapping ETH and $VIBE', 'On'],
                ['Staking', 'Staking $VIBE, claiming staking rewards, withdrawing', 'On'],
                ['Vibe Club NFT mint', 'Minting one NFT with ETH at the contract price', 'On'],
                ['Transfers to other addresses', 'Sending funds anywhere other than your main wallet', 'On'],
              ]}
            />
            <p>Changes save immediately. Check-ins and reward claims are always allowed. When a switch is off, the agent gets an error that names the setting and can tell you.</p>
          </>
        ),
      },
      {
        id: 'limits',
        title: 'Daily limits for transfers',
        body: (
          <>
            <p>Limits cap what the agent can send to other addresses per day. They reset at <N>00:00 UTC</N>. Transfers to your own main wallet have no limit.</p>
            <Shot name="settings-limits" width={640} alt="Daily limits for $VIBE, ETH and USDC with how much was sent today" />
            <Table
              columns={['Token', 'Default per day', 'Highest you can set']}
              mono={[1, 2]}
              rows={[
                ['$VIBE', '100,000,000', '1,000,000,000'],
                ['ETH', '5', '10'],
                ['USDC', '10,000', '100,000'],
              ]}
            />
            <ul>
              <li>Set a limit to <N>0</N> to block that token.</li>
              <li>Transfers to other addresses run one at a time per wallet, so parallel requests cannot go past the limit.</li>
              <li>Each token shows how much was sent today against its limit.</li>
              <li>Press <Ui>Save limits</Ui> after changing them, or use the reset icon to go back to the defaults.</li>
              <li>The limits apply to transfers. Swaps and staking are controlled by their switches.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    slug: 'skill',
    title: 'Vibe Hub skill',
    lead: 'The instructions that teach any AI agent how to use Vibe Hub',
    sections: [
      {
        id: 'what-it-is',
        title: 'What a skill is',
        body: (
          <>
            <p>A skill is a short file that tells an AI agent what Vibe Hub is, which endpoints to call and which rules to follow. <Ui>Tools</Ui> → <Ui>Skill</Ui> in the menu shows what it covers.</p>
            <Shot name="skill-hero" alt="The Skill page header" />
            <Shot name="skill-can" alt="The list of what an agent can do with the skill" />
          </>
        ),
      },
      {
        id: 'install',
        title: 'Install it',
        body: (
          <>
            <p>The tiles on the Skill page and in <To page="agent-zone" hash="step-3">Agent Zone</To> open your AI app with the prompt ready. For any other agent, send it this prompt, then paste your agent key in the next message:</p>
            <Code title="Setup prompt">{SETUP_PROMPT}</Code>
            <p>You need an agent key first. <To page="agent-zone" hash="step-1">Get one in Agent Zone</To>.</p>
          </>
        ),
      },
      {
        id: 'files',
        title: 'Skill files',
        body: (
          <>
            <Shot name="skill-files" alt="Links to SKILL.md, Bankr SKILL.md and API.md" />
            <Table
              columns={['File', 'For']}
              rows={[
                [<Ext href="https://vibehome.dog/skills/vibe-hub/SKILL.md">SKILL.md</Ext>, 'Agents that use the Vibe Agent Wallet'],
                [<Ext href="https://vibehome.dog/skills/bankr/SKILL.md">Bankr SKILL.md</Ext>, 'Bankr, with no keys'],
                [<Ext href="https://vibehome.dog/skills/API.md">API.md</Ext>, 'Every endpoint the skill uses'],
              ]}
            />
          </>
        ),
      },
    ],
  },
  {
    slug: 'agent-api',
    title: 'Agent API',
    lead: 'Public read endpoints that return ready transactions, and one endpoint to act from the Vibe Agent Wallet',
    sections: [
      {
        id: 'basics',
        title: 'Basics',
        body: (
          <>
            <p>The host is <C>https://vibehome.dog</C> and the chain is Base (<N>8453</N>). There are two ways to use the API:</p>
            <Table
              columns={['Path', 'For', 'How it signs']}
              rows={[
                ['Your own wallet', 'Agents that already have a wallet, such as Bankr', 'Read the endpoints and submit the returned transactions yourself. No key needed'],
                ['Vibe Agent Wallet', 'Agents without a wallet', <>Send them to <C>POST /api/agent/act</C> with the agent key. The server signs</>],
              ]}
            />
          </>
        ),
      },
      {
        id: 'read',
        title: 'Read endpoints',
        body: (
          <>
            <p>All are <C>GET</C>, public and return JSON.</p>
            <Table
              columns={['Endpoint', 'Returns']}
              rows={[
                [<C>/api/agent</C>, 'Index: endpoints, reward rules and contract addresses'],
                [<C>/api/status?address=0x...</C>, 'Balances, eligibility for the next rounds, Vibe Club and mint state, check-in, achievements and the current staking epoch, with ready transactions'],
                [<C>/api/claims?address=0x...</C>, <>Every round the wallet has an allocation in. <C>status</C> is <C>open</C>, <C>claimed</C>, <C>not_opened</C> or <C>expired</C></>],
                [<C>/api/staking?address=0x...&amp;deposit=AMOUNT</C>, <>Vaults, stake, lots and claimable rewards. <C>deposit</C> is optional and adds approve and deposit transactions</>],
                [<C>/api/swap?address=0x...&amp;side=buy&amp;amount=AMOUNT</C>, <>A KyberSwap route. <C>side</C> is <C>buy</C> or <C>sell</C>, and the optional <C>slippage</C> is in percent (default <N>1</N>). A quote is valid for about <N>20</N> minutes</>],
                [<C>/api/rounds</C>, 'The full schedule, windows and state of each round, giveaways and rules'],
                [<C>/api/history?address=0x...</C>, 'Payouts received, with amounts, dates, transaction hashes and totals'],
              ]}
            />
            <Code title="Check a wallet">{'curl "https://vibehome.dog/api/status?address=0xYourWallet"'}</Code>
          </>
        ),
      },
      {
        id: 'ready-tx',
        title: 'Ready transactions',
        body: (
          <>
            <p>Endpoints return transactions in one shape, ready to submit on Base:</p>
            <Code title="Transaction">{'{ "to": "0x...", "data": "0x...", "value": "<wei>", "sender": "<address>|any" }'}</Code>
            <Table
              columns={['sender', 'Who may send it']}
              rows={[
                ['The wallet address', 'Only that wallet'],
                [<C>any</C>, 'Any wallet. The sender pays the gas, and the result goes to the wallet in the request'],
              ]}
            />
            <Callout type="warn">Submit <C>data</C> exactly as returned and never build calldata yourself. It ends with the Vibe Hub Base Builder Code, which must stay in place.</Callout>
          </>
        ),
      },
      {
        id: 'act',
        title: 'Act from the Vibe Agent Wallet',
        body: (
          <>
            <Code title="Request">{`curl -X POST "https://vibehome.dog/api/agent/act" \\
  -H "Authorization: Bearer <agent key>" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"swap","side":"buy","amount":"0.01"}'`}</Code>
            <Table
              columns={['Body', 'Does']}
              rows={[
                [<C>{'{"tx": {...}}'}</C>, 'Sends one ready transaction'],
                [<C>{'{"txs": [...]}'}</C>, <>Sends ready transactions in order, up to <N>5</N></>],
                [<C>{'{"action":"swap","side":"buy","amount":"0.01"}'}</C>, <>Buys $VIBE for <N>0.01 ETH</N> on a route the server builds</>],
                [<C>{'{"action":"swap","side":"sell","amount":"1000000"}'}</C>, <>Sells <N>1,000,000</N> $VIBE for ETH. An optional <C>slippage</C> is in percent: default <N>1</N>, at most <N>5</N></>],
                [<C>{'{"action":"transfer","token":"ETH","to":"0x...","amount":"0.01"}'}</C>, 'Sends ETH, VIBE or USDC'],
                [<C>{'{"action":"mint"}'}</C>, 'Mints one Vibe Club NFT with ETH at the contract price'],
              ]}
            />
            <p>The response gives the wallet and the transaction hashes:</p>
            <Code title="Response">{'{ "from": "<agent wallet>", "hashes": ["0x..."] }'}</Code>
          </>
        ),
      },
      {
        id: 'errors',
        title: 'Errors',
        body: (
          <>
            <p>Errors come as <C>{'{ "error": "..." }'}</C> with a message that can be shown to the user as it is.</p>
            <Table
              columns={['Code', 'Meaning']}
              mono={[0]}
              rows={[
                ['400', 'Bad input, or a transaction built for another wallet'],
                ['401', 'The agent key is missing or was revoked'],
                ['402', 'Not enough ETH for the mint'],
                ['403', 'Refused by a setting or a limit, or the contract is not allowed'],
                ['405', 'Wrong method'],
                ['409', 'A conflict, such as the mint being unavailable for this wallet'],
                ['5xx', 'A temporary error. Retry once'],
              ]}
            />
          </>
        ),
      },
    ],
  },
  {
    slug: 'bankr',
    title: 'Bankr',
    lead: 'Use Vibe Hub through Bankr with its own wallet and no agent key',
    sections: [
      {
        id: 'status',
        title: 'Status',
        body: <p><Badge tone="warn" pill>In progress</Badge> The Bankr route is not live yet. The tile in Agent Zone stays off until it launches.</p>,
      },
      {
        id: 'how',
        title: 'How it will work',
        body: (
          <>
            <Shot name="agents-bankr" alt="The Bankr card with three steps and a sample chat" />
            <Steps>
              <li>Log in to Bankr, which gives you a wallet on Base.</li>
              <li>Install the Vibe skill for your Bankr agent.</li>
              <li>Ask your agent in the chat.</li>
            </Steps>
            <p>Bankr uses the public <To page="agent-api">API</To> and submits ready transactions from its own wallet. It needs no agent key and no Vibe Agent Wallet.</p>
          </>
        ),
      },
      {
        id: 'main-wallet',
        title: 'What it can do for your main wallet',
        body: (
          <Table
            columns={['Action', 'For your main wallet from Bankr']}
            rows={[
              ['Rewards from Unlock 3 and Royalty 7 onwards', 'Yes. Tokens go straight to the main wallet'],
              ['Achievements', 'Yes. Badges go straight to the main wallet'],
              ['Older rounds, check-in and staking', 'No. The wallet has to send these itself'],
            ]}
          />
        ),
      },
    ],
  },
];
