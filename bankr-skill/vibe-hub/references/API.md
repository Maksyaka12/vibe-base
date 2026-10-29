# Vibe Hub API reference

Host: `https://vibehome.dog`. All endpoints are `GET`, public, no auth, JSON. Chain: Base (8453).
A ready transaction is always `{ "to": "0x...", "data": "0x...", "value": "<wei>", "sender": "<address>|any" }`.
Submit it on Base exactly as returned. `sender: "any"` = any wallet may send it, the result goes to the wallet in the request.

## GET /api/agent
Index: endpoints, reward rules (`rules`), contract addresses.

## GET /api/status?address=0x...
Wallet overview.
- `vibeBalance`, `ethBalance`
- `eligibility.nextHolderRound` / `eligibility.nextRoyaltyRound`: `name`, `snapshot` (ISO), `pool`, `requirement`, `eligibleNow`, `missing` ($VIBE short of the requirement)
- `vibeClub`: `nftCount`, `tokenIds`, `mint` (info only; agents do not mint)
- `checkIn`: `currentStreak`, `longestStreak`, `totalCheckIns`, `lastCheckIn`, `canCheckInToday`, `secondsUntilNext`, `tx` (present when a check-in is possible; `sender` = the wallet)
- `achievements`: `progress` (`longestStreak`, `vaultsJoined`, `largestStake`), `items[]` (`id`, `name`, `condition`, `threshold`, `claimed`, `claimable`), `tx` (claims every claimable achievement at once, `sender: "any"`; null when nothing is claimable)
- `staking.currentEpoch`: `epoch`, `pool`, `ends`, `vault` (link)

## GET /api/claims?address=0x...
Every holder-reward and royalty round the wallet has an allocation in.
- `rounds[]`: `type` (`holder` | `royalty`), `round`, `name`, `status`, `amount` ($VIBE), `claimStart`, `claimEnd`, `contract`, `contractVersion`, `tx`
- `status`: `open` (claim now, `tx` set), `claimed`, `not_opened` (before `claimStart`), `expired` (after `claimEnd`)
- `tx.sender`: `"any"` for v2 rounds (Unlock 3+, Royalty 7+), the wallet itself for v1 rounds
- `claimableNow`: total $VIBE claimable right now

## GET /api/staking?address=0x...[&deposit=AMOUNT]
o1 Exchange staking vaults (one 10-day epoch each).
- `vaults[]`: `epoch`, `vaultId`, `link`, `phase` (`upcoming` | `deposits_open` | `active` | `ended`), `depositOpen`, `start`, `end`, `rewardPool`, `totalStaked`, `yourStake`, `lots[]`, `claimableReward`, `txs.claimReward`, `txs.withdrawUnlocked` (null when nothing to do)
- with `deposit=AMOUNT` ($VIBE, decimal): `deposit` = `{ epoch, vaultId, amount, enoughBalance, txs: [approve?, deposit] }` or `{ error }`
- payouts always go to the wallet itself

## GET /api/swap?address=0x...&side=buy|sell&amount=AMOUNT[&slippage=1]
ETH <-> $VIBE through KyberSwap. `amount` = ETH to spend when buying, $VIBE to sell when selling. `slippage` in percent (default 1).
- `expectedOut`, `minimumOut`, `router`, `txs` (`approve` first when selling, then the swap). Output goes back to the wallet. Quote valid ~20 minutes.

## GET /api/rounds
Full schedule: holder unlocks, royalty rounds, staking epochs with dates, pools, claim windows and state; giveaways; reward rules.

## GET /api/history?address=0x...
Payouts received from holder rewards, royalties and staking: round, amount, date, tx hash, with totals.

## Errors
`{ "error": "..." }` with HTTP 400 (bad input), 405 (wrong method) or 5xx (temporary, retry once). Relay the message to the user.
