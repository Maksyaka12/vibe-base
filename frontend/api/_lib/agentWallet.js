// Autonomous agent actions from the user's Vibe Agent Wallet (Privy embedded wallet), signed by our server.
//
// The user enables the agent once on the site: their embedded wallet gets our key quorum as an extra signer
// (Privy addSigners, revocable), and the site gets a personal agent key from POST /api/agent/token.
// The agent then calls POST /api/agent/act with `Authorization: Bearer <agent key>` and the server signs
// and sends the transaction with our authorization key: no wallet prompts.
//
// What an agent key can do (everything else is refused):
// - the txs our read endpoints return: check-in, achievements, reward claims, staking deposit / claim / withdraw
//   (staking payouts only to the wallet itself), $VIBE approvals for staking;
// - swaps ETH <-> $VIBE (the server builds the route, the output always comes back to the wallet);
// - transfers of ETH / $VIBE / USDC: unlimited to the user's own main wallet, daily-capped to anyone else.
// The user can lower or raise the daily caps and turn swaps, staking and transfers to other addresses off
// (GET / PUT /api/agent/settings); the checks below read those settings.
// Minting is not offered to agents.
//
// Env: PRIVY_APP_SECRET, PRIVY_AUTHORIZATION_KEY (private key of the key quorum), optional PRIVY_APP_ID,
// PRIVY_SIGNER_ID, AGENT_DAILY_LIMIT_ETH / _VIBE / _USDC.

import { createHash, randomBytes } from 'node:crypto';
import { decodeFunctionData, encodeFunctionData, formatUnits, getAddress, isAddress, parseAbi, parseUnits } from 'viem';
import { json, store, env } from './common.js';
import { publicClient } from '../../src/config/rpc.js';
import { appendBuilderSuffix } from '../../src/config/builderCode.js';
import { distributorAddresses } from '../../src/config/distributors.js';
import { VIBE_TOKEN } from '../../src/data/snapshot/constants.js';
import { handleSwap } from './agent.js';

export const PRIVY_APP_ID = env('PRIVY_APP_ID') || 'cmrugdvds02q60cl7tegmrnx7';
export const AGENT_SIGNER_ID = env('PRIVY_SIGNER_ID') || 'y71vnth4hmzgtq71ehfipceq';

const CHECK_IN = '0x1938BA215ef556e51eE6AaF909e0970AE0167634';
const ACHIEVEMENTS = '0x1336E381768c98c8A6e79d99Ec065684c41925A5';
const STAKING = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const KYBER_ROUTER = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const TOKENS = {
  ETH: { address: null, decimals: 18, limit: env('AGENT_DAILY_LIMIT_ETH') || '0.1' },
  VIBE: { address: VIBE_TOKEN, decimals: 18, limit: env('AGENT_DAILY_LIMIT_VIBE') || '10000000' },
  USDC: { address: USDC, decimals: 6, limit: env('AGENT_DAILY_LIMIT_USDC') || '250' },
};

// Highest daily caps a user can set for transfers to other addresses.
const MAX_LIMITS = { ETH: '10', VIBE: '1000000000', USDC: '100000' };
const DEFAULT_SETTINGS = {
  limits: Object.fromEntries(Object.entries(TOKENS).map(([symbol, t]) => [symbol, t.limit])),
  allow: { swaps: true, staking: true, transfers: true },
};

const settingsKey = (address) => `agent_settings:${String(address || '').toLowerCase()}`;

/** The user's agent settings over the defaults. */
async function readSettings(address) {
  const saved = (await (await store()).get(settingsKey(address))) || {};
  return {
    limits: { ...DEFAULT_SETTINGS.limits, ...saved.limits },
    allow: { ...DEFAULT_SETTINGS.allow, ...saved.allow },
  };
}

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]);
const STAKING_ABI = parseAbi([
  'function deposit(bytes32 vaultId, uint256 amount)',
  'function claim(bytes32 vaultId, uint64[] epochs, address to)',
  'function withdrawLots(bytes32 vaultId, uint64[] lotIds, uint256[] amounts, address to)',
]);

const EMBEDDED = ['privy', 'privy-v2'];
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const lower = (a) => String(a || '').toLowerCase();

let client;
async function privy() {
  if (!env('PRIVY_APP_SECRET') || !env('PRIVY_AUTHORIZATION_KEY')) throw new Error('Agent signing is not configured on the server');
  if (!client) {
    const { PrivyClient } = await import('@privy-io/node');
    client = new PrivyClient({ appId: PRIVY_APP_ID, appSecret: env('PRIVY_APP_SECRET') });
  }
  return client;
}

