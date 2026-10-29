// Vercel serverless function: the Vibe Club NFT a wallet minted. Logic lives in ./_lib/mintedNft.js.
import { handleMintedNft } from './_lib/mintedNft.js';

export default async function handler(req, res) {
  const result = await handleMintedNft({ method: req.method, query: req.query });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
