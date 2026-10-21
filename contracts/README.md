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

Round timing (UTC): snapshot at 00:00 on the round day, claim opens at 14:00, closes at 00:00 on the day of
the next snapshot.