const bearer = (headers = {}) => {
  const h = headers.authorization || headers.Authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};

/** The logged-in Privy user behind a site request: user id, main wallet and the embedded (agent) wallet. */
async function siteUser(headers) {
  const token = bearer(headers);
  if (!token) return { error: json(401, { error: 'Log in on the site first' }) };
  const p = await privy();
  let userId;
  try {
    userId = (await p.utils().auth().verifyAccessToken(token)).user_id;
  } catch {
    return { error: json(401, { error: 'Session expired, log in again' }) };
  }
  const user = await p.users()._get(userId);
  const walletAccounts = (user.linked_accounts || []).filter((a) => a.type === 'wallet' && a.chain_type !== 'solana');
  const main = walletAccounts.find((a) => !EMBEDDED.includes(a.wallet_client_type));
  const embedded = walletAccounts.find((a) => EMBEDDED.includes(a.wallet_client_type));
  if (!embedded) return { error: json(409, { error: 'This account has no agent wallet yet: log out and in again' }) };
  let wallet = null;
  for await (const w of p.wallets().list({ user_id: userId, chain_type: 'ethereum' })) {
    if (lower(w.address) === lower(embedded.address)) wallet = w;
  }
  if (!wallet) return { error: json(409, { error: 'Agent wallet not found' }) };
  return { userId, wallet, mainAddress: main?.address || null };
}

const hasOurSigner = (wallet) => (wallet.additional_signers || []).some((s) => s.signer_id === AGENT_SIGNER_ID);

// ─────────────────────────────── /api/agent/token ───────────────────────────────
// GET: is the agent enabled; POST: issue a new agent key (the old one stops working); DELETE: revoke it.

