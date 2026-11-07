import { ArrowLeftRight, Award, Bot, CalendarCheck, Coins, Crown, Gift, Wallet } from 'lucide-react';
import { C, Callout, CardGrid, Ext, H3, Shot, ShotRow, Steps, Table, To, Ui } from '../kit';

export const start = [
  {
    slug: '',
    title: 'Introduction',
    lead: 'Vibe Hub is the home of $VIBE on Base: rewards, royalties, staking, swaps, the Vibe Club NFT, and an agent that can do it all for you',
    sections: [
      {
        id: 'what-is-vibe-hub',
        title: 'What Vibe Hub is',
        body: (
          <>
            <p>
              Vibe Hub is a web app at <Ext href="https://vibehome.dog">vibehome.dog</Ext> for everyone who holds or uses <strong>$VIBE</strong>, a token on the
              Base network. It shows when each reward round happens, tells you whether your wallet qualifies, and lets you claim, stake, swap and mint from one place.
            </p>
            <p>
              Everything that moves funds is a transaction on Base that you sign in your own wallet, or that your agent sends from a separate wallet you control.
              Claim windows, achievements and limits on rewards are checked by smart contracts, not only by the website.
            </p>
            <Shot name="app-overview" alt="Vibe Hub Rewards Hub on desktop with the sidebar, the header and a live holder round" caption="The app on desktop: the menu on the left, your wallet status in the header, and the Rewards Hub in the middle." />
          </>
        ),
      },
      {
        id: 'explore',
        title: 'What you can do',
        body: (
          <CardGrid
            items={[
              { page: 'holder-rewards', icon: Gift, title: 'Earn holder rewards', text: 'Hold 5M+ $VIBE at the snapshot and share a 10,000,000 $VIBE monthly pool' },
              { page: 'vibe-club-royalties', icon: Crown, title: 'Earn NFT royalties', text: 'Hold a Vibe Club NFT and share a royalty pool every 10 days' },
              { page: 'staking', icon: Coins, title: 'Stake $VIBE', text: 'Earn from 10-day staking epochs in official vaults on o1 Exchange' },
              { page: 'check-in', icon: CalendarCheck, title: 'Check in daily', text: 'Build an onchain streak, one check-in per UTC day' },
              { page: 'achievements', icon: Award, title: 'Collect achievements', text: 'Claim soulbound badges for your streak and your staking' },
              { page: 'swap', icon: ArrowLeftRight, title: 'Swap', text: 'Exchange ETH and $VIBE at the best of two routing engines' },
              { page: 'wallets', icon: Wallet, title: 'Use two wallets', text: 'Switch between your main wallet and the Vibe Agent Wallet in one tap' },
              { page: 'agent-zone', icon: Bot, title: 'Hand it to an agent', text: 'Let an AI agent check in, claim, stake and swap on request' },
            ]}
          />
        ),
      },
      {
        id: 'key-terms',
        title: 'Key terms',
        body: (
          <>
            <Table
              columns={['Term', 'What it means']}
              rows={[
                ['Round', 'One distribution of rewards: an Unlock for holders, a Royalty for NFT holders, or an Epoch for stakers'],
                ['Snapshot', 'The moment balances are recorded. Only what your wallet holds at that moment counts for the round'],
                ['Claim window', 'The time you can collect your allocation. After it closes the round expires'],
                ['Main wallet', 'The wallet you connected, such as MetaMask or Coinbase Wallet'],
                ['Vibe Agent Wallet', 'A second wallet created for you at login, used by your AI agent and by you when you select it'],
                ['SBT', 'A soulbound token: a badge that stays in your wallet and cannot be transferred'],
              ]}
            />
            <p>The <To page="glossary">glossary</To> has the full list.</p>
          </>
        ),
      },
      {
        id: 'network',
        title: 'Network and token',
        body: (
          <>
            <Table
              columns={['', 'Value']}
              mono={[1]}
              rows={[
                ['Network', 'Base (chain ID 8453)'],
                ['$VIBE token', '0xb200000000000000000000df24ecb8bf51100a01'],
                ['Gas', 'Paid in ETH on Base'],
                ['Time zone of all rounds', 'UTC'],
              ]}
            />
            <p>Every official contract is listed on <To page="addresses">Official addresses</To>.</p>
          </>
        ),
      },
      {
        id: 'about-screenshots',
        title: 'About the screenshots',
        body: (
          <Callout type="note">
            Screenshots in these docs show the real interface with example data. Wallet addresses, balances and allocations in them are made up, and the dates are from the day they were taken. They follow the theme you have selected.
          </Callout>
        ),
      },
    ],
  },
  {
    slug: 'quickstart',
    title: 'Quickstart',
    lead: 'Connect a wallet, check what you qualify for and make your first check-in',
    sections: [
      {
        id: 'before-you-start',
        title: 'Before you start',
        body: (
          <>
            <p>You need a wallet that works with Base, such as MetaMask or Coinbase Wallet, and a little ETH on Base for gas. Reading the schedule, the tokenomics and these docs needs no wallet at all.</p>
            <Callout type="tip">Pages stay readable without a wallet. Public numbers are always visible, and personal ones show <Ui>Connect wallet</Ui> until you log in.</Callout>
          </>
        ),
      },
      {
        id: 'connect',
        title: 'Connect your wallet',
        body: (
          <>
            <Steps>
              <li>Open <Ext href="https://vibehome.dog/hub">vibehome.dog</Ext> and press <Ui>Connect wallet</Ui> in the header.</li>
              <li>Pick your wallet in the window that opens and approve the connection.</li>
              <li>Your balances appear in the header. A second wallet, the <To page="wallets">Vibe Agent Wallet</To>, is created for your account automatically.</li>
            </Steps>
            <Shot name="header-guest" alt="Header before logging in, with the Agent Zone and Connect wallet buttons" caption="Before you log in, the header offers Connect wallet." />
            <Shot name="header-connected" alt="Header after logging in, with the wallet switch, streak, NFT count and $VIBE balance" caption="After you log in: the Main and Agent switch, your streak, your NFT count and your $VIBE balance." />
            <p>Login is by wallet only. There is no email, password or account form to fill in.</p>
          </>
        ),
      },
      {
        id: 'first-steps',
        title: 'Your first five minutes',
        body: (
          <Steps>
            <li><strong>Check your rewards.</strong> Open <To page="rewards-hub">Rewards Hub</To>. The <Ui>Your status</Ui> tile on each campaign says whether this wallet qualifies.</li>
            <li><strong>Claim what is ready.</strong> Open <To page="claim-portal">Claim Portal</To>. If you have an allocation in a live round, a card with a claim button is waiting for you.</li>
            <li><strong>Check in.</strong> Open <To page="profile">Profile</To> and press <Ui>Check in</Ui> to start your <To page="check-in">daily streak</To>.</li>
            <li><strong>Add funds if needed.</strong> Use <To page="swap">Swap</To> to buy $VIBE, or <To page="wallet">Wallet</To> to move funds between your wallets.</li>
            <li><strong>Set up an agent, if you want one.</strong> <To page="agent-zone">Agent Zone</To> walks you through it in four steps.</li>
          </Steps>
        ),
      },
      {
        id: 'older-accounts',
        title: 'Accounts without a connected wallet',
        body: (
          <p>
            Accounts created earlier with email or a social login have only the wallet created for them, which the app shows as <Ui>Vibe Wallet</Ui>. It serves as both main and agent wallet, so the <Ui>Main</Ui> and <Ui>Agent</Ui> switch does not appear for these accounts.
          </p>
        ),
      },
    ],
  },
  {
    slug: 'navigation',
    title: 'Finding your way around',
    lead: 'The menu, the header, the mobile layout and the two themes',
    sections: [
      {
        id: 'sidebar',
        title: 'The menu',
        body: (
          <>
            <p>On desktop the menu sits on the left. Press the panel icon at its top to collapse it to icons; the app remembers your choice on this device. Each group can also fold on its own.</p>
            <Shot name="sidebar" width={220} alt="The sidebar with the Navigation, Tools, $VIBE docs, DEX and Socials groups" caption="The menu groups." />
            <Table
              columns={['Group', 'Items']}
              rows={[
                ['Navigation', <><To page="profile">Profile</To>, <To page="wallet">Wallet</To>, <To page="swap">Swap</To>, <To page="vibe-club-nft">Vibe Club NFT</To>, <To page="rewards-hub">Rewards Hub</To>, <To page="claim-portal">Claim Portal</To></>],
                ['Tools', <To page="skill">Skill</To>],
                ['$VIBE docs', <>These docs, <To page="tokenomics">Tokenomics</To>, <To page="addresses">Official addresses</To></>],
                ['DEX', 'O1 Exchange, Dexscreener, GeckoTerminal (open in a new tab)'],
                ['Socials', 'Telegram channel, Telegram chat, Follow on X'],
              ]}
            />
            <H3 id="wallet-pill">Your wallet at the bottom of the menu</H3>
            <p>
              The wallet pill at the bottom of the menu shows the active wallet. Press it to open <To page="account">Account</To>, <To page="agent-settings">Settings</To> or <Ui>Logout</Ui>. Next to it you can copy the address.
            </p>
            <Shot name="wallet-menu" width={280} alt="The wallet pill menu with Account, Settings and Logout" caption="The wallet pill and its menu." />
          </>
        ),
      },
      {
        id: 'header',
        title: 'The header',
        body: (
          <>
            <Shot name="header-connected" alt="The header with Agent Zone, wallet switch, theme switcher and three status pills" />
            <Table
              columns={['Element', 'What it does']}
              rows={[
                [<Ui>Agent Zone</Ui>, <>Opens the <To page="agent-zone">agent setup</To></>],
                [<><Ui>Main</Ui> / <Ui>Agent</Ui></>, <>Switches the <To page="wallets">active wallet</To> for the whole app</>],
                ['Palette icon', 'Changes the theme (desktop)'],
                ['Flame and a number', <>Your current <To page="check-in">check-in streak</To></>],
                ['Crown and NFT count', <>How many <To page="vibe-club-nft">Vibe Club NFTs</To> the active wallet holds</>],
                ['Logo and a number', 'The $VIBE balance of the active wallet'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'mobile',
        title: 'On your phone',
        body: (
          <>
            <p>
              Below tablet width the menu moves into a drawer, opened with the menu icon at the top left, and a bar appears at the bottom with <Ui>Profile</Ui>, <Ui>Swap</Ui>, <Ui>Rewards Hub</Ui>, <Ui>Claim</Ui> and <Ui>More</Ui>. <Ui>More</Ui> opens the remaining pages and the theme picker.
            </p>
            <ShotRow>
              <Shot name="mobile-hub" alt="Rewards Hub on a phone with the bottom bar" caption="The bottom bar" />
              <Shot name="mobile-menu" alt="The menu drawer on a phone" caption="The menu drawer" />
              <Shot name="mobile-more" alt="The More sheet on a phone" caption="The More sheet" />
            </ShotRow>
          </>
        ),
      },
      {
        id: 'themes',
        title: 'Themes',
        body: (
          <>
            <p>Vibe Hub comes in two themes with the same layout and features:</p>
            <ul>
              <li><strong>O1</strong>: dark, the default.</li>
              <li><strong>Based</strong>: light, in the Base brand colours.</li>
            </ul>
            <p>Change the theme with the palette icon in the header, or in <Ui>More</Ui> on a phone. Your choice is remembered on this device. To share a link in a specific theme, add <C>?theme=o1</C> or <C>?theme=based</C> to the address.</p>
            <Shot name="theme-switcher" width={240} alt="The theme menu with O1 and Based" />
          </>
        ),
      },
    ],
  },
  {
    slug: 'wallets',
    title: 'Main and agent wallets',
    lead: 'Every account has two separate wallets, and you can switch between them anywhere in the app',
    sections: [
      {
        id: 'two-wallets',
        title: 'Two wallets, one account',
        body: (
          <>
            <Table
              columns={['', 'Main wallet', 'Vibe Agent Wallet']}
              rows={[
                ['Where it comes from', 'The wallet you connected', 'Created for you at your first login'],
                ['Who holds the keys', 'You, in your own wallet app', 'Privy, a wallet provider, for you. You can export the key'],
                ['Who signs', 'You, in a wallet pop-up for each transaction', 'You, inside the app. Your agent too, if you enable it'],
                ['Can an agent use it', 'No, never', <>Yes, after you <To page="agent-zone">enable the agent</To></>],
              ]}
            />
            <Callout type="warn">
              <strong>Each wallet is a separate participant.</strong> It has its own balances, streak, reward allocations and achievements. $VIBE or an NFT in one wallet does not count for the other, so keep what you need for a snapshot in the wallet you want rewarded.
            </Callout>
          </>
        ),
      },
      {
        id: 'switching',
        title: 'Switching wallets',
        body: (
          <>
            <p>Press <Ui>Main</Ui> or <Ui>Agent</Ui> in the header. The change is instant and needs no signature. The whole app, including every balance, the streak, the claim cards and the achievements, moves to the selected wallet.</p>
            <ShotRow>
              <Shot name="toggle-main" alt="The wallet switch with Main selected" caption="Main wallet active" />
              <Shot name="toggle-agent" alt="The wallet switch with Agent selected" caption="Agent wallet active" />
            </ShotRow>
            <p>Compare the status pills: they follow the wallet you select. Here the agent wallet has its own streak, no NFT and its own $VIBE balance.</p>
            <Shot name="header-agent" alt="The header with the agent wallet active, showing its streak, NFT count and balance" caption="The same header with the agent wallet active." />
            <H3 id="other-switches">Other places to switch</H3>
            <ul>
              <li><To page="swap">Swap</To> has its own <Ui>Swap with</Ui> switch that also shows the wallet address.</li>
              <li><To page="wallet">Wallet</To> lists both wallets with their USD values. Press one to make it active.</li>
            </ul>
            <Shot name="swap-toggle" width={480} alt="The Swap with switch above the swap form, showing the address of the active wallet" caption="The switch above the swap form." />
            <p>The app remembers the active wallet on this device. Your choice stays local and changes nothing onchain.</p>
          </>
        ),
      },
      {
        id: 'moving-funds',
        title: 'Moving funds between them',
        body: (
          <p>
            On <To page="wallet">Wallet</To>, <Ui>Deposit</Ui> can pull funds from your other wallet, and <Ui>Send</Ui> has a shortcut that fills in your other wallet as the recipient. Both are ordinary transfers on Base, so the sending wallet needs ETH for gas.
          </p>
        ),
      },
      {
        id: 'which-wallet',
        title: 'Which wallet should I use?',
        body: (
          <Table
            columns={['If you want to', 'Use']}
            rows={[
              ['Keep long-term holdings and your NFT', 'Main wallet'],
              ['Act without wallet pop-ups, or let an AI agent act for you', 'Vibe Agent Wallet'],
              ['Receive holder rewards', 'The wallet that holds 5M+ $VIBE at the snapshot'],
              ['Receive royalties', 'The wallet that holds the NFT at the snapshot'],
              ['Keep a streak for achievements', 'One wallet, every day. Streaks do not combine'],
            ]}
          />
        ),
      },
    ],
  },
];
