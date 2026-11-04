# Vibe Hub

The home of $VIBE on Base: rewards, royalties, staking, swaps, the Vibe Club NFT, and an agent that can do it all for you.

**Live:** [vibehome.dog](https://vibehome.dog)

## What it does

- **Rewards Hub:** holder rewards, Vibe Club royalties, staking rounds and giveaways on one schedule
- **Claim Portal:** Merkle-proof claims for every round
- **Vibe Club:** mint the 333-piece NFT collection
- **Profile:** daily check-in and soulbound achievements
- **Wallet and Swap:** balances, transfers and token swaps
- **Agent Zone:** connect Claude, ChatGPT or any other agent through the [Vibe Hub skill](https://vibehome.dog/skills/vibe-hub/SKILL.md), with permissions and daily limits you control

## Structure

```
frontend/      The app (React + Vite), deployed on Vercel
  api/         Serverless functions: agent API, schedule, snapshots, banners
  public/      Static assets and the published agent skills
  src/         UI, hooks, config and bundled claim proofs
  DESIGN.md    Design system: one UI, two themes (O1 and Based)
contracts/     Smart contracts (Foundry), see contracts/README.md
bankr-skill/   Vibe Hub skill package for Bankr
scripts/       Snapshot generators for holder and royalty rounds
snapshots/     Published snapshots: Merkle roots, proofs and allocation tables
```

## Run locally

```bash
cd frontend
npm install
npm run dev
```

The app runs without any configuration. The variables for the API and agent features are listed in [frontend/.env.example](frontend/.env.example).

## Tests

Contract tests use Foundry. Setup is in [contracts/README.md](contracts/README.md).

```bash
cd contracts
forge test
```

## License

[MIT](LICENSE)