export async function handleAgentToken({ method, headers = {} }) {
  if (!['GET', 'POST', 'DELETE'].includes(method)) return json(405, { error: 'Method not allowed' }, { Allow: 'GET, POST, DELETE' });
  try {
    const me = await siteUser(headers);
    if (me.error) return me.error;
    const db = await store();
    const userKey = `agent_user:${me.userId}`;
    const current = await db.get(userKey);

    if (method === 'GET') {
      return json(200, { address: me.wallet.address, signer: hasOurSigner(me.wallet), hasKey: Boolean(current?.hash), keyCreatedAt: current?.createdAt || null }, { 'Cache-Control': 'no-store' });
    }
    if (method === 'DELETE') {
      await db.write([...(current?.hash ? [['del', `agent_token:${current.hash}`]] : []), ['del', userKey]]);
      return json(200, { revoked: true });
    }

    if (!hasOurSigner(me.wallet)) return json(409, { error: 'Enable the agent first: the wallet has no Vibe Hub signer' });
    const token = `vibe_agent_${randomBytes(24).toString('hex')}`;
    const hash = sha256(token);
    const record = { userId: me.userId, walletId: me.wallet.id, address: getAddress(me.wallet.address), mainAddress: me.mainAddress, createdAt: new Date().toISOString() };
    await db.write([
      ...(current?.hash ? [['del', `agent_token:${current.hash}`]] : []),
      ['set', `agent_token:${hash}`, record],
      ['set', userKey, { hash, createdAt: record.createdAt }],
    ]);
    return json(200, { token, address: record.address }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}

// ─────────────────────────────── /api/agent/settings ───────────────────────────────
// GET: the agent wallet's settings and what it sent to other addresses today; PUT { limits?, allow? }: change them.

const DECIMAL = /^\d+(\.\d+)?$/;

async function settingsView(me) {
  const settings = await readSettings(me.wallet.address);
  const today = (await (await store()).get(dayKey(me.wallet.address))) || {};
  const spentToday = Object.fromEntries(Object.entries(TOKENS).map(([symbol, t]) => [symbol, formatUnits(BigInt(today[symbol] || '0'), t.decimals)]));
  return { address: getAddress(me.wallet.address), mainAddress: me.mainAddress, ...settings, defaults: DEFAULT_SETTINGS, max: MAX_LIMITS, spentToday };
}

export async function handleAgentSettings({ method, headers = {}, body }) {
  if (!['GET', 'PUT'].includes(method)) return json(405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  try {
    const me = await siteUser(headers);
    if (me.error) return me.error;
    if (method === 'GET') return json(200, await settingsView(me), { 'Cache-Control': 'no-store' });

    const req = body && typeof body === 'object' ? body : {};
    const current = await readSettings(me.wallet.address);
    const next = { limits: { ...current.limits }, allow: { ...current.allow } };
    for (const [symbol, value] of Object.entries(req.limits || {})) {
      const t = TOKENS[symbol];
      const v = String(value).trim();
      if (!t || !DECIMAL.test(v)) return json(400, { error: `Enter a number for the ${symbol} limit` });
      if (parseUnits(v, t.decimals) > parseUnits(MAX_LIMITS[symbol], t.decimals)) return json(400, { error: `The ${symbol} limit can be at most ${MAX_LIMITS[symbol]}` });
      next.limits[symbol] = v.replace(/^0+(?=\d)/, '');
    }
    for (const [name, value] of Object.entries(req.allow || {})) {
      if (!(name in DEFAULT_SETTINGS.allow) || typeof value !== 'boolean') return json(400, { error: `Unknown setting ${name}` });
      next.allow[name] = value;
    }
    await (await store()).write([['set', settingsKey(me.wallet.address), next]]);
    return json(200, await settingsView(me), { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}

// ─────────────────────────────── /api/agent/act ───────────────────────────────

async function agentFromKey(headers) {
  const token = bearer(headers);
  if (!token || !token.startsWith('vibe_agent_')) return null;
  return (await store()).get(`agent_token:${sha256(token)}`);
}

const dayKey = (address) => `agent_spend:${lower(address)}:${new Date().toISOString().slice(0, 10)}`;

/** Checks a transfer against today's cap; returns an error message or null. Transfers to the main wallet are free. */
async function checkLimit(agent, settings, symbol, to, amount) {
  if (agent.mainAddress && lower(to) === lower(agent.mainAddress)) return null;
  if (!settings.allow.transfers) return 'Transfers to other addresses are turned off in your Vibe Hub settings. Transfers to your own main wallet still work.';
  const t = TOKENS[symbol];
  const limit = settings.limits[symbol];
  const spent = BigInt((await (await store()).get(dayKey(agent.address)))?.[symbol] || '0');
  const cap = parseUnits(limit, t.decimals);
  if (spent + amount > cap) {
    return `Daily limit for transfers to other addresses is ${limit} ${symbol}; ${formatUnits(cap - spent < 0n ? 0n : cap - spent, t.decimals)} ${symbol} left today. Transfers to your own main wallet have no limit.`;
  }
  return null;
}

async function recordSpend(agent, symbol, to, amount) {
  if (agent.mainAddress && lower(to) === lower(agent.mainAddress)) return;
  const db = await store();
  const key = dayKey(agent.address);
  const today = (await db.get(key)) || {};
  today[symbol] = (BigInt(today[symbol] || '0') + amount).toString();
  await db.write([['set', key, today]]);
}

const STAKING_OFF = 'Staking is turned off in your Vibe Hub settings';
const SWAPS_OFF = 'Swaps are turned off in your Vibe Hub settings';

/** Refuses anything outside the agent rules and the user's settings; returns an error message or null. */
function checkTx(agent, settings, tx) {
  const to = lower(tx.to);
  const value = BigInt(tx.value || 0);
  const self = lower(agent.address);
  const distributors = [...distributorAddresses('holder'), ...distributorAddresses('royalty')];

  if ([lower(CHECK_IN), lower(ACHIEVEMENTS), ...distributors].includes(to)) return value === 0n ? null : 'This call takes no ETH';
  if (to === lower(STAKING)) {
    if (!settings.allow.staking) return STAKING_OFF;
    if (value !== 0n) return 'This call takes no ETH';
    let call;
    try { call = decodeFunctionData({ abi: STAKING_ABI, data: tx.data }); } catch { return 'Unknown staking call'; }
    if (call.functionName === 'deposit') return null;
    const payee = call.functionName === 'claim' ? call.args[2] : call.args[3];
    return lower(payee) === self ? null : 'Staking payouts can only go to the agent wallet itself';
  }
  if (to === lower(VIBE_TOKEN)) {
    let call;
    try { call = decodeFunctionData({ abi: ERC20, data: tx.data }); } catch { return 'Unknown token call'; }
    if (call.functionName === 'approve' && lower(call.args[0]) === lower(STAKING)) return settings.allow.staking ? null : STAKING_OFF;
    if (call.functionName === 'approve' && lower(call.args[0]) === lower(KYBER_ROUTER)) return settings.allow.swaps ? null : SWAPS_OFF;
    return 'Use {"action":"transfer"} to send tokens';
  }
  if (to === lower(KYBER_ROUTER)) return 'Use {"action":"swap"} for swaps';
  return 'This contract is not available to agents';
}

async function send(agent, tx) {
  const p = await privy();
  const res = await p.wallets().ethereum().sendTransaction(agent.walletId, {
    caip2: 'eip155:8453',
    params: {
      transaction: {
        to: getAddress(tx.to),
        data: appendBuilderSuffix(tx.data || '0x'),
        value: `0x${BigInt(tx.value || 0).toString(16)}`,
        chain_id: 8453,
      },
    },
    authorization_context: { authorization_private_keys: [env('PRIVY_AUTHORIZATION_KEY')] },
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: res.hash, timeout: 45_000 });
  if (receipt.status !== 'success') throw Object.assign(new Error('Transaction reverted on Base'), { hash: res.hash });
  return res.hash;
}

async function sendAll(agent, txs) {
  const hashes = [];
  for (const tx of txs) hashes.push(await send(agent, tx));
  return hashes;
}

export async function handleAgentAct({ method, headers = {}, body }) {
  if (method !== 'POST') return json(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const agent = await agentFromKey(headers);
    if (!agent) return json(401, { error: 'Missing or revoked agent key: enable the agent in Vibe Hub → Account and pass Authorization: Bearer <key>' });
    const req = body && typeof body === 'object' ? body : {};
    const settings = await readSettings(agent.address);

    if (req.action === 'transfer') {
      const symbol = String(req.token || '').toUpperCase().replace('$', '');
      const t = TOKENS[symbol];
      if (!t || !isAddress(req.to || '') || !/^\d+(\.\d+)?$/.test(String(req.amount || ''))) {
        return json(400, { error: 'Use {"action":"transfer","token":"ETH|VIBE|USDC","to":"0x...","amount":"1.5"}' });
      }
      const amount = parseUnits(String(req.amount), t.decimals);
      if (amount <= 0n) return json(400, { error: 'Amount must be above zero' });
      const limitError = await checkLimit(agent, settings, symbol, req.to, amount);
      if (limitError) return json(403, { error: limitError });
      const tx = t.address
        ? { to: t.address, data: encodeFunctionData({ abi: ERC20, functionName: 'transfer', args: [getAddress(req.to), amount] }), value: 0n }
        : { to: req.to, data: '0x', value: amount };
      const [hash] = await sendAll(agent, [tx]);
      await recordSpend(agent, symbol, req.to, amount);
      return json(200, { action: 'transfer', from: agent.address, to: getAddress(req.to), token: symbol, amount: String(req.amount), hashes: [hash] });
    }

    if (req.action === 'swap') {
      if (!settings.allow.swaps) return json(403, { error: SWAPS_OFF });
      const quote = await handleSwap({ method: 'GET', query: { address: agent.address, side: req.side, amount: req.amount, slippage: req.slippage } });
      if (quote.status !== 200) return quote;
      const hashes = await sendAll(agent, quote.body.txs);
      return json(200, { action: 'swap', from: agent.address, side: quote.body.side, amountIn: quote.body.amountIn, expectedOut: quote.body.expectedOut, minimumOut: quote.body.minimumOut, hashes });
    }

    const txs = Array.isArray(req.txs) ? req.txs : req.tx ? [req.tx] : null;
    if (!txs?.length || txs.length > 5 || txs.some((tx) => !tx || !isAddress(tx.to || '') || !/^0x[0-9a-fA-F]*$/.test(tx.data || ''))) {
      return json(400, { error: 'Send {"tx":{to,data,value}} (or "txs": up to 5, in order) as returned by the Vibe Hub read endpoints, or {"action":"transfer"|"swap",...}' });
    }
    for (const tx of txs) {
      if (tx.sender && tx.sender !== 'any' && lower(tx.sender) !== lower(agent.address)) return json(400, { error: `This tx was built for ${tx.sender}; request it again with address=${agent.address}` });
      const err = checkTx(agent, settings, tx);
      if (err) return json(403, { error: err, to: tx.to });
    }
    const hashes = await sendAll(agent, txs);
    return json(200, { from: agent.address, hashes });
  } catch (e) {
    return json(e.hash ? 409 : 500, { error: e.message || 'Server error', ...(e.hash ? { hash: e.hash } : {}) });
  }
}
