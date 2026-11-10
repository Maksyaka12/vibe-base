# Vibe Hub AGENTS.md

> Vibe Hub is an onchain app for the $VIBE ecosystem on Base: holder rewards, Vibe Club NFT royalties, staking, swaps, the Vibe Club NFT, daily check-ins, soulbound achievements, and a Vibe Agent Wallet that AI agents can operate for the user.

This is the entry point for AI agents working with Vibe Hub at https://vibehome.dog. Use the endpoints and skills below rather than scraping the app: the app is a client-rendered SPA, the API is the source of truth.

## Network

- Chain: Base Mainnet, chain ID `8453`
- Explorer: https://basescan.org
- Base reference for agents: https://www.base.org/AGENTS.md

## Two ways to act for a user

1. **Vibe Agent Wallet** (Claude Code, Cursor, Codex, OpenClaw and other coding agents). The user enables an agent at https://vibehome.dog/agents and gives you an agent key (`vibe_agent_...`). You call `POST https://vibehome.dog/api/agent/act` with `Authorization: Bearer <agent key>`; the server signs and sends from the agent wallet, only the actions the skill lists, within the permissions and daily limits the user set, and the user can revoke the key in one click. Skill: https://vibehome.dog/skills/vibe-hub/SKILL.md
2. **Bankr wallet.** Public read endpoints return ready transactions that Bankr submits from the user's own wallet. Skill: https://vibehome.dog/skills/bankr/SKILL.md

Never ask for a private key or seed phrase. Never print an agent key back, put it in a URL, or send it anywhere except the `Authorization` header.

## Public read endpoints (GET, JSON, no auth)

Full reference: https://vibehome.dog/skills/API.md

- `/api/agent`: index of endpoints, reward rules and contract addresses
- `/api/status?address=0x...`: balances, eligibility for the next rounds, Vibe Club, check-in streak, achievements, staking epoch
- `/api/claims?address=0x...`: every holder-reward and royalty round with status and a ready claim transaction
- `/api/staking?address=0x...`: staking vaults, stakes and rewards
- `/api/swap?address=0x...&side=buy|sell&amount=...`: ETH <-> $VIBE quote with ready transactions
- `/api/rounds`: full schedule of unlocks, royalty rounds, staking epochs and giveaways
- `/api/history?address=0x...`: payouts received, with transaction hashes

A ready transaction is `{ "to", "data", "value", "sender" }`. Send it exactly as returned: `data` ends with the Vibe Hub Base Builder Code.

## Verified contracts on Base

- $VIBE token: `0xb200000000000000000000df24ecb8bf51100a01`
- Vibe Club NFT (mint buys and burns $VIBE): `0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886`
- Holder rewards distributor (v2): `0x90B855994D9ba328399d87d0285b7D7f7B8E2c80`
- NFT royalty distributor (v2): `0xeEb47756fBf417907B2Be94aCcfB851a224add2c`
- Daily check-in: `0x1938BA215ef556e51eE6AaF909e0970AE0167634`
- Soulbound achievements (v2): `0x1336E381768c98c8A6e79d99Ec065684c41925A5`
- Buyback, burn and community pool: `0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf`
- All addresses, including v1 distributors: https://vibehome.dog/contracts

## Rules agents should know

- Rewards are Merkle rounds: one claim per wallet per round, inside the claim window, from a fixed pool. Unclaimed rewards are burned after the window.
- Check-in is once per UTC day. Achievements are soulbound and the contract checks their conditions onchain.
- Eligibility comes from Base balances at the snapshot block; buying after the snapshot does not count for that round.

## More

- User docs: https://vibehome.dog/docs
- Agent API guide: https://vibehome.dog/docs/agent-api
- Read-only demo, no wallet: https://vibehome.dog/hub#demo
- llms.txt: https://vibehome.dog/llms.txt
- Source: https://github.com/Maksyaka12/vibe-base
