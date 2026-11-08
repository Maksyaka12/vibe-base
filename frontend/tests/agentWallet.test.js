// Agent transfer caps under load, agent swap slippage and the KyberSwap router check.
// Privy, the RPC and KyberSwap are replaced by fakes; storage is the local file store in a temp folder.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.chdir(mkdtempSync(join(tmpdir(), 'vibe-agent-')));
for (const k of ['VERCEL', 'KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']) delete process.env[k];
process.env.PRIVY_APP_SECRET = 'test';
process.env.PRIVY_AUTHORIZATION_KEY = 'test';

const AGENT = '0x1111111111111111111111111111111111111111';
const MAIN = '0x2222222222222222222222222222222222222222';
const STRANGER = '0x3333333333333333333333333333333333333333';
const KYBER = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5';
const KEY = 'vibe_agent_test';

// what the fake chain does with the next transaction: 'ok', 'revert', 'timeout' or 'refuse' (Privy fails)
let outcome = 'ok';
let sent = 0;
let n = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

mock.module('@privy-io/node', {
  namedExports: {
    PrivyClient: class {
      wallets() {
        return {
          ethereum: () => ({
            async sendTransaction() {
              await wait(30);
              if (outcome === 'refuse') throw new Error('Privy refused');
              sent += 1;
              n += 1;
              return { hash: `0x${String(n).padStart(64, '0')}` };
            },
          }),
        };
      }
    },
  },
});

const rpcUrl = new URL('../src/config/rpc.js', import.meta.url).href;
const realRpc = await import(`${rpcUrl}?real`);
mock.module(rpcUrl, {
  namedExports: {
    ...realRpc,
    publicClient: {
      async waitForTransactionReceipt() {
        await wait(30);
        if (outcome === 'timeout') throw new Error('timed out');
        return { status: outcome === 'revert' ? 'reverted' : 'success' };
      },
      async readContract() { return 0n; },
      async getBalance() { return 0n; },
    },
  },
});

const { store } = await import('../api/_lib/common.js');
const { handleAgentAct } = await import('../api/_lib/agentWallet.js');
const { handleSwap } = await import('../api/_lib/agent.js');

const db = await store();
await db.write([['set', `agent_token:${createHash('sha256').update(KEY).digest('hex')}`, { userId: 'u', walletId: 'w', address: AGENT, mainAddress: MAIN }]]);

const act = (body) => handleAgentAct({ method: 'POST', headers: { authorization: `Bearer ${KEY}` }, body });
const transfer = (amount, to = STRANGER) => act({ action: 'transfer', token: 'ETH', to, amount: String(amount) });
const spentEth = async () => BigInt((await db.get(`agent_spend:${AGENT}:${new Date().toISOString().slice(0, 10)}`))?.ETH || '0');
const reset = async () => {
  outcome = 'ok';
  sent = 0;
  await db.write([['del', `agent_spend:${AGENT}:${new Date().toISOString().slice(0, 10)}`], ['del', `agent_lock:${AGENT}`]]);
};
const ETH = 10n ** 18n;

test('parallel transfers to other addresses cannot exceed the daily cap', async () => {
  await reset();
  const results = await Promise.all(Array.from({ length: 10 }, () => transfer(1)));
  const ok = results.filter((r) => r.status === 200).length;
  assert.equal(ok, 1, 'one transfer runs, the rest are told to retry');
  assert.ok(results.filter((r) => r.status === 429).every((r) => /still running/.test(r.body.error)));
  assert.equal(sent, 1);
  assert.equal(await spentEth(), ETH);
});

test('one by one, transfers stop at the cap (default 5 ETH)', async () => {
  await reset();
  for (let i = 0; i < 5; i++) assert.equal((await transfer(1)).status, 200);
  const sixth = await transfer(1);
  assert.equal(sixth.status, 403);
  assert.match(sixth.body.error, /Daily limit/);
  assert.equal(sent, 5);
  assert.equal(await spentEth(), 5n * ETH);
});

test('a reverted or refused transfer gives its reservation back', async () => {
  await reset();
  outcome = 'revert';
  assert.equal((await transfer(2)).status, 409);
  outcome = 'refuse';
  assert.equal((await transfer(2)).status, 500);
  assert.equal(await spentEth(), 0n);
  outcome = 'ok';
  assert.equal((await transfer(1)).status, 200, 'the lock was released');
});

test('a transfer that was sent but not confirmed stays counted', async () => {
  await reset();
  outcome = 'timeout';
  const res = await transfer(2);
  assert.equal(res.status, 409);
  assert.ok(res.body.hash);
  assert.equal(await spentEth(), 2n * ETH);
});

test('transfers to the main wallet have no cap and run in parallel', async () => {
  await reset();
  const results = await Promise.all(Array.from({ length: 4 }, () => transfer(3, MAIN)));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(await spentEth(), 0n);
});

test('agent swaps refuse a slippage above 5%', async () => {
  await reset();
  for (const slippage of [6, 50, 0, -1]) {
    const res = await act({ action: 'swap', side: 'buy', amount: '0.01', slippage });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /at most 5%/);
  }
  assert.equal(sent, 0);
});

