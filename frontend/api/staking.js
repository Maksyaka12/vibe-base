// Vercel serverless function: public agent API (/api/staking). Logic lives in ./_lib/agent.js.
import { handleStaking } from './_lib/agent.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const result = await handleStaking({ method: req.method, query: req.query });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(result.status).send(JSON.stringify(result.body));
}
