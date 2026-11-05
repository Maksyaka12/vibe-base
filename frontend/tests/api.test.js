// API guards: requests that must be refused before anything touches the chain, a wallet or the database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleClaims, handleStatus, handleStaking, handleSwap, handleHistory } from '../api/_lib/agent.js';
import { handleAgentAct, handleAgentToken, handleAgentSettings } from '../api/_lib/agentWallet.js';
import { handleNftBurned } from '../api/_lib/nftBurned.js';
import { isAdmin } from '../api/_lib/common.js';

const WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

for (const [name, handle] of Object.entries({ handleClaims, handleStatus, handleStaking, handleSwap, handleHistory })) {
  test(`${name} is read-only`, async () => {
    const res = await handle({ method: 'POST', query: { address: WALLET } });
    assert.equal(res.status, 405);
  });

  test(`${name} refuses a missing or invalid wallet`, async () => {
    assert.equal((await handle({ method: 'GET', query: {} })).status, 400);
    assert.equal((await handle({ method: 'GET', query: { address: 'not-a-wallet' } })).status, 400);
  });
}

test('the agent cannot act with a GET request', async () => {
  const res = await handleAgentAct({ method: 'GET', headers: {}, body: {} });
  assert.equal(res.status, 405);
});

test('the agent cannot act without a key', async () => {
  const res = await handleAgentAct({ method: 'POST', headers: {}, body: { action: 'mint' } });
  assert.equal(res.status, 401);
});

test('the agent cannot act with a made-up key', async () => {
  const res = await handleAgentAct({ method: 'POST', headers: { authorization: 'Bearer vibe_agent_fake' }, body: { action: 'mint' } });
  assert.ok([401, 403, 503].includes(res.status), `status ${res.status}`);
});

test('agent keys and settings need a login', async () => {
  assert.equal((await handleAgentToken({ method: 'GET', headers: {} })).status, 401);
  assert.equal((await handleAgentSettings({ method: 'GET', headers: {} })).status, 401);
});

test('burned totals are read-only and need the Alchemy key', async () => {
  const saved = process.env.ALCHEMY_API_KEY;
  delete process.env.ALCHEMY_API_KEY;
  try {
    assert.equal((await handleNftBurned({ method: 'POST' })).status, 405);
    assert.equal((await handleNftBurned({ method: 'GET' })).status, 503);
  } finally {
    if (saved !== undefined) process.env.ALCHEMY_API_KEY = saved;
  }
});

test('only listed wallets are admins', () => {
  const saved = process.env.SCHEDULE_ADMINS;
  process.env.SCHEDULE_ADMINS = `${WALLET}, 0x0000000000000000000000000000000000000001`;
  try {
    assert.equal(isAdmin(WALLET), true);
    assert.equal(isAdmin(WALLET.toUpperCase().replace('0X', '0x')), true);
    assert.equal(isAdmin('0x0000000000000000000000000000000000000002'), false);
    assert.equal(isAdmin(undefined), false);
  } finally {
    if (saved === undefined) delete process.env.SCHEDULE_ADMINS;
    else process.env.SCHEDULE_ADMINS = saved;
  }
});
