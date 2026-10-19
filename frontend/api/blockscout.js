// Vercel serverless function: admin-only Blockscout log search. Logic lives in ./_lib/blockscout.js.
import { handleBlockscout } from './_lib/blockscout.js';

export default async function handler(req, res) {
  const result = await handleBlockscout({ method: req.method, query: req.query, headers: req.headers });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
