import { Callout, C, H3, N, Shot, ShotRow, Steps, Table, To, Ui } from '../kit';

const badge = (file, name) => <img className="o1-docs-thumb" src={encodeURI(`/achievements/${file}.jfif`)} alt={name} loading="lazy" />;

export const profile = [
  {
    slug: 'profile',
    title: 'Profile',
    lead: 'Your identity card, reward totals, daily check-in and achievements on one page',
    sections: [
      {
        id: 'identity',
        title: 'Identity card',
        body: (
          <>
            <p>The card shows the Vibe Club NFT of the active wallet with its name and number, and a <Ui>Vibe Club member</Ui> badge. A wallet without an NFT shows <Ui>Non-member</Ui> and a link to the <To page="vibe-club-nft">mint</To>.</p>
            <Shot name="profile-top" alt="The Profile page with the identity card, the reward dashboard and the daily check-in" caption="The top of the Profile page." />
          </>
        ),
      },
      {
        id: 'dashboard',
        title: 'Reward dashboard',
        body: (
          <>
            <Shot name="profile-dashboard" alt="Four tiles: total claimed, staking rewards, available now and expired claims" />
            <Table
              columns={['Tile', 'What it shows']}
              rows={[
                ['Total claimed', 'Holder rewards and royalties claimed by this wallet, and the number of claims'],
                ['Staking rewards', 'Staking rewards collected, and the number of epochs joined'],
                ['Available now', <>What you can claim right now. When it is above zero, the tile opens the <To page="claim-portal">Claim Portal</To></>],
                ['Expired claims', 'Allocations you did not claim before their window closed'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'sections',
        title: 'More on this page',
        body: (
          <ul>
            <li><To page="check-in">Daily check-in</To></li>
            <li><To page="achievements">Achievements</To></li>
          </ul>
        ),
      },
    ],
  },
  {
    slug: 'check-in',
    title: 'Daily check-in',
    lead: 'One onchain check-in per UTC day builds your streak and unlocks achievements',
    sections: [
      {
        id: 'how-to',
        title: 'How to check in',
        body: (
          <>
            <Steps>
              <li>Open <To page="profile">Profile</To> with the wallet you want to keep the streak on.</li>
              <li>Press <Ui>Check in</Ui> and confirm the transaction.</li>
              <li>The button turns into <Ui>Checked in</Ui> once the contract confirms it, and a timer counts down to the next day.</li>
            </Steps>
            <ShotRow>
              <Shot name="checkin-ready" alt="The check-in card with the Check in button" caption="Ready to check in" />
              <Shot name="checkin-done" alt="The check-in card after checking in, with the time until the next one" caption="Checked in for today" />
            </ShotRow>
            <p>A check-in is a transaction on Base, so it needs a little ETH for gas in that wallet.</p>
          </>
        ),
      },
      {
        id: 'streak-rules',
        title: 'Streak rules',
        body: (
          <>
            <Table
              columns={['Situation', 'What happens']}
              rows={[
                ['You check in on the next UTC day', 'Your streak grows by one'],
                ['You skip a whole UTC day', 'Your next check-in restarts the streak at 1'],
                ['You try again the same UTC day', 'The contract refuses it. Wait for the next day'],
              ]}
            />
            <Callout type="warn">
              <strong>Days are counted in UTC, not in 24-hour periods.</strong> The new day starts at <N>00:00 UTC</N>. You can check in late one UTC day and early the next, and that still counts as two days in a row. The timer on the card shows the time to the next one.
            </Callout>
            <p>The contract also keeps your <strong>longest streak</strong>. Achievements use it, so <To page="achievements">a badge you have earned</To> stays claimable even if your current streak breaks.</p>
          </>
        ),
      },
      {
        id: 'per-wallet',
        title: 'Streaks belong to one wallet',
        body: (
          <p>
            The main wallet and the agent wallet each have their own streak. The flame in the header shows the streak of the active wallet. To keep a streak without opening the app, <To page="agent-zone">ask your agent</To> to do the check-in. It does so from the Vibe Agent Wallet, so that is the wallet whose streak grows.
          </p>
        ),
      },
      {
        id: 'contract',
        title: 'Contract',
        body: <p>Daily check-in and streak contract on Base: <C>0x1938BA215ef556e51eE6AaF909e0970AE0167634</C></p>,
      },
    ],
  },
  {
    slug: 'achievements',
    title: 'Achievements',
    lead: 'Soulbound badges for your streak and your staking, checked by the contract',
    sections: [
      {
        id: 'overview',
        title: 'The board',
        body: (
          <>
            <p>The board at the bottom of <To page="profile">Profile</To> has three groups and a progress bar. Press the small info icon on any tile to read its condition.</p>
            <Shot name="achievements-board" alt="The achievements board with Rewards eligibility, Active dog and Dog staker groups" caption="Unlocked tiles are in full colour, locked ones have a lock, and earned ones show Claim SBT." />
            <Shot name="achievement-info" alt="An achievement with its info popover open, showing its condition" caption="The info icon explains the condition." />
          </>
        ),
      },
      {
        id: 'states',
        title: 'Tile states',
        body: (
          <Table
            columns={['State', 'Meaning']}
            rows={[
              ['Locked', 'The condition is not met yet'],
              [<Ui>Claim SBT</Ui>, 'You have earned it. Press the button and confirm a transaction to receive the badge'],
              ['Unlocked', 'The badge is in this wallet'],
            ]}
          />
        ),
      },
      {
        id: 'eligibility',
        title: 'Rewards eligibility',
        body: (
          <>
            <p>These two tiles show your live status for the reward programs. They are not tokens, so there is nothing to claim, and they lock again if you no longer meet the condition.</p>
            <Table
              columns={['', 'Name', 'Condition']}
              rows={[
                [badge('holder', 'Eligible holder'), 'Eligible holder', <>Hold at least <N>5,000,000</N> $VIBE in the active wallet</>],
                [badge('nft-holder', 'Vibe Club member'), 'Vibe Club member', <>Hold at least <N>1</N> Vibe Club NFT in the active wallet</>],
              ]}
            />
          </>
        ),
      },
      {
        id: 'active-dog',
        title: 'Active dog',
        body: (
          <>
            <p>Earned with your <To page="check-in">longest check-in streak</To>. Once you reach it, the badge stays claimable even if the streak breaks later.</p>
            <Table
              columns={['', 'Name', 'Longest streak', 'ID']}
              mono={[2, 3]}
              rows={[
                [badge('STARTER DOG', 'Starter dog'), 'Starter dog', '7 days', '1'],
                [badge('LOYAL DOG', 'Loyal dog'), 'Loyal dog', '14 days', '2'],
                [badge('ULTRA-ACTIVE DOG', 'Ultra-active dog'), 'Ultra-active dog', '30 days', '3'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'dog-staker',
        title: 'Dog staker',
        body: (
          <>
            <p>Earned by <To page="staking">staking</To> in the official vaults.</p>
            <Table
              columns={['', 'Name', 'Condition', 'ID']}
              mono={[3]}
              rows={[
                [badge('NOVICE STAKER', 'Novice staker'), 'Novice staker', <>Deposit into <N>1</N> official vault</>, <N>4</N>],
                [badge('CONFIDENT BANKER', 'Confident banker'), 'Confident banker', <>Deposit into <N>3</N> official vaults</>, <N>5</N>],
                [badge('WOLF OF WALL ST', 'Wolf of Wall St'), 'Wolf of Wall St', <>Deposit into <N>5</N> official vaults</>, <N>6</N>],
                [badge('RICH DOG', 'Rich dog'), 'Rich dog', <>Have <N>5,000,000</N> $VIBE staked in one vault when you claim</>, <N>7</N>],
                [badge('BANK FOUNDER', 'Bank founder'), 'Bank founder', <>Have <N>10,000,000</N> $VIBE staked in one vault when you claim</>, <N>8</N>],
              ]}
            />
            <Callout type="note">
              <strong>Vault count stays, stake does not.</strong> A vault you deposited into keeps counting after you withdraw. Rich dog and Bank founder look at what you have staked at the moment you claim, so claim them while your stake is in the vault.
            </Callout>
          </>
        ),
      },
      {
        id: 'soulbound',
        title: 'What soulbound means',
        body: (
          <>
            <p>The eight claimable badges are tokens in your wallet (ERC-1155), one per wallet. Transfers and approvals are blocked in the contract, so a badge cannot be sold, and it always shows that this wallet earned it.</p>
            <p>The contract reads your streak and your staking from onchain data, so neither the site nor anyone else can claim a badge for a wallet that has not met the condition. The only exception is a badge the project grants by hand for a special case, such as a large deposit made in the past and already withdrawn.</p>
            <H3 id="agents">With an agent</H3>
            <p>Anyone may send the claim for an earned badge, and it always goes to the wallet that earned it. An <To page="agent-zone">agent</To> can claim all your earned badges in one transaction, for its own wallet or, if you ask, for your main wallet.</p>
            <p>Contract: <C>0x1336E381768c98c8A6e79d99Ec065684c41925A5</C></p>
          </>
        ),
      },
    ],
  },
];
