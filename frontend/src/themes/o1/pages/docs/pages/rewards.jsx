import { CircleHelp, Gift } from 'lucide-react';
import { StatusPill } from '../../../components/ui';
import { HOLDER_UNLOCKS, O1_STAKING_VAULT, STAKING_EPOCHS, VIBECLUB_EPOCHS } from '../../../../../data/rewardsSchedule';
import { C, Callout, CardGrid, Ext, H3, N, RoundTimeline, Shot, Steps, Table, To, Ui } from '../kit';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const utc = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
const noUtc = (label) => label.replace(' UTC', '');
const noVibe = (pool) => (pool || 'TBA').replace(' $VIBE', '');

function roundStatus(opens, closes, now = new Date()) {
  if (now >= closes) return <StatusPill status="Closed" tone="neutral" />;
  if (now >= opens) return <StatusPill status="Claim open" tone="success" />;
  return <StatusPill status="Upcoming" tone="accent" />;
}

// These tables read the same published schedule as the Rewards Hub, so they stay up to date by themselves.
function RoundTable({ rounds, nameOf, opensOf }) {
  return (
    <>
      <p>All times are UTC, and pools are in $VIBE. The table follows the same schedule as the Rewards Hub.</p>
      <Table
        columns={['Round', 'Snapshot', 'Claim opens', 'Claim closes', 'Pool', 'Status']}
        mono={[1, 2, 3, 4]}
        nowrap={[0]}
        rows={rounds.map((r) => [
          nameOf(r),
          noUtc(r.snapshotTime),
          noUtc(opensOf(r)),
          noUtc(utc(r.nextSnapshotDate)),
          noVibe(r.poolAmount),
          roundStatus(r.dateObj, r.nextSnapshotDate),
        ])}
      />
    </>
  );
}

const HolderSchedule = () => <RoundTable rounds={HOLDER_UNLOCKS} nameOf={(r) => r.unlock} opensOf={(r) => r.unlockDate} />;
const RoyaltySchedule = () => <RoundTable rounds={VIBECLUB_EPOCHS} nameOf={(r) => r.epoch} opensOf={(r) => r.claimDate} />;

function StakingSchedule() {
  const now = new Date();
  return (
    <>
      <p>All times are UTC, and rewards are in $VIBE. Each epoch links to its vault once the vault exists.</p>
      <Table
        columns={['Epoch', 'Starts', 'Ends', 'Rewards', 'Status']}
        mono={[1, 2, 3]}
        nowrap={[0]}
        rows={STAKING_EPOCHS.map((e) => [
          e.vaultId ? <Ext href={e.link}>{e.epoch}</Ext> : e.epoch,
          noUtc(e.startTime),
          noUtc(e.endTime),
          noVibe(e.poolAmount),
          now >= e.endDateObj
            ? <StatusPill status="Ended" tone="neutral" />
            : now >= e.startDateObj
              ? <StatusPill status="Live" tone="success" />
              : <StatusPill status="Upcoming" tone="accent" />,
        ])}
      />
    </>
  );
}

