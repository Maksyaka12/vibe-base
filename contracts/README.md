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

Merkle reward rounds, deployed twice: holder rewards (from Unlock 3) and Vibe Club royalties (from Royalty 7).

- Each round has its own root, pool and claim window `[claimStart, claimEnd)`, enforced by the contract:
  outside the window nobody can claim, neither through the site nor directly.
- Leaf `keccak256(abi.encodePacked(account, roundId, amount))`, sorted-pair tree: the same format the
  admin snapshot tool publishes.
- `claim` for yourself, `claimFor` / `claimBatchFor` for any wallet (agents, relayers). Tokens always go to
  the wallet in the snapshot.
- Admin: `openRound`, `updateRound` (root/pool only before the first claim, a closed round cannot reopen),
  `withdrawExpired` (unclaimed rest of a closed round to the admin), `emergencyWithdraw` (any time),
  two-step ownership transfer.

Round timing (UTC): snapshot at 00:00 on the round day, claim opens at 14:00, closes at 00:00 on the day of
the next snapshot.
