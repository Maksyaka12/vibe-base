import ContractsPage from '../../ContractsPage';
import { C, Callout, Ext, N, ShareBar, Shot, Table, To, Ui } from '../kit';

export const vibe = [
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