export const rewards = [
  {
    slug: 'how-rewards-work',
    title: 'How rewards work',
    lead: 'The four reward programs, the life of a round and how a claim is verified',
    sections: [
      {
        id: 'programs',
        title: 'The four programs',
        body: (
          <>
            <Table
              columns={['Program', 'You need', 'How often', 'How it is shared', 'Where you collect']}
              rows={[
                [<To page="holder-rewards">Holder rewards</To>, <><N>5,000,000</N> $VIBE in the wallet at the snapshot</>, 'About every 30 days', 'By balance, up to a cap per wallet', <To page="claim-portal">Claim Portal</To>],
                [<To page="vibe-club-royalties">Vibe Club royalties</To>, <><N>1</N> Vibe Club NFT at the snapshot</>, 'Every 10 days', 'Equally per wallet', <To page="claim-portal">Claim Portal</To>],
                [<To page="staking">Staking</To>, '$VIBE deposited in the official vault', '10-day epochs', 'By stake', 'o1 Exchange'],
                [<To page="giveaways">Giveaways</To>, 'The rules of each event', 'Occasional', 'To the winners', 'Sent directly'],
              ]}
            />
            <p>The <To page="rewards-hub">Rewards Hub</To> shows the schedule and your status for all of them.</p>
          </>
        ),
      },
      {
        id: 'round-life',
        title: 'The life of a round',
        body: (
          <>
            <p>Holder rewards and Vibe Club royalties follow the same three moments, always in UTC:</p>
            <RoundTimeline />
            <Table
              columns={['Program', 'Claim window']}
              mono={[1]}
              rows={[
                ['Holder rewards', '30 days'],
                ['Vibe Club royalties', '10 days'],
              ]}
            />
            <Callout type="warn">
              <strong>Be in position before the snapshot.</strong> Buying $VIBE or an NFT after <N>00:00 UTC</N> on the round day does not count for that round. Convert the time to your own time zone so that you do not miss it.
            </Callout>
          </>
        ),
      },
      {
        id: 'expired',
        title: 'If you miss a claim window',
        body: (
          <>
            <p>The contract refuses claims after the window closes, so an expired allocation is gone. It does not carry over to the next round. Your <Ui>Expired claims</Ui> tile counts what you missed.</p>
            <p>Unclaimed holder rewards and Vibe Club royalties are permanently burned after the claim deadline. Staking rewards work differently: they have no deadline.</p>
          </>
        ),
      },
      {
        id: 'verification',
        title: 'How a claim is verified',
        body: (
          <>
            <p>A snapshot reads $VIBE and Vibe Club NFT balances straight from Base at the snapshot block. The allocation of every eligible wallet then goes into a Merkle tree, and its root is stored in the distributor contract. When you claim, the app sends the contract your amount and a short proof that this amount belongs to your wallet. The contract checks:</p>
            <ul>
              <li>that the claim window is open,</li>
              <li>that your wallet has not claimed this round yet,</li>
              <li>that the proof matches the published root,</li>
              <li>that the round's pool is not exceeded.</li>
            </ul>
            <p>Tokens always go to the wallet in the snapshot, whoever sends the transaction. That is what lets an <To page="agent-zone" hash="abilities">agent claim for your main wallet</To> without being able to redirect the reward.</p>
          </>
        ),
      },
    ],
  },
  {
    slug: 'rewards-hub',
    title: 'Rewards Hub',
    lead: 'One screen with the schedule, the pool and your status for every reward program',
    sections: [
      {
        id: 'campaigns',
        title: 'Campaign cards',
        body: (
          <>
            <p>The four cards at the top switch between <Ui>Holders</Ui>, <Ui>Vibe Club</Ui>, <Ui>Staking</Ui> and <Ui>Giveaways</Ui>. The badge on each one gives its state at a glance: <Ui>1 live</Ui>, <Ui>1 upcoming</Ui> or the number of active giveaways.</p>
            <Shot name="hub-campaigns" alt="Four campaign cards: Holders, Vibe Club, Staking and Giveaways" />
          </>
        ),
      },
      {
        id: 'featured',
        title: 'The current round',
        body: (
          <>
            <p>Under the cards you see the round that matters right now. Its tiles show the pool, the requirement and <Ui>Your status</Ui> for the active wallet.</p>
            <Shot name="hub-holders" alt="The featured holder round with a live status, a countdown, pool, requirement and eligibility" caption="A live round. The green countdown shows how long the claim window stays open." />
            <H3 id="before-claim">Before the claim opens</H3>
            <p>Before a claim opens, the card shows two live countdowns: one to the snapshot, then one to the claim. After the snapshot, the first one turns into <Ui>Snapshot taken</Ui>.</p>
            <Shot name="hub-timers" alt="A round after its snapshot, with the claim countdown running" caption="The snapshot is done and the claim opens in a few hours." />
            <H3 id="status-values">What Your status means</H3>
            <Table
              columns={['Status', 'Meaning']}
              rows={[
                [<StatusPill status="Connect wallet" tone="neutral" />, 'Log in to check this wallet'],
                [<StatusPill status="Eligible" tone="success" />, 'Before a snapshot: the wallet meets the requirement now and has to keep it until the snapshot. After a snapshot: the wallet is in it'],
                [<StatusPill status="Not eligible" tone="neutral" />, 'The wallet does not meet the requirement, or is not in the snapshot'],
              ]}
            />
            <Callout type="note">Eligibility is per wallet. If the status looks wrong, <To page="wallets" hash="switching">check which wallet is active</To>.</Callout>
          </>
        ),
      },
      {
        id: 'schedule',
        title: 'Upcoming and previous rounds',
        body: (
          <>
            <p>Below the current round, tables list upcoming rounds and previous ones with the newest first. Up to five previous rows show at a time, and the rest scroll inside the card.</p>
            <Shot name="hub-schedule" alt="The upcoming unlocks table with date, allocation and status" />
            <p>Allocations marked <Ui>TBA</Ui> are not announced yet.</p>
          </>
        ),
      },
    ],
  },
  {
    slug: 'holder-rewards',
    title: 'Holder rewards',
    lead: 'A monthly pool of 10,000,000 $VIBE for wallets that hold at least 5,000,000 $VIBE at the snapshot',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: (
          <>
            <Shot name="hub-holders" alt="The Holders tab of the Rewards Hub" />
            <Table
              columns={['Rule', 'Details']}
              rows={[
                ['Requirement', <>At least <N>5,000,000</N> $VIBE held in the wallet itself at the snapshot</>],
                ['Pool', <><N>10,000,000</N> $VIBE per round, from the <To page="tokenomics" hash="vesting">100M vesting schedule</To></>],
                ['Share', 'Proportional to your balance among eligible wallets'],
                ['Cap', <><N>500,000</N> $VIBE per wallet. The excess is shared among the others</>],
                ['Rounds', <><N>10</N> unlocks, about every 30 days</>],
                ['Claim window', <><N>30</N> days. Tokens unclaimed after it are permanently burned</>],
              ]}
            />
          </>
        ),
      },
      {
        id: 'what-counts',
        title: 'What counts as holding',
        body: (
          <>
            <p>Only $VIBE sitting directly in your wallet at the snapshot counts.</p>
            <Callout type="warn"><strong>These do not count:</strong> tokens staked in a vault, tokens in a liquidity pool, or tokens in any other contract. If you stake everything, that wallet does not qualify for holder rewards.</Callout>
            <p>Protocol addresses are excluded from the snapshot: the token contract, the Uniswap pool, the vesting vault, the staking contract, the buyback and community pool address, the reward distributors, and the burn and zero addresses.</p>
          </>
        ),
      },
      {
        id: 'how-to-claim',
        title: 'How to claim',
        body: (
          <Steps>
            <li>Hold <N>5,000,000</N> $VIBE or more in one wallet before the snapshot.</li>
            <li>After the claim opens at <N>14:00 UTC</N>, select that wallet and open <To page="claim-portal">Claim Portal</To>.</li>
            <li>Press <Ui>Claim</Ui> on the holder card and confirm in your wallet.</li>
          </Steps>
        ),
      },
      {
        id: 'schedule',
        title: 'Schedule',
        body: <HolderSchedule />,
      },
    ],
  },
  {
    slug: 'vibe-club-royalties',
    title: 'Vibe Club royalties',
    lead: 'A royalty pool every 10 days, shared equally by the wallets that hold a Vibe Club NFT at the snapshot',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: (
          <>
            <Shot name="hub-royalties" alt="The Vibe Club tab of the Rewards Hub" />
            <Table
              columns={['Rule', 'Details']}
              rows={[
                ['Requirement', <>At least <N>1</N> Vibe Club NFT in the wallet at the snapshot</>],
                ['Share', 'The pool is split equally per eligible wallet'],
                ['Rounds', <>Every <N>10</N> days. Each round's pool is set when it is announced</>],
                ['Funding', <><N>15%</N> of the <To page="tokenomics" hash="rewards-economy">community allocation</To></>],
              ]}
            />
            <Callout type="note"><strong>The split is per wallet, not per NFT.</strong> Holding more NFTs in one wallet does not raise that wallet's share.</Callout>
            <p>Holding is what counts, so an NFT bought on the secondary market qualifies the same way as one you minted. See <To page="vibe-club-nft">Vibe Club NFT</To> for how to get one.</p>
          </>
        ),
      },
      {
        id: 'how-to-claim',
        title: 'How to claim',
        body: (
          <Steps>
            <li>Keep the NFT in your wallet at the snapshot.</li>
            <li>After the claim opens at <N>14:00 UTC</N>, select that wallet and open <To page="claim-portal">Claim Portal</To>.</li>
            <li>Press <Ui>Claim</Ui> on the Vibe Club card and confirm in your wallet.</li>
            <li>Save or <To page="claim-portal" hash="share">share the banner</To> of the round if you like.</li>
          </Steps>
        ),
      },
      {
        id: 'schedule',
        title: 'Schedule',
        body: <RoyaltySchedule />,
      },
    ],
  },
  {
    slug: 'staking',
    title: 'Staking',
    lead: 'Earn $VIBE by depositing it into the official vault of each 10-day epoch on o1 Exchange',
    sections: [
      {
        id: 'how-it-works',
        title: 'How it works',
        body: (
          <>
            <p>Staking runs on <Ext href={O1_STAKING_VAULT}>o1 Exchange</Ext>, and each epoch has its own vault. Rewards are shared in proportion to what stakers have in the vault. Vibe Hub shows the schedule, your position and links to the right vault.</p>
            <Shot name="hub-staking" alt="The Staking tab with the epoch pool, duration, your position and the current APR" caption="Your position shows what the active wallet has staked in this vault and the vault's current APR." />
            <Table
              columns={['Tile', 'What it shows']}
              rows={[
                ['Epoch pool', 'The rewards for this epoch, shared by stakers'],
                ['Duration', <><N>10</N> days per epoch</>],
                ['Your position', 'What the active wallet has staked in this vault, and the live APR of the vault'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'how-to-stake',
        title: 'How to stake',
        body: (
          <>
            <Steps>
              <li>Open the <Ui>Staking</Ui> tab of the <To page="rewards-hub">Rewards Hub</To>.</li>
              <li>Press <Ui>Stake on o1 Exchange</Ui>. The link opens the vault of the current epoch.</li>
              <li>Connect the same wallet on o1 Exchange, enter an amount, and confirm the approval and the deposit.</li>
            </Steps>
            <Callout type="warn">Check the lock and early exit terms on o1 Exchange before you deposit. A deposit counts from the next vault epoch, and each deposit is a lot with its own unlock time.</Callout>
          </>
        ),
      },
      {
        id: 'withdraw',
        title: 'Claiming rewards and withdrawing',
        body: (
          <>
            <p>After an epoch ends, find it under <Ui>Previous staking epochs</Ui> and press <Ui>Withdraw &amp; claim</Ui> to open its vault on o1 Exchange.</p>
            <p>Staking rewards <strong>have no deadline</strong>: you can claim them at any time after the vault epoch ends, unlike holder rewards and royalties.</p>
            <Callout type="note">Each epoch has its own vault, so a stake does not move on by itself. To keep staking in the next epoch, deposit into its vault.</Callout>
          </>
        ),
      },
      {
        id: 'side-effects',
        title: 'How staking affects other rewards',
        body: (
          <ul>
            <li><strong>Holder rewards:</strong> staked tokens do not count at the snapshot. <To page="holder-rewards" hash="what-counts">See the rules</To>.</li>
            <li><strong>Achievements:</strong> deposits earn the <To page="achievements" hash="dog-staker">Dog staker badges</To>.</li>
            <li><strong>Profile:</strong> staking rewards and the epochs you joined show in your <To page="profile" hash="dashboard">reward dashboard</To>.</li>
          </ul>
        ),
      },
      {
        id: 'schedule',
        title: 'Schedule',
        body: (
          <>
            <StakingSchedule />
            <p>The official staking contract is <C>0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4</C>. Use the vault links from Vibe Hub.</p>
          </>
        ),
      },
    ],
  },
  {
    slug: 'giveaways',
    title: 'Giveaways',
    lead: 'Community events with prizes sent directly to the winners',
    sections: [
      {
        id: 'how-it-works',
        title: 'How giveaways work',
        body: (
          <>
            <p>The <Ui>Giveaways</Ui> tab of the <To page="rewards-hub">Rewards Hub</To> lists active events and past ones. Each active event shows its prize pool, its distribution status and the number of winners. <Ui>Participate</Ui> opens the announcement with the rules of that event.</p>
            <Shot name="hub-giveaways" alt="The Giveaways tab with active events and their prize pools, distribution status and winners" />
            <p>Winners do not claim anything in the app: prizes go directly to them.</p>
          </>
        ),
      },
      {
        id: 'statuses',
        title: 'Distribution status',
        body: (
          <Table
            columns={['Status', 'Meaning']}
            rows={[
              ['Not started', 'The event is running or the prizes are not sent yet'],
              ['In progress', 'Prizes are being sent, sometimes with the percentage done'],
              ['Completed', 'All the prizes were sent'],
            ]}
          />
        ),
      },
      {
        id: 'safety',
        title: 'Stay safe',
        body: <Callout type="danger">A genuine giveaway never asks for your private key, your seed phrase or a payment to receive a prize. Follow announcements only from the channels linked in the app's menu.</Callout>,
      },
    ],
  },
  {
    slug: 'claim-portal',
    title: 'Claim Portal',
    lead: 'Your allocations, upcoming distributions and the history of everything you claimed',
    sections: [
      {
        id: 'stats',
        title: 'Your totals',
        body: (
          <>
            <Shot name="claim-stats" alt="Three tiles: total claimable, claimed so far and expired claims" />
            <Table
              columns={['Tile', 'What it shows']}
              rows={[
                ['Total claimable', 'What the active wallet can claim right now'],
                ['Claimed so far', 'The total of its completed payouts'],
                ['Expired claims', 'Allocations it had but did not claim in time'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'available',
        title: 'Available to claim',
        body: (
          <>
            <p>If the active wallet has an allocation in an open round, a card shows the amount, the time left and a claim button.</p>
            <Shot name="claim-available" alt="A claim card with the allocation, the time left in the window and the claim button" />
            <Steps>
              <li>Press <Ui>Claim</Ui> and confirm in your wallet. The button shows <Ui>Claiming on Base...</Ui>.</li>
              <li>The app waits until the contract confirms the claim. Only then does the card disappear and the payout appear in your history.</li>
              <li>After a Vibe Club royalty, a window offers the banner of the round.</li>
            </Steps>
            <Callout type="note">If you reject in your wallet or the transaction fails, <Ui>Claim was cancelled or failed</Ui> appears under the button. Nothing was claimed, and you can try again while the window is open.</Callout>
            <H3 id="nothing-to-claim">When there is nothing to claim</H3>
            <p>You see <Ui>No pending claims</Ui>. Check that the right wallet is active: an allocation belongs to the wallet that qualified at the snapshot.</p>
            <Shot name="claim-empty" alt="The empty state: No pending claims" />
          </>
        ),
      },
      {
        id: 'upcoming',
        title: 'Upcoming distributions',
        body: (
          <>
            <p>Two cards show the next holder round and the next royalty round: the pool, the snapshot countdown and the requirement.</p>
            <Shot name="claim-upcoming" alt="Cards for the next holder round and the next royalty round" />
            <Table
              columns={['The card shows', 'Meaning']}
              rows={[
                [<Ui>Eligible</Ui>, 'The active wallet meets the requirement right now'],
                [<Ui>Buy $VIBE before snapshot</Ui>, <>The wallet has less than <N>5,000,000</N> $VIBE. The button opens Swap</>],
                [<Ui>Mint NFT before snapshot</Ui>, 'The wallet has no Vibe Club NFT. The button opens the mint'],
                [<Ui>Claim in 05h 12m 30s</Ui>, 'The snapshot is done and the claim is about to open'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'history',
        title: 'Claim history',
        body: (
          <>
            <p>Every payout to this wallet from holder rewards, royalties and staking is listed with its amount, its date and a <Ui>BaseScan</Ui> link to the transaction.</p>
            <Shot name="claim-history" alt="The claim history with amounts, dates, Share and BaseScan buttons" />
          </>
        ),
      },
      {
        id: 'share',
        title: 'Share your royalty',
        body: (
          <>
            <p>Each royalty round has its own banner. It appears after you claim, and <Ui>Share</Ui> in your history brings it back. Press <Ui>Save image</Ui> to download it or <Ui>Share on 𝕏</Ui> to post about it.</p>
            <Shot name="claim-share" width={440} alt="The Claim successful window with the round banner and the Save image and Share buttons" />
          </>
        ),
      },
      {
        id: 'more',
        title: 'Related',
        body: (
          <CardGrid
            items={[
              { page: 'how-rewards-work', icon: Gift, title: 'How rewards work', text: 'Snapshots, claim windows and how a claim is verified' },
              { page: 'troubleshooting', icon: CircleHelp, title: 'Troubleshooting', text: 'What to do when a claim does not go through' },
            ]}
          />
        ),
      },
    ],
  },
];
