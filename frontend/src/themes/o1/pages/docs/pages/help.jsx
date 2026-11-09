import { Callout, Ext, Faq, N, Table, To, Ui } from '../kit';

export const help = [
  {
    slug: 'faq',
    title: 'FAQ',
    lead: 'Short answers to the questions people ask most',
    sections: [
      {
        id: 'rewards',
        title: 'Rewards',
        body: (
          <Faq
            items={[
              { q: 'How much $VIBE do I need for holder rewards?', a: <>At least <N>5,000,000</N> $VIBE in one wallet at the snapshot. <To page="holder-rewards">See the rules</To>.</> },
              { q: 'When is the snapshot?', a: <>At <N>00:00 UTC</N> on the round day. The claim opens at <N>14:00 UTC</N> the same day. Dates are in the schedules on <To page="holder-rewards" hash="schedule">Holder rewards</To> and <To page="vibe-club-royalties" hash="schedule">Vibe Club royalties</To>.</> },
              { q: 'How long do I have to claim?', a: <>Holder rewards have a <N>30</N>-day claim window and Vibe Club royalties a <N>10</N>-day one. The window closes at <N>00:00 UTC</N> on the day of the next snapshot of that program, and the countdown is on the claim card. Staking rewards have no deadline.</> },
              { q: 'What happens to unclaimed rewards?', a: <>Unclaimed holder rewards and Vibe Club royalties are permanently burned after the claim deadline. <To page="how-rewards-work" hash="expired">Read more</To>.</> },
              { q: 'Does staked $VIBE count for holder rewards?', a: 'No. Only $VIBE held directly in the wallet counts at the snapshot.' },
              { q: 'Do two NFTs give me twice the royalties?', a: 'No. The pool is split equally per wallet, not per NFT.' },
              { q: 'Can I add my main and agent wallet balances together?', a: 'No. Each wallet qualifies on its own.' },
            ]}
          />
        ),
      },
      {
        id: 'wallets',
        title: 'Wallets',
        body: (
          <Faq
            items={[
              { q: 'Why do I have two wallets?', a: <>The main wallet is the one you connected. The Vibe Agent Wallet is a separate one, so an agent can act without ever touching your main wallet. <To page="wallets">Read more</To>.</> },
              { q: 'Do I have to use the agent wallet?', a: 'No. You can ignore it and use only your main wallet.' },
              { q: 'Why did my balance and streak change?', a: <>The app is probably showing your other wallet. <To page="wallets" hash="switching">Check the switch in the header</To>.</> },
              { q: 'Can I take my funds out of the agent wallet?', a: <>Yes, at any time with <Ui>Send</Ui> on the <To page="wallet">Wallet</To> page. You can also <To page="account" hash="export-key">export its key</To>.</> },
            ]}
          />
        ),
      },
      {
        id: 'agents',
        title: 'Agents',
        body: (
          <Faq
            items={[
              { q: 'Can my agent spend from my main wallet?', a: 'No. It works only from the Vibe Agent Wallet. It can send claims for your main wallet, and those only bring tokens in.' },
              { q: 'What if my agent key leaks?', a: <>Press <Ui>New key</Ui> and the old key stops working at once. The leaked key could only act within your settings. <To page="agent-zone" hash="agent-key">Read more</To>.</> },
              { q: 'Which AI apps work?', a: <>Chat apps can read and plan. To act, the agent has to make web requests, as Claude Code, Cursor, Codex and OpenClaw can. <To page="agent-zone" hash="setup">See the setup</To>.</> },
              { q: 'Who pays for gas?', a: 'The agent wallet, in ETH. Keep a little ETH in it.' },
            ]}
          />
        ),
      },
      {
        id: 'vibe-club',
        title: 'Vibe Club',
        body: (
          <Faq
            items={[
              { q: 'How many NFTs can I mint?', a: <><N>1</N> per wallet, out of <N>333</N> in total.</> },
              { q: 'Can I buy one instead of minting?', a: <>Yes, on <Ext href="https://opensea.io/collection/vibeclubnft">OpenSea</Ext>. It earns royalties the same way as long as it is in your wallet at the snapshot.</> },
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    lead: 'What to check when something does not work as expected',
    sections: [
      {
        id: 'first-check',
        title: 'Check these first',
        body: (
          <ol>
            <li><strong>Which wallet is active?</strong> Most surprises come from <To page="wallets" hash="switching">looking at the other wallet</To>.</li>
            <li><strong>Does the wallet have ETH on Base?</strong> Every transaction needs gas.</li>
            <li><strong>What time is it in UTC?</strong> Snapshots, claim windows and check-in days all run on UTC.</li>
          </ol>
        ),
      },
      {
        id: 'problems',
        title: 'Common problems',
        body: (
          <Table
            columns={['What you see', 'Why', 'What to do']}
            rows={[
              ['No pending claims, but I expected one', 'A different wallet is active, the wallet was not in the snapshot, or the claim has not opened yet', <>Switch wallet, and check the round in the <To page="rewards-hub">Rewards Hub</To></>],
              ['Claim was cancelled or failed', 'You rejected it in the wallet, or the transaction failed', 'Check your ETH for gas and try again while the window is open'],
              ['Not eligible, though I hold enough', 'After the snapshot, what you held at the snapshot counts, not what you hold now', 'Hold the required amount before the next snapshot'],
              ['My streak restarted at 1', 'A whole UTC day passed with no check-in', <>Your longest streak is kept for <To page="achievements" hash="active-dog">achievements</To></>],
              ['Check in is unavailable', 'This wallet has already checked in this UTC day', <>Wait for <N>00:00 UTC</N></>],
              ['The swap reverted', 'The price moved more than your slippage. Nothing was swapped', 'Try again, or raise the slippage a little'],
              ['No route for the swap', 'Neither engine found a route for this amount', 'Try another amount'],
              ['I cannot see the Main and Agent switch', 'Your account has only one wallet', <><To page="quickstart" hash="older-accounts">Read about these accounts</To></>],
              ['A badge shows Locked, though I staked', 'Your deposit may not be in an official vault, or your stake is below the threshold now', <>Check the <To page="achievements" hash="dog-staker">conditions</To></>],
              ['My agent says a setting is off (403)', 'That ability is off, or the daily limit is reached', <>Check <To page="agent-settings">Settings</To></>],
              ['My agent says the key is invalid (401)', 'The key was replaced or revoked', <>Create a <To page="agent-zone" hash="agent-key">new key</To> and give it to your agent</>],
            ]}
          />
        ),
      },
      {
        id: 'tx-states',
        title: 'How a transaction goes',
        body: (
          <>
            <p>Each action in the app goes through the same steps: waiting for your wallet, then a spinner while it is pending, then either a success message with a BaseScan link or a short error.</p>
            <p>If a wallet does not report a transaction hash, the app confirms the result by reading the contract. The page may take a little longer to update, so check your wallet's activity before you try again.</p>
          </>
        ),
      },
      {
        id: 'security',
        title: 'Staying safe',
        body: (
          <>
            <Callout type="danger">
              Nobody from Vibe Hub will ever ask for your seed phrase or private key. Use only vibehome.dog and the links in its menu, and compare contract addresses with <To page="addresses">Official addresses</To> before you approve anything.
            </Callout>
            <p>
              Found a vulnerability? Please report it privately to <Ext href="https://x.com/mksvibe">@mksvibe on X</Ext> or <Ext href="https://t.me/mksvibe_base">@mksvibe_base on Telegram</Ext>, and do not share the details publicly until it is fixed.
            </p>
          </>
        ),
      },
      {
        id: 'support',
        title: 'Still stuck?',
        body: <p>Ask in the <Ext href="https://t.me/vibe_b20_chat">Telegram chat</Ext>, and follow news in the <Ext href="https://t.me/vibe_b20">Telegram channel</Ext> and on <Ext href="https://x.com/vibeb20">X</Ext>.</p>,
      },
    ],
  },
  {
    slug: 'glossary',
    title: 'Glossary',
    lead: 'The terms used in Vibe Hub and in these docs',
    sections: [
      {
        id: 'terms',
        body: (
          <Table
            columns={['Term', 'Meaning']}
            rows={[
              ['$VIBE', 'The native token of Vibe Hub on Base. Rewards, royalties and staking pay out in it'],
              ['Active wallet', 'The wallet the app is showing and acting with, chosen with the Main and Agent switch'],
              ['Agent key', 'A secret that lets your AI agent ask Vibe Hub to act from the Vibe Agent Wallet. Starts with vibe_agent_'],
              ['Allocation', 'What one wallet can claim from one round'],
              ['APR', 'Annual percentage rate: the yearly yield of a vault at its current rewards and stake'],
              ['Base', 'The Ethereum layer 2 network Vibe Hub runs on (chain ID 8453)'],
              ['Base Builder Code', 'A marker at the end of transactions that attributes them to Vibe Hub on Base'],
              ['BaseScan', 'The block explorer for Base, used to check transactions and contracts'],
              ['Burn', 'Sending tokens to an address nobody controls, which removes them from supply for good'],
              ['Buyback', 'Buying $VIBE on the market with protocol revenue'],
              ['Claim window', 'The time during which an allocation can be claimed'],
              ['Distributor', 'The contract that holds a reward pool and pays out claims'],
              ['Epoch', 'One 10-day staking period with its own vault'],
              ['Gas', 'The network fee for a transaction, paid in ETH on Base'],
              ['Lot', 'One staking deposit, with its own unlock time'],
              ['Main wallet', 'The wallet you connected to log in'],
              ['Merkle proof', 'A short piece of data that proves an allocation belongs to a wallet, checked by the contract'],
              ['o1 Exchange', 'The platform where $VIBE launched and where its staking vaults run'],
              ['Royalty', 'One round of rewards for Vibe Club NFT holders'],
              ['Skill', 'A file that teaches an AI agent how to use Vibe Hub'],
              ['Slippage', 'How far the price may move against you before a swap cancels'],
              ['Snapshot', 'The moment balances and NFT holders are recorded for a round'],
              ['Soulbound (SBT)', 'A token that cannot be transferred from the wallet that received it'],
              ['Streak', 'The number of UTC days in a row a wallet has checked in'],
              ['Unlock', 'One monthly round of holder rewards'],
              ['UTC', 'Coordinated Universal Time, the time zone of all rounds'],
              ['Vault', 'A staking pool on o1 Exchange, one per epoch'],
              ['Vibe Agent Wallet', 'The second wallet of your account, created at login, that your agent acts from'],
              ['Vibe Club', 'The collection of 333 NFT membership passes'],
            ]}
          />
        ),
      },
    ],
  },
];
