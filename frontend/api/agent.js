// Vercel serverless function: public agent API index (/api/agent). Logic lives in ./_lib/agent.js.
import { handleAgentIndex } from './_lib/agent.js';

export default async function handler(req, res) {
  const result = await handleAgentIndex({ method: req.method });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(result.status).send(JSON.stringify(result.body));
}
