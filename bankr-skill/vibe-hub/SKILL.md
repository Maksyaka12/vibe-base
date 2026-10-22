---
name: vibe-hub
description: Use Vibe Hub ($VIBE on Base, vibehome.dog) for the user - daily check-in, claim holder rewards and Vibe Club royalties, claim achievement SBTs, stake $VIBE in o1 Exchange vaults, swap and send $VIBE, and answer questions about rounds, eligibility, schedule and payout history. Use for vibe hub, vibehome, $VIBE, vibe check-in, vibe rewards, vibe royalties, vibe club, vibe achievements, vibe staking. Base mainnet only.
tags: [vibe, vibehub, base, rewards, staking, check-in, achievements, defi]
version: 1
---

# Vibe Hub - Bankr agent skill

[Vibe Hub](https://vibehome.dog) is the $VIBE community app on **Base (chain ID 8453)**: daily onchain check-in, holder reward unlocks, royalties for Vibe Club NFT holders, soulbound achievements and $VIBE staking vaults on o1 Exchange.

With this skill the user just tells Bankr what to do ("do my vibe check-in", "claim my vibe rewards", "stake 5M VIBE") and Bankr does it from the user's Bankr wallet. Nothing to sign up for and no keys: the Vibe Hub API is public and returns **ready transactions**, Bankr submits them.

## CRITICAL - how to act

1. **API host: `https://vibehome.dog`.** Every endpoint is `GET`, needs no auth, returns JSON. Full reference: `references/API.md`.
2. **Never build calldata yourself.** Always call the API and submit the `tx` objects it returns, exactly as given: `to`, `data`, `value` (wei, decimal string), on **Base, chainId 8453**.
3. **Which wallet:** "my wallet" = the user's Bankr wallet on Base. Pass it as `address=`. If the user names another wallet ("my main wallet 0x..."), use that address for reading, and only submit txs whose `sender` is `"any"` (those credit that wallet, see below).
4. **`sender` field of a tx:**
   - the Bankr wallet address -> submit from the Bankr wallet;
   - `"any"` -> anyone may send it; the result (tokens, SBTs) always goes to the wallet in the request. Submit from the Bankr wallet; Bankr only pays gas;
   - any other address -> **do not submit**; that wallet must act itself. Tell the user.
5. **Order:** when a response has several txs (approve then deposit, approve then swap), submit them one by one in the given order and wait for each to confirm.
6. **Confirm with the user before** staking, swapping or sending tokens: show amount, token and destination. Check-in and claims need no confirmation.
7. **After submitting:** reply briefly with what was done and the Basescan link `https://basescan.org/tx/<hash>`.
8. **Not available:** minting Vibe Club NFTs is not done by agents; send the user to https://vibehome.dog/nft.

## What users mean -> what to do

| User says | Call | Then |
|---|---|---|
| "check in", "do my vibe check-in", "vibe streak" | `GET /api/status?address=W` | `checkIn.canCheckInToday` true -> submit `checkIn.tx`. Otherwise reply with `checkIn.currentStreak` and time until next (`secondsUntilNext`). |
| "claim my vibe rewards / royalties / unlock" | `GET /api/claims?address=W` | Submit `tx` of every round with `status: "open"` (skip `tx: null`). Reply with amounts per round. Nothing open -> say when the next round opens (`/api/rounds`). |
| "claim my vibe achievements / SBTs" | `GET /api/status?address=W` | If any `achievements.items[].claimable`, submit `achievements.tx` (claims all of them at once). |
| "am I eligible", "next vibe rewards" | `GET /api/status?address=W` | Answer from `eligibility.nextHolderRound` / `nextRoyaltyRound` (requirement, snapshot date, `eligibleNow`, `missing`). |
| "stake N VIBE", "vibe staking" | `GET /api/staking?address=W&deposit=N` | Show `deposit` (vault, epoch, amount), confirm, submit `deposit.txs` in order. `deposit.error` -> explain (e.g. no vault open now). |
| "claim staking rewards", "withdraw my stake" | `GET /api/staking?address=W` | Submit `vaults[].txs.claimReward` / `vaults[].txs.withdrawUnlocked` that are not null. |
| "buy N ETH of VIBE", "sell N VIBE" | Bankr's own swap with token `0xb200000000000000000000df24ecb8bf51100a01` on Base | Fallback: `GET /api/swap?address=W&side=buy|sell&amount=N` and submit `txs` in order. |
| "send N VIBE to 0x..." | Bankr's own token transfer, token `0xb200000000000000000000df24ecb8bf51100a01` on Base | Confirm recipient and amount first. |
| "vibe schedule", "when is the next unlock / royalty" | `GET /api/rounds` | Dates, pools, claim windows, current staking epoch. |
| "what did I earn from vibe" | `GET /api/history?address=W` | Totals and payouts per round with tx links. |
| "how does vibe hub work", rules | `GET /api/agent` | `rules` explains holder rewards, royalties, staking, achievements. |

`W` = the wallet address (Bankr wallet unless the user named another one).

## Claiming for the user's main wallet

Many users hold $VIBE and Vibe Club NFTs in their own wallet (MetaMask, Coinbase Wallet...) and use Bankr only to act. That works without moving anything:

- **Rewards from Unlock 3 and Royalty 7 onwards** and **achievements** return txs with `sender: "any"`. Call the endpoint with `address=<main wallet>` and submit from the Bankr wallet: the tokens / SBTs go straight to the main wallet.
- **Older rounds (Unlock 1-2, Royalty 1-6)**, **check-in** and **staking** must be sent by the wallet itself (`sender` = that wallet). Bankr can only do them for its own wallet.

## Contracts (Base mainnet)

| Contract | Address |
|---|---|
| $VIBE token | `0xb200000000000000000000df24ecb8bf51100a01` |
| Daily check-in | `0x1938BA215ef556e51eE6AaF909e0970AE0167634` |
| Achievements (soulbound) | `0x1336E381768c98c8A6e79d99Ec065684c41925A5` |
| Holder rewards v2 (Unlock 3+) | `0x90B855994D9ba328399d87d0285b7D7f7B8E2c80` |
| Holder rewards v1 (Unlock 1-2) | `0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089` |
| Vibe Club royalties v2 (Royalty 7+) | `0xeEb47756fBf417907B2Be94aCcfB851a224add2c` |
| Vibe Club royalties v1 (Royalty 1-6) | `0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1` |
| o1 Exchange staking | `0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4` |
| Vibe Club NFT | `0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886` |

Before submitting, check that `tx.to` is one of these (or the KyberSwap router returned by `/api/swap`). If it is not, stop and tell the user.

## Notes

- Gas is paid in ETH on Base by the sending wallet. If the Bankr wallet has no ETH, ask the user to top it up.
- Claim windows are enforced onchain: a round can be claimed from its `claimStart` until `claimEnd`; after that it is gone.
- Holder rewards need 5,000,000 $VIBE in the wallet at the snapshot (00:00 UTC on the round day); royalties need at least one Vibe Club NFT at the snapshot.
- Each wallet is its own participant: the Bankr wallet has its own streak, rewards and achievements.
