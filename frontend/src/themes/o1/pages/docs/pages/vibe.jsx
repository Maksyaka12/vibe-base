import ContractsPage from '../../ContractsPage';
import { C, Callout, Ext, N, ShareBar, Shot, Table, To, Ui } from '../kit';
import { LAUNCH, VIBE_POOL, VibeMetrics } from '../VibeMarket';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';

export const vibe = [
  {
    slug: 'vibe-token',
    title: 'About $VIBE',
    lead: '$VIBE is the native token of Vibe Hub: a fixed-supply token on Base, fair launched on o1 Launchpad with permanently locked liquidity and no team allocation',
    sections: [
      {
        id: 'at-a-glance',
        title: 'At a glance',
        body: (
          <>
            <Table
              columns={['', 'Value']}
              rows={[
                ['Token', '$VIBE'],
                ['Network', <>Base (chain ID <N>8453</N>)</>],
                ['Contract', <N>{CA}</N>],
                ['Launched', <N>{LAUNCH.label}</N>],
                ['Launchpad', 'o1 Launchpad (o1 Exchange)'],
                ['Market', '$VIBE/ETH, Uniswap v4 pool'],
                ['Liquidity', 'Permanently locked by the launch contracts'],
                ['Maximum supply', <><N>1,000,000,000</N> $VIBE, no mint function</>],
                ['Team allocation', 'None'],
                ['Presale or private round', 'None'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'native-token',
        title: 'The native token of Vibe Hub',
        body: (
          <>
            <p>
              $VIBE is the native token of Vibe Hub, and the whole app is built around it. Every reward is paid in $VIBE, holder rewards and staking ask you to hold or
              stake it, and all revenue flows back into it through buybacks and burns.
            </p>
            <Table
              columns={['Utility', 'What $VIBE does']}
              rows={[
                [<To page="holder-rewards">Holder rewards</To>, <>Hold <N>5,000,000</N> $VIBE at the snapshot to share a monthly pool of <N>10,000,000</N> $VIBE</>],
                [<To page="vibe-club-royalties">Vibe Club royalties</To>, 'NFT holders receive their royalty pool in $VIBE every 10 days'],
                [<To page="staking">Staking</To>, 'Deposit $VIBE in the official vault of each epoch and earn $VIBE'],
                [<To page="vibe-club-nft">Vibe Club NFT</To>, 'Mint a genesis pass with $VIBE on the site. 80% of mint proceeds are swapped to $VIBE and burned'],
                [<To page="swap">Swap</To>, 'Exchange ETH and $VIBE inside the app'],
                [<To page="tokenomics" hash="revenue">Buybacks and burns</To>, 'Creator and protocol revenue buys $VIBE back: part goes to the community pools, part is burned for good'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'key-metrics',
        title: 'Key metrics',
        body: (
          <>
            <p>These numbers load live when you open the page. The history before the last <N>180</N> days is saved with the docs, because the public market API only returns half a year.</p>
            <VibeMetrics />
            <Table
              columns={['Metric', 'How it is counted']}
              rows={[
                ['Market cap', <>Price × <N>1,000,000,000</N>, the fixed supply. This is the fully diluted value that o1 Exchange and GeckoTerminal show</>],
                ['All-time high', <>The highest market cap ever traded. It was reached on <N>18 Aug 2026, 06:00 UTC</N> during an intraday spike, so it sits above the daily closes on the chart</>],
                ['Total volume', 'All trading volume of the launch pool since the first trade, in ETH and in USD at the time of each trade'],
                ['Liquidity', 'The value held in the launch pool. It can never be withdrawn by anyone'],
              ]}
            />
            <Callout type="note">Market data comes from GeckoTerminal and counts the official launch pool only. Treat the USD values as estimates, and check the pool yourself on <Ext href={`https://www.geckoterminal.com/base/pools/${VIBE_POOL}`}>GeckoTerminal</Ext> or <Ext href={`https://dexscreener.com/base/${VIBE_POOL}`}>Dexscreener</Ext>.</Callout>
          </>
        ),
      },
      {
        id: 'o1-launchpad',
        title: 'How the o1 Launchpad works',
        body: (
          <>
            <p>
              <Ext href="https://docs.o1.exchange/launchpad/introduction">o1 Launchpad</Ext> is the token launch platform of o1 Exchange. It creates a token and its market in one
              transaction, with rules that are written into the launch contracts and cannot be changed afterwards.
            </p>
            <Table
              columns={['Rule', 'What it means for $VIBE']}
              rows={[
                ['Fixed supply', <>Exactly <N>1,000,000,000</N> $VIBE were created at launch. The contract has no mint authority, so the supply can only go down through burns</>],
                ['Token-only liquidity', 'The market opened with tokens on one side and no ETH deposited by the creator. The price was discovered by the first buyers, not set by a raise'],
                ['Permanent lock', 'The pool position belongs to the launch hook. There is no LP token, no withdrawal function and no admin recovery path, so the liquidity can never be pulled'],
                ['Live from the first block', 'Trading opened the moment the token was created. There was no whitelist and no early access'],
              ]}
            />
            <p>Of the supply, <N>900,000,000</N> $VIBE opened the public market and <N>100,000,000</N> $VIBE vest for holder rewards in monthly unlocks. <To page="tokenomics" hash="supply">See the supply</To>.</p>
          </>
        ),
      },
      {
        id: 'no-team-allocation',
        title: 'No team allocation',
        body: (
          <>
            <p>The team received no tokens at launch: no allocation, no presale, no private round and no tokens reserved for insiders. Anyone who holds $VIBE bought it on the open market or earned it through Vibe Hub rewards.</p>
            <ShareBar parts={[{ label: 'Public market at launch', value: 90, strong: true }, { label: 'Vesting for holder rewards', value: 10 }, { label: 'Team', value: 0 }]} />
            <Callout type="tip">The <N>10%</N> team share in the <To page="tokenomics" hash="rewards-economy">rewards economy</To> is a share of bought-back tokens for building the ecosystem. It is not a token allocation.</Callout>
          </>
        ),
      },
      {
        id: 'creator-revenue',
        title: 'Creator revenue',
        body: (
          <>
            <p>
              Every swap in an o1 Launchpad pool pays a trading fee in ETH, and part of it goes to the token creator. This creator revenue is the only income that $VIBE
              produces for the project. The team does not sell tokens, because it never had any.
            </p>
            <p>The creator revenue is not kept as profit. It funds the buyback program, and every buyback is split:</p>
            <ShareBar parts={[{ label: 'Community allocation', value: 70, strong: true }, { label: 'Permanent burn', value: 30 }]} />
            <p>More trading means more buybacks, more burned $VIBE and bigger reward pools. <To page="tokenomics" hash="revenue">See how the revenue is used</To>.</p>
          </>
        ),
      },
      {
        id: 'trade-and-track',
        title: 'Where to trade and track',
        body: (
          <Table
            columns={['Place', 'What you can do']}
            rows={[
              [<To page="swap">Vibe Hub swap</To>, 'Swap ETH and $VIBE inside the app'],
              [<Ext href={`https://launch.o1.exchange/token/${CA}?chain=8453`}>o1 Exchange</Ext>, 'Trade on the launch pool, see holders and stake in official vaults'],
              [<Ext href={`https://dexscreener.com/base/${VIBE_POOL}`}>Dexscreener</Ext>, 'Charts, trades and pool data'],
              [<Ext href={`https://www.geckoterminal.com/base/pools/${VIBE_POOL}`}>GeckoTerminal</Ext>, 'Charts, trades and pool data'],
              [<Ext href={`https://basescan.org/token/${CA}`}>BaseScan</Ext>, 'The token contract, transfers and burns'],
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: 'tokenomics',
    title: 'Tokenomics',
    lead: 'Supply, vesting, buybacks and burns of $VIBE, and how revenue flows into rewards',
    sections: [
      {
        id: 'supply',
        title: 'Supply',
        body: (
          <>
            <Shot name="tokenomics-supply" alt="Tiles: total supply, circulating supply, vesting rewards and monthly unlock" caption="The Tokenomics page shows these numbers live. The ones in this picture are from the day it was taken." />
            <Table
              columns={['', 'Value']}
              mono={[1]}
              rows={[
                ['Maximum supply', '1,000,000,000 $VIBE'],
                ['Fair launch liquidity', '900,000,000 $VIBE'],
                ['Vesting for holder rewards', '100,000,000 $VIBE'],
                ['Monthly unlock', '10,000,000 $VIBE'],
              ]}
            />
            <p>Total supply is the maximum minus everything burned. Circulating supply is the fair launch amount, plus the unlocks so far, minus everything burned. Burned tokens are read live from the burn address.</p>
          </>
        ),
      },
      {
        id: 'revenue',
        title: 'Revenue economy',
        body: (
          <>
            <p>Creator and protocol revenue goes toward buying back $VIBE. Each buyback is split:</p>
            <ShareBar parts={[{ label: 'Community allocation', value: 70, strong: true }, { label: 'Permanent burn', value: 30 }]} />
            <Shot name="tokenomics-buyback" alt="Buyback program mechanics and its split" />
            <p>Buybacks, burns and the community pool run through one public address: <C>0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf</C>. Anyone can <Ext href="https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01?a=0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions">check its transactions on BaseScan</Ext>.</p>
          </>
        ),
      },
      {
        id: 'rewards-economy',
        title: 'Rewards economy',
        body: (
          <>
            <p>The <N>70%</N> community allocation is divided as follows, and distribution across the pools happens every <N>10</N> days:</p>
            <ShareBar parts={[
              { label: 'Reserve buffer', value: 60 },
              { label: '$VIBE staking', value: 15, strong: true },
              { label: 'Vibe Club NFTs', value: 15, strong: true },
              { label: 'Team', value: 10 },
            ]} />
            <Table
              columns={['Pool', 'Share', 'Purpose']}
              mono={[1]}
              rows={[
                ['Reserve buffer', '60%', 'Treasury buffer for long-term reward stability'],
                [<To page="staking">$VIBE staking</To>, '15%', 'Yield for staking in verified vaults on o1 Exchange'],
                [<To page="vibe-club-royalties">Vibe Club NFTs</To>, '15%', 'Royalties for holders of the 333 genesis passes'],
                ['Team', '10%', 'Rewards for building and growing the ecosystem'],
              ]}
            />
            <Shot name="tokenomics-rewards" alt="Distribution breakdown of the community pool" />
          </>
        ),
      },
      {
        id: 'mint-economy',
        title: 'Vibe Club economy',
        body: (
          <>
            <ShareBar parts={[{ label: 'Swapped to $VIBE and burned', value: 80, strong: true }, { label: 'Community rewards pool', value: 20 }]} />
            <Shot name="tokenomics-mint" alt="Mint proceeds allocation" />
          </>
        ),
      },
      {
        id: 'vesting',
        title: 'Vesting and unlock schedule',
        body: (
          <>
            <p><N>100,000,000</N> $VIBE vest for holders in <N>10</N> monthly unlocks of <N>10,000,000</N> $VIBE each. The rules are on <To page="holder-rewards">Holder rewards</To>, and that page has the live schedule with exact times.</p>
            <Shot name="tokenomics-vesting" alt="Holder rewards distribution rules and the 10-month schedule" />
          </>
        ),
      },
      {
        id: 'live',
        title: 'See the live numbers',
        body: <p>Open <Ui>$VIBE docs</Ui> → <Ext href="https://vibehome.dog/tokenomics">Tokenomics</Ext> in the menu.</p>,
      },
    ],
  },
  {
    slug: 'addresses',
    title: 'Official addresses',
    lead: 'Verified contracts and protocol addresses on Base',
    sections: [
      {
        id: 'list',
        title: 'Addresses',
        body: (
          <>
            <ContractsPage />
            <Callout type="warn">Before you approve anything, compare the address in your wallet with this list. The only official site is vibehome.dog.</Callout>
          </>
        ),
      },
      {
        id: 'third-party',
        title: 'Third-party contracts',
        body: (
          <Table
            columns={['Contract', 'Address']}
            mono={[1]}
            rows={[
              ['o1 Exchange staking', '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4'],
            ]}
          />
        ),
      },
      {
        id: 'versions',
        title: 'Why two sets of distributors',
        body: <p>The first distributors keep their finished rounds, and every round since <N>Unlock 3</N> and <N>Royalty 7</N> uses the v2 contracts. <To page="how-rewards-work" hash="contract-versions">Read what changed</To>.</p>,
      },
    ],
  },
];
