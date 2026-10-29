// Vercel serverless function: reward snapshots. Logic lives in ./_lib/snapshots.js.
import { handleSnapshots } from './_lib/snapshots.js';

export default async function handler(req, res) {
  const result = await handleSnapshots({ method: req.method, query: req.query, body: req.body });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