test('a swap route through an unknown router is refused', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    json: async () => (String(url).includes('/route/build')
      ? { code: 0, data: { data: '0xdeadbeef', amountOut: '1000', routerAddress: STRANGER } }
      : { code: 0, data: { routeSummary: { amountOut: '1000' }, routerAddress: STRANGER } }),
  });
  try {
    const res = await handleSwap({ method: 'GET', query: { address: AGENT, side: 'buy', amount: '0.01' } });
    assert.equal(res.status, 502);
    assert.match(res.body.error, /unknown router/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ── checkTx: the rules for ready transactions ({"tx"} / {"txs"}) ──
const { encodeFunctionData, parseAbi } = await import('viem');
const { VIBE_TOKEN, VIBE_CLUB_NFT, STAKING_CONTRACT } = await import('../src/data/snapshot/constants.js');
const CHECK_IN = '0x1938BA215ef556e51eE6AaF909e0970AE0167634';
const ERC20_ABI = parseAbi(['function transfer(address,uint256)', 'function approve(address,uint256)']);
const STAKE_ABI = parseAbi(['function deposit(bytes32,uint256)', 'function claim(bytes32,uint64[],address)', 'function withdrawLots(bytes32,uint64[],uint256[],address)']);
const VAULT = `0x${'ab'.repeat(32)}`;
const erc20 = (fn, args) => encodeFunctionData({ abi: ERC20_ABI, functionName: fn, args });
const stake = (fn, args) => encodeFunctionData({ abi: STAKE_ABI, functionName: fn, args });
const sendTx = (tx) => act({ tx });
const setAllow = (allow) => db.write([['set', `agent_settings:${AGENT}`, { limits: {}, allow }]]);

test('ready txs go only to Vibe Hub contracts', async () => {
  await reset();
  await setAllow({});
  assert.equal((await sendTx({ to: CHECK_IN, data: '0x183ff085', value: '0' })).status, 200);
  for (const to of [STRANGER, KYBER, VIBE_CLUB_NFT]) {
    assert.equal((await sendTx({ to, data: '0x', value: '0' })).status, 403, to);
  }
  assert.equal(sent, 1);
});

test('Vibe Hub calls that take no ETH refuse ETH', async () => {
  await reset();
  const res = await sendTx({ to: CHECK_IN, data: '0x183ff085', value: '1' });
  assert.equal(res.status, 403);
  assert.match(res.body.error, /takes no ETH/);
});

test('$VIBE can only be approved for staking or the swap router, never sent with a raw tx', async () => {
  await reset();
  await setAllow({});
  assert.equal((await sendTx({ to: VIBE_TOKEN, data: erc20('approve', [STAKING_CONTRACT, 1n]) })).status, 200);
  assert.equal((await sendTx({ to: VIBE_TOKEN, data: erc20('approve', [KYBER, 1n]) })).status, 200);
  assert.equal((await sendTx({ to: VIBE_TOKEN, data: erc20('approve', [STRANGER, 1n]) })).status, 403);
  const raw = await sendTx({ to: VIBE_TOKEN, data: erc20('transfer', [STRANGER, 1n]) });
  assert.equal(raw.status, 403);
  assert.match(raw.body.error, /action":"transfer/);
  assert.equal(sent, 2);
});

test('staking payouts go only to the agent wallet', async () => {
  await reset();
  await setAllow({});
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: stake('deposit', [VAULT, 1n]) })).status, 200);
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: stake('claim', [VAULT, [1n], AGENT]) })).status, 200);
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: stake('claim', [VAULT, [1n], STRANGER]) })).status, 403);
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: stake('withdrawLots', [VAULT, [1n], [1n], STRANGER]) })).status, 403);
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: '0xdeadbeef' })).status, 403);
  assert.equal(sent, 2);
});

test('settings switches are enforced', async () => {
  await reset();
  await setAllow({ staking: false, swaps: false, transfers: false, mint: false });
  assert.equal((await sendTx({ to: STAKING_CONTRACT, data: stake('deposit', [VAULT, 1n]) })).status, 403);
  assert.equal((await sendTx({ to: VIBE_TOKEN, data: erc20('approve', [STAKING_CONTRACT, 1n]) })).status, 403);
  assert.equal((await sendTx({ to: VIBE_TOKEN, data: erc20('approve', [KYBER, 1n]) })).status, 403);
  assert.equal((await act({ action: 'swap', side: 'buy', amount: '0.01' })).status, 403);
  assert.equal((await act({ action: 'mint' })).status, 403);
  assert.equal((await transfer(1)).status, 403);
  assert.equal((await transfer(1, MAIN)).status, 200, 'the own main wallet always works');
  assert.equal(sent, 1);
  await setAllow({});
});

test('a tx built for another wallet is refused', async () => {
  await reset();
  const res = await sendTx({ to: CHECK_IN, data: '0x183ff085', value: '0', sender: STRANGER });
  assert.equal(res.status, 400);
});

test('a bad tx value is a 400, not a server error', async () => {
  await reset();
  for (const value of ['abc', '1.5', '-1', 1.5, -1, {}, '']) {
    const res = await sendTx({ to: CHECK_IN, data: '0x183ff085', value });
    assert.equal(res.status, 400, JSON.stringify(value));
  }
  for (const value of [undefined, 0, '0', '0x0']) {
    assert.equal((await sendTx({ to: CHECK_IN, data: '0x183ff085', value })).status, 200, JSON.stringify(value));
  }
});

test('at most 5 ready txs per request', async () => {
  await reset();
  const tx = { to: CHECK_IN, data: '0x183ff085', value: '0' };
  assert.equal((await act({ txs: Array(6).fill(tx) })).status, 400);
  assert.equal(sent, 0);
});
