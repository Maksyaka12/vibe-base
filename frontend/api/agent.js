// Vercel serverless function: the whole public agent API in one function (Hobby allows 12 per deployment).
// vercel.json rewrites /api/{claims,status,staking,swap,rounds,history,activity} and /api/agent/{act,token} here as
// ?route=<name>; /api/agent itself is the index. Logic lives in ./_lib/agent.js and ./_lib/agentWallet.js.
import { handleAgentIndex, handleClaims, handleStatus, handleStaking, handleSwap, handleRounds, handleHistory } from './_lib/agent.js';
import { handleAgentAct, handleAgentToken } from './_lib/agentWallet.js';
import { handleActivity } from './_lib/activity.js';

export const config = { maxDuration: 60 };

const ROUTES = {
  claims: handleClaims,
  status: handleStatus,
  staking: handleStaking,
  swap: handleSwap,
  rounds: handleRounds,
  history: handleHistory,
  activity: handleActivity,
  act: handleAgentAct,
  token: handleAgentToken,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }
  const { route, ...query } = req.query || {};
  const handle = ROUTES[route] || handleAgentIndex;
  const result = await handle({ method: req.method, query, headers: req.headers, body: req.body });
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(JSON.stringify(result.body));
}
