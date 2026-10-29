---
name: vibe-hub
description: Run Vibe Hub ($VIBE on Base, vibehome.dog) for the user from their Vibe Agent Wallet - daily check-in, claim holder rewards, Vibe Club royalties and achievement SBTs, stake $VIBE, swap ETH <-> $VIBE, mint a Vibe Club NFT with ETH, send funds, and answer questions about rounds, eligibility and payouts. Use for vibe hub, vibehome, $VIBE, vibe check-in, vibe rewards, vibe staking.
version: 1
---

# Vibe Hub - agent skill

[Vibe Hub](https://vibehome.dog) is the $VIBE community app on **Base (chain ID 8453)**. With this skill you act for the user from their **Vibe Agent Wallet**: our server signs and sends the transactions, you never handle a private key.

## Setup

1. The user enables the agent at https://vibehome.dog/agents and gives you their **agent key** (`vibe_agent_...`).
2. Keep the key secret: never print it back, never put it in a URL, never send it anywhere except the `Authorization` header below.
3. Find the agent wallet: `GET https://vibehome.dog/api/agent` is public; your first `POST /api/agent/act` call returns `from` = the agent wallet address. If the user did not tell you the address, ask for it or read it from that response.

## How to act

- **Read** with public `GET` endpoints (no auth): `/api/status`, `/api/claims`, `/api/staking`, `/api/rounds`, `/api/history`. Full reference: https://vibehome.dog/skills/API.md
- **Act** with one endpoint:

```
POST https://vibehome.dog/api/agent/act
Authorization: Bearer <agent key>
Content-Type: application/json
```

| Body | Does |
|---|---|
| `{"tx": {...}}` or `{"txs": [...]}` | Sends ready txs exactly as returned by the read endpoints (called with `address=<agent wallet>`), in order, up to 5 |
| `{"action":"swap","side":"buy","amount":"0.01"}` | Buys $VIBE for 0.01 ETH (best route, server-built) |
| `{"action":"swap","side":"sell","amount":"1000000"}` | Sells 1M $VIBE for ETH |
| `{"action":"transfer","token":"ETH","to":"0x...","amount":"0.01"}` | Sends ETH, VIBE or USDC |
| `{"action":"mint"}` | Mints one Vibe Club NFT with ETH at the contract price (server-built) |

The response is `{ "from": "<agent wallet>", "hashes": ["0x..."] }`. Reply with what was done and `https://basescan.org/tx/<hash>`.

## What users mean -> what to do

| User says | Do |
|---|---|
| "check in" | `GET /api/status?address=A`; if `checkIn.canCheckInToday`, act with `{"tx": checkIn.tx}`; otherwise tell the streak and time left |
| "claim my rewards / royalties" | `GET /api/claims?address=A`; act with the `tx` of every round with `status: "open"` |
| "claim achievements" | `GET /api/status?address=A`; if `achievements.tx` is not null, act with it |
| "stake N VIBE" | `GET /api/staking?address=A&deposit=N`; confirm with the user, then act with `{"txs": deposit.txs}` |
| "claim staking rewards", "withdraw" | `GET /api/staking?address=A`; act with the non-null `vaults[].txs.*` |
| "buy / sell VIBE" | confirm, then `{"action":"swap",...}` |
| "send N TOKEN to 0x..." | confirm recipient and amount, then `{"action":"transfer",...}` |
| "mint a Vibe Club NFT" | `GET /api/status?address=A`; if `vibeClub.mint.canMint`, confirm the price (`vibeClub.mint.priceEth` ETH + gas), then `{"action":"mint"}` |
| "mint with VIBE" | not available to agents: tell the user to mint with $VIBE by hand at https://vibehome.dog/nft from the agent wallet |
| "when is the next unlock", "am I eligible", "what did I earn" | `/api/rounds`, `/api/status`, `/api/history` |

`A` = the agent wallet address.

## Rules

- **Confirm before** staking, swapping, minting or sending. Check-ins and claims need no confirmation.
- Never build calldata yourself; use what the API returns.
- Transfers to the user's main wallet are unlimited; to other addresses they are capped per day (the API says how much is left). The user sets the caps and can turn swaps, staking, NFT mint and transfers to other addresses off in Vibe Hub → Settings; a `403` naming a setting means it is off there.
- Only Vibe Hub contracts are allowed; the server refuses anything else.
- Mint only with ETH, never with $VIBE: the price is set by the contract (`priceEth`), one NFT per wallet.
- The user's main wallet is never touched. Achievement and v2 reward claims can be sent for the main wallet (`address=<main>`, txs with `sender: "any"`) only when the user explicitly asks.
- Errors come as `{ "error": "..." }`: relay them. `401` = the key was revoked; ask the user for a new one.
- Gas is paid in ETH from the agent wallet. If it has none, ask the user to top it up from https://vibehome.dog/wallet
