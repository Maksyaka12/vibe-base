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
