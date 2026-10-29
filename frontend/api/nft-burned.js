// Vercel serverless function: $VIBE burned by the Vibe Club contract. Logic lives in ./_lib/nftBurned.js.
import { handleNftBurned } from './_lib/nftBurned.js';

export default async function handler(req, res) {
  const result = await handleNftBurned({ method: req.method });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
