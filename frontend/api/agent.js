// Vercel serverless function: the whole public agent API in one function (Hobby allows 12 per deployment).
// vercel.json rewrites /api/{claims,status,staking,swap,rounds,history} here as ?route=<name>; /api/agent
// itself is the index. Logic lives in ./_lib/agent.js.
import { handleAgentIndex, handleClaims, handleStatus, handleStaking, handleSwap, handleRounds, handleHistory } from './_lib/agent.js';

export const config = { maxDuration: 30 };

const ROUTES = {
  claims: handleClaims,
  status: handleStatus,
  staking: handleStaking,
  swap: handleSwap,
  rounds: handleRounds,
  history: handleHistory,
};

export default async function handler(req, res) {
  const { route, ...query } = req.query || {};
  const handle = ROUTES[route] || handleAgentIndex;
  const result = await handle({ method: req.method, query });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(result.status).send(JSON.stringify(result.body));
}
