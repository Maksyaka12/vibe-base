# Vibe Hub contracts

Foundry project for the Vibe Hub contracts on Base. `legacy/` keeps the sources of the contracts
deployed before (NFT mint, first holder/royalty distributors, check-in, achievements, coordinator).

## Setup

Dependencies are pinned and not committed:

```bash
git clone --depth 1 --branch v1.9.7 https://github.com/foundry-rs/forge-std.git lib/forge-std
git clone --depth 1 --branch v5.1.0 https://github.com/OpenZeppelin/openzeppelin-contracts.git lib/openzeppelin-contracts
```

## Test

```bash
forge test
forge test --match-contract Fork --fork-url https://mainnet.base.org   # real $VIBE on a Base fork
```

## Contracts

### VibeRewardsDistributor

Merkle reward rounds, deployed twice on Base (owner 0x4c91D3BEd372C11795b9Ce9a9017dFE447Bf050a, verified on Sourcify):

| | Address | Rounds |
|---|---|---|
| Holder rewards | 0x90B855994D9ba328399d87d0285b7D7f7B8E2c80 | Unlock 3+ |
| Vibe Club royalties | 0xeEb47756fBf417907B2Be94aCcfB851a224add2c | Royalty 7+ |

- Each round has its own root, pool and claim window `[claimStart, claimEnd)`, enforced by the contract:
  outside the window nobody can claim, neither through the site nor directly.
- Leaf `keccak256(abi.encodePacked(account, roundId, amount))`, sorted-pair tree: the same format the
  admin snapshot tool publishes.
- `claim` for yourself, `claimFor` / `claimBatchFor` for any wallet (agents, relayers). Tokens always go to
  the wallet in the snapshot.
- Admin: `openRound`, `updateRound` (root/pool only before the first claim, a closed round cannot reopen),
  `withdrawExpired` (unclaimed rest of a closed round to the admin), `emergencyWithdraw` (any time),
  two-step ownership transfer.

### VibeAchievementsV2

Deployed on Base at 0x1336E381768c98c8A6e79d99Ec065684c41925A5 (owner 0x4c91...050a, verified on Sourcify).

Soulbound achievements (ERC-1155 ids 1-8, one per wallet, transfers and approvals revert). The contract
checks each condition from onchain data:

| Id | Achievement | Condition |
|---|---|---|
| 1-3 | Starter / Loyal / Ultra-active dog | longest check-in streak >= 7 / 14 / 30 (check-in contract) |
| 4-6 | Novice staker / Confident banker / Wolf of Wall St | deposited into >= 1 / 3 / 5 official vaults (o1 `nextLotId`, kept after withdrawal) |
| 7-8 | Rich dog / Bank founder | currently staking >= 5M / 10M $VIBE in one official vault |

`claimFor` / `claimAllFor` may be called by anyone (agents): a badge only goes to the wallet that earned it.
The owner adds vaults as staking epochs start (`addVault`), can add or change achievements, and `grant`s
special cases (e.g. a past large deposit that was withdrawn).

Round timing (UTC): snapshot at 00:00 on the round day, claim opens at 14:00, closes at 00:00 on the day of
the next snapshot.
