// Reward schedules shared by every theme (src/themes/*).
// Add new staking epochs, royalties, unlocks and giveaways here once.

export const O1_STAKING_VAULT = 'https://launch.o1.exchange/staking/vaults?chain=8453&token=0xb200000000000000000000df24ecb8bf51100a01';

export const O1_STAKING_VAULT_EPOCH_1 = 'https://launch.o1.exchange/staking/vaults/0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663?chain=8453';

export const O1_STAKING_VAULT_EPOCH_2 = 'https://launch.o1.exchange/staking/vaults/0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446?chain=8453';

export const O1_STAKING_VAULT_EPOCH_3 = 'https://launch.o1.exchange/staking/vaults/0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c?chain=8453';

export const O1_STAKING_VAULT_EPOCH_4 = 'https://launch.o1.exchange/staking/vaults/0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9?chain=8453';

export const O1_STAKING_VAULT_EPOCH_5 = 'https://launch.o1.exchange/staking/vaults/0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713?chain=8453';

export const O1_STAKING_VAULT_EPOCH_6 = 'https://launch.o1.exchange/staking/vaults/0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08?chain=8453';

export const STAKING_EPOCHS = [
  {
    epoch: 'Epoch 1',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '21 Aug, 15:00 UTC',
    endTime: '31 Aug, 15:00 UTC',
    startDateObj: new Date('2026-08-21T15:00:00Z'),
    endDateObj: new Date('2026-08-31T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_1
  },
  {
    epoch: 'Epoch 2',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '31 Aug, 16:00 UTC',
    endTime: '10 Sep, 16:00 UTC',
    startDateObj: new Date('2026-08-31T16:00:00Z'),
    endDateObj: new Date('2026-09-10T16:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_2
  },
  {
    epoch: 'Epoch 3',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '10 Sep, 15:00 UTC',
    endTime: '20 Sep, 15:00 UTC',
    startDateObj: new Date('2026-09-10T15:00:00Z'),
    endDateObj: new Date('2026-09-20T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_3
  },
  {
    epoch: 'Epoch 4',
    duration: '10 Days',
    poolAmount: '1,800,000',
    startTime: '20 Sep, 15:00 UTC',
    endTime: '30 Sep, 15:00 UTC',
    startDateObj: new Date('2026-09-20T15:00:00Z'),
    endDateObj: new Date('2026-09-30T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_4
  },
  {
    epoch: 'Epoch 5',
    duration: '10 Days',
    poolAmount: '1,100,000',
    startTime: '30 Sep, 15:00 UTC',
    endTime: '10 Oct, 15:00 UTC',
    startDateObj: new Date('2026-09-30T15:00:00Z'),
    endDateObj: new Date('2026-10-10T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_5
  },
  {
    epoch: 'Epoch 6',
    duration: '10 Days',
    poolAmount: '1,100,000',
    startTime: '10 Oct, 15:00 UTC',
    endTime: '20 Oct, 15:00 UTC',
    startDateObj: new Date('2026-10-10T15:00:00Z'),
    endDateObj: new Date('2026-10-20T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_6
  },
  {
    epoch: 'Epoch 7',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '20 Oct, 15:00 UTC',
    endTime: '30 Oct, 15:00 UTC',
    startDateObj: new Date('2026-10-20T15:00:00Z'),
    endDateObj: new Date('2026-10-30T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 8',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '30 Oct, 15:00 UTC',
    endTime: '09 Nov, 15:00 UTC',
    startDateObj: new Date('2026-10-30T15:00:00Z'),
    endDateObj: new Date('2026-11-09T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 9',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '09 Nov, 15:00 UTC',
    endTime: '19 Nov, 15:00 UTC',
    startDateObj: new Date('2026-11-09T15:00:00Z'),
    endDateObj: new Date('2026-11-19T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 10',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '19 Nov, 15:00 UTC',
    endTime: '29 Nov, 15:00 UTC',
    startDateObj: new Date('2026-11-19T15:00:00Z'),
    endDateObj: new Date('2026-11-29T15:00:00Z'),
    link: O1_STAKING_VAULT
  }
];

export const VIBECLUB_EPOCHS = [
  { epoch: 'Royalty 1', snapshotTime: '28 Aug, 00:00 UTC', claimDate: '28 Aug, 14:00 UTC', snapshotDateObj: new Date('2026-08-28T00:00:00Z'), dateObj: new Date('2026-08-28T14:00:00Z'), nextSnapshotDate: new Date('2026-09-07T00:00:00Z'), poolAmount: '2,500,000 $VIBE' },
  { epoch: 'Royalty 2', snapshotTime: '7 Sep, 00:00 UTC', claimDate: '7 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-07T00:00:00Z'), dateObj: new Date('2026-09-07T14:00:00Z'), nextSnapshotDate: new Date('2026-09-17T00:00:00Z'), poolAmount: '1,900,000 $VIBE' },
  { epoch: 'Royalty 3', snapshotTime: '17 Sep, 00:00 UTC', claimDate: '17 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-17T00:00:00Z'), dateObj: new Date('2026-09-17T14:00:00Z'), nextSnapshotDate: new Date('2026-09-27T00:00:00Z'), poolAmount: '2,000,000 $VIBE' },
  { epoch: 'Royalty 4', snapshotTime: '27 Sep, 00:00 UTC', claimDate: '27 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-27T00:00:00Z'), dateObj: new Date('2026-09-27T14:00:00Z'), nextSnapshotDate: new Date('2026-10-07T00:00:00Z'), poolAmount: '1,100,000 $VIBE' },
  { epoch: 'Royalty 5', snapshotTime: '7 Oct, 00:00 UTC', claimDate: '7 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-07T00:00:00Z'), dateObj: new Date('2026-10-07T14:00:00Z'), nextSnapshotDate: new Date('2026-10-17T00:00:00Z'), poolAmount: '800,000 $VIBE' },
  { epoch: 'Royalty 6', snapshotTime: '17 Oct, 00:00 UTC', claimDate: '17 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-17T00:00:00Z'), dateObj: new Date('2026-10-17T14:00:00Z'), nextSnapshotDate: new Date('2026-10-27T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 7', snapshotTime: '27 Oct, 00:00 UTC', claimDate: '27 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-27T00:00:00Z'), dateObj: new Date('2026-10-27T14:00:00Z'), nextSnapshotDate: new Date('2026-11-06T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 8', snapshotTime: '6 Nov, 00:00 UTC', claimDate: '6 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-06T00:00:00Z'), dateObj: new Date('2026-11-06T14:00:00Z'), nextSnapshotDate: new Date('2026-11-16T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 9', snapshotTime: '16 Nov, 00:00 UTC', claimDate: '16 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-16T00:00:00Z'), dateObj: new Date('2026-11-16T14:00:00Z'), nextSnapshotDate: new Date('2026-11-26T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 10', snapshotTime: '26 Nov, 00:00 UTC', claimDate: '26 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-26T00:00:00Z'), dateObj: new Date('2026-11-26T14:00:00Z'), nextSnapshotDate: new Date('2026-12-06T00:00:00Z'), poolAmount: 'TBA' },
];

export const GIVEAWAYS_DATA = [
  {
    id: 5,
    title: 'Meme & Art',
    winners: '6 Winners',
    prizePool: '$50 in ETH',
    status: 'ended',
    distribution: 'Completed',
    link: 'https://x.com/noelle_base/status/2094038840927203494'
  },
  {
    id: 4,
    title: '7 NFTs Vibe Club',
    image: '/rewards/vibe-club.jfif',
    winners: '7 Winners',
    prizePool: '7 NFTs',
    burnNote: '~3M $VIBE burn',
    status: 'ended',
    distribution: 'Completed',
    link: 'https://x.com/vibeB20/status/2092000984671129772'
  },
  {
    id: 3,
    title: '1000 Holders',
    image: '/event3.png',
    winners: '33 Winners',
    prizePool: 'TBA',
    status: 'ongoing',
    distribution: 'Not Started',
    link: 'https://x.com/vibeB20/status/2085778007960977418'
  },
  {
    id: 1,
    title: '$1M MC',
    image: '/event1.png',
    winners: '50 Winners',
    prizePool: 'TBA',
    status: 'ongoing',
    distribution: 'Not Started',
    link: 'https://x.com/mksvibe/status/2083993197861073025'
  },
  {
    id: 2,
    title: 'Base App Welcome Bonus',
    image: '/event2.png',
    winners: '350 Winners',
    prizePool: '1M $VIBE',
    status: 'ended',
    distribution: 'In Progress (92%)',
    link: 'https://x.com/mksvibe/status/2084601445844689003'
  }
];

export const HOLDER_UNLOCKS = [
  { unlock: 'Unlock 1', snapshotTime: '26 Aug, 00:00 UTC', unlockDate: '26 Aug, 14:00 UTC', snapshotDateObj: new Date('2026-08-26T00:00:00Z'), dateObj: new Date('2026-08-26T14:00:00Z'), nextSnapshotDate: new Date('2026-09-25T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 2', snapshotTime: '25 Sep, 00:00 UTC', unlockDate: '25 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-25T00:00:00Z'), dateObj: new Date('2026-09-25T14:00:00Z'), nextSnapshotDate: new Date('2026-10-25T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 3', snapshotTime: '25 Oct, 00:00 UTC', unlockDate: '25 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-25T00:00:00Z'), dateObj: new Date('2026-10-25T14:00:00Z'), nextSnapshotDate: new Date('2026-11-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 4', snapshotTime: '24 Nov, 00:00 UTC', unlockDate: '24 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-24T00:00:00Z'), dateObj: new Date('2026-11-24T14:00:00Z'), nextSnapshotDate: new Date('2026-12-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 5', snapshotTime: '24 Dec, 00:00 UTC', unlockDate: '24 Dec, 14:00 UTC', snapshotDateObj: new Date('2026-12-24T00:00:00Z'), dateObj: new Date('2026-12-24T14:00:00Z'), nextSnapshotDate: new Date('2027-01-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 6', snapshotTime: '23 Jan, 00:00 UTC', unlockDate: '23 Jan, 14:00 UTC', snapshotDateObj: new Date('2027-01-23T00:00:00Z'), dateObj: new Date('2027-01-23T14:00:00Z'), nextSnapshotDate: new Date('2027-02-22T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 7', snapshotTime: '22 Feb, 00:00 UTC', unlockDate: '22 Feb, 14:00 UTC', snapshotDateObj: new Date('2027-02-22T00:00:00Z'), dateObj: new Date('2027-02-22T14:00:00Z'), nextSnapshotDate: new Date('2027-03-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 8', snapshotTime: '24 Mar, 00:00 UTC', unlockDate: '24 Mar, 14:00 UTC', snapshotDateObj: new Date('2027-03-24T00:00:00Z'), dateObj: new Date('2027-03-24T14:00:00Z'), nextSnapshotDate: new Date('2027-04-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 9', snapshotTime: '23 Apr, 00:00 UTC', unlockDate: '23 Apr, 14:00 UTC', snapshotDateObj: new Date('2027-04-23T00:00:00Z'), dateObj: new Date('2027-04-23T14:00:00Z'), nextSnapshotDate: new Date('2027-05-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 10', snapshotTime: '23 May, 00:00 UTC', unlockDate: '23 May, 14:00 UTC', snapshotDateObj: new Date('2027-05-23T00:00:00Z'), dateObj: new Date('2027-05-23T14:00:00Z'), nextSnapshotDate: new Date('2027-06-23T00:00:00Z'), poolAmount: '10,000,000' },
];

export const STAKING_VAULTS_INFO = [
  { roundId: 1, id: '0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663', defaultTime: '2026-08-31T15:00:00.000Z' },
  { roundId: 2, id: '0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446', defaultTime: '2026-09-10T16:00:00.000Z' },
  { roundId: 3, id: '0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c', defaultTime: '2026-09-20T15:00:00.000Z' },
  { roundId: 4, id: '0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9', defaultTime: '2026-09-30T18:00:00.000Z' },
  { roundId: 5, id: '0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713', defaultTime: '2026-10-10T15:00:00.000Z' },
  { roundId: 6, id: '0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08', defaultTime: '2026-10-20T15:00:00.000Z' }
];

export const ADMIN_WITHDRAWAL_TXS = new Set([
  '0x87d64cc5b391c51e8235124900d388bdb962aedec731f9f2e97f65ec5cc19caa'.toLowerCase(),
  '0xc5fe9349e0b588d94607417f20505c0de06e1730fb2602a7b263374970005d69'.toLowerCase(),
  '0x446037424b8644c1baad63e063463e64cb0c3428292d18c66b43622f1dfceeda'.toLowerCase(),
  '0x97814e0f70482aa7e14e467d5ee08775c166fc7d2eb7c685d388f61370337fb9'.toLowerCase(),
  '0x66ca9ba2a0b434fb265da1bc4241baffeb677556153522d4279cc301d55731b3'.toLowerCase(),
  '0xcc7c60604c8e2cc9c674c9070e7c03b118b6fad3d943006979fff76fc00c6623'.toLowerCase()
]);

export const HOLDER_ROUNDS = [
  { id: 1, name: 'Unlock 1', pool: '10,000,000 $VIBE', snapshotDate: 'Aug 26, 00:00 UTC', snapshotIso: '2026-08-26T00:00:00Z', unlockDate: 'Aug 26', targetDate: '2026-08-26T14:00:00Z' },
  { id: 2, name: 'Unlock 2', pool: '10,000,000 $VIBE', snapshotDate: 'Sep 25, 00:00 UTC', snapshotIso: '2026-09-25T00:00:00Z', unlockDate: 'Sep 25', targetDate: '2026-09-25T14:00:00Z' },
  { id: 3, name: 'Unlock 3', pool: '10,000,000 $VIBE', snapshotDate: 'Oct 25, 00:00 UTC', snapshotIso: '2026-10-25T00:00:00Z', unlockDate: 'Oct 25', targetDate: '2026-10-25T14:00:00Z' },
  { id: 4, name: 'Unlock 4', pool: '10,000,000 $VIBE', snapshotDate: 'Nov 24, 00:00 UTC', snapshotIso: '2026-11-24T00:00:00Z', unlockDate: 'Nov 24', targetDate: '2026-11-24T14:00:00Z' },
];

export const VIBECLUB_ROUNDS = [
  { id: 1, name: 'Royalty 1', pool: '2,500,000 $VIBE', snapshotDate: 'Aug 28, 00:00 UTC', snapshotIso: '2026-08-28T00:00:00Z', claimDate: 'Aug 28', targetDate: '2026-08-28T14:00:00Z', nextSnapshotDate: '2026-09-07T00:00:00Z' },
  { id: 2, name: 'Royalty 2', pool: '1,900,000 $VIBE', snapshotDate: 'Sep 7, 00:00 UTC', snapshotIso: '2026-09-07T00:00:00Z', claimDate: 'Sep 7', targetDate: '2026-09-07T14:00:00Z', nextSnapshotDate: '2026-09-17T00:00:00Z' },
  { id: 3, name: 'Royalty 3', pool: '2,000,000 $VIBE', snapshotDate: 'Sep 17, 00:00 UTC', snapshotIso: '2026-09-17T00:00:00Z', claimDate: 'Sep 17', targetDate: '2026-09-17T14:00:00Z', nextSnapshotDate: '2026-09-27T00:00:00Z' },
  { id: 4, name: 'Royalty 4', pool: '1,100,000 $VIBE', snapshotDate: 'Sep 27, 00:00 UTC', snapshotIso: '2026-09-27T00:00:00Z', claimDate: 'Sep 27', targetDate: '2026-09-27T14:00:00Z', nextSnapshotDate: '2026-10-07T00:00:00Z' },
  { id: 5, name: 'Royalty 5', pool: '800,000 $VIBE', snapshotDate: 'Oct 7, 00:00 UTC', snapshotIso: '2026-10-07T00:00:00Z', claimDate: 'Oct 7', targetDate: '2026-10-07T14:00:00Z', nextSnapshotDate: '2026-10-17T00:00:00Z' },
  { id: 6, name: 'Royalty 6', pool: 'TBA', snapshotDate: 'Oct 17, 00:00 UTC', snapshotIso: '2026-10-17T00:00:00Z', claimDate: 'Oct 17', targetDate: '2026-10-17T14:00:00Z', nextSnapshotDate: '2026-10-27T00:00:00Z' },
  { id: 7, name: 'Royalty 7', pool: 'TBA', snapshotDate: 'Oct 27, 00:00 UTC', snapshotIso: '2026-10-27T00:00:00Z', claimDate: 'Oct 27', targetDate: '2026-10-27T14:00:00Z', nextSnapshotDate: '2026-11-06T00:00:00Z' },
  { id: 8, name: 'Royalty 8', pool: 'TBA', snapshotDate: 'Nov 6, 00:00 UTC', snapshotIso: '2026-11-06T00:00:00Z', claimDate: 'Nov 6', targetDate: '2026-11-06T14:00:00Z', nextSnapshotDate: '2026-11-16T00:00:00Z' },
  { id: 9, name: 'Royalty 9', pool: 'TBA', snapshotDate: 'Nov 16, 00:00 UTC', snapshotIso: '2026-11-16T00:00:00Z', claimDate: 'Nov 16', targetDate: '2026-11-16T14:00:00Z', nextSnapshotDate: '2026-11-26T00:00:00Z' },
  { id: 10, name: 'Royalty 10', pool: 'TBA', snapshotDate: 'Nov 26, 00:00 UTC', snapshotIso: '2026-11-26T00:00:00Z', claimDate: 'Nov 26', targetDate: '2026-11-26T14:00:00Z', nextSnapshotDate: '2026-12-06T00:00:00Z' },
];
