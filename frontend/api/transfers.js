// Vercel serverless function: admin-only $VIBE transfer history. Logic lives in ./_lib/transfers.js.
import { handleTransfers } from './_lib/transfers.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const result = await handleTransfers({ method: req.method, query: req.query, headers: req.headers });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
