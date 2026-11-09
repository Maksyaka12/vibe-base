// Holder snapshot rules: who is left out, and how the pool is split under the per-wallet cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HOLDER_EXCLUSIONS, proportionalWithCap } from '../src/data/snapshot/engine.js';
import { DISTRIBUTORS } from '../src/config/distributors.js';

// Every contract or protocol wallet that holds $VIBE, written out by hand on purpose: if a shared constant
// changes, this list must be changed knowingly too.
const PROTOCOL = {
  'token': '0xb200000000000000000000df24ecb8bf51100a01',
  'Uniswap v4 pool manager': '0x498581ff718922c3f8e6a244956af099b2652b2b',
  'vesting vault': '0x3beea54db87a632a5faf20db6765d3af94c81b31',
  'o1 Exchange staking': '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4',
  'buyback and community pool': '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf',
  'burn address': '0x000000000000000000000000000000000000dEaD',
  'zero address': '0x0000000000000000000000000000000000000000',
};

for (const [name, address] of Object.entries(PROTOCOL)) {
  test(`the holder snapshot leaves out the ${name}`, () => {
    assert.ok(HOLDER_EXCLUSIONS.includes(address.toLowerCase()));
  });
}

test('the holder snapshot leaves out every reward distributor, v1 and v2', () => {
  for (const type of ['holder', 'royalty']) {
    for (const v of ['v1', 'v2']) assert.ok(HOLDER_EXCLUSIONS.includes(DISTRIBUTORS[type][v].toLowerCase()), `${type} ${v}`);
  }
});

test('the agent API and the snapshot use the same staking contract', () => {
  const api = fs.readFileSync(new URL('../api/_lib/agent.js', import.meta.url), 'utf8');
  for (const [, address] of api.matchAll(/STAKING(?:_ADDRESS)? = '(0x[0-9a-fA-F]{40})'/g)) {
    assert.ok(HOLDER_EXCLUSIONS.includes(address.toLowerCase()), address);
  }
});

test('the command-line snapshot script excludes the same addresses', () => {
  const script = fs.readFileSync(new URL('../../scripts/makeSnapshot.cjs', import.meta.url), 'utf8');
  const block = script.match(/const SYSTEM_EXCLUSIONS = \[([\s\S]*?)\]/)[1];
  const listed = [...block.matchAll(/0x[0-9a-fA-F]{40}/g)].map((m) => m[0].toLowerCase());
  assert.deepEqual([...listed].sort(), [...HOLDER_EXCLUSIONS].sort());
});

const holders = (...balances) => balances.map((balance, i) => ({ address: `w${i}`, balance }));
const split = (eligible, pool, cap) => [...proportionalWithCap(eligible, pool, cap).values()].map((r) => r.amount);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

test('without caps the whole pool is shared in proportion', () => {
  const amounts = split(holders(600, 300, 100), 1000, 1000);
  assert.deepEqual(amounts, [600, 300, 100]);
});

test('no wallet gets more than the cap, and what capped wallets leave goes to the others', () => {
  const amounts = split(holders(500, 300, 100, 100), 1000, 300);
  assert.deepEqual(amounts, [300, 300, 200, 200]);
  assert.equal(sum(amounts), 1000);
});

test('a cap reached only after redistribution is applied too', () => {
  // 900 is capped first; then 60 / 40 split the remaining 600 and 60 would get 360, above the cap of 350
  const amounts = split(holders(900, 60, 40), 1000, 350);
  assert.ok(amounts.every((a) => a <= 350));
  assert.equal(sum(amounts), 1000);
});

test('rounding never pays more than the pool, and the leftover goes to the largest holders', () => {
  const amounts = split(holders(1, 1, 1), 10, 100);
  assert.deepEqual(amounts, [4, 3, 3]);
  const many = split(holders(...Array.from({ length: 37 }, (_, i) => 5_000_000 + i * 123_457)), 10_000_000, 500_000);
  assert.equal(sum(many), 10_000_000);
  assert.ok(many.every((a) => Number.isInteger(a) && a <= 500_000));
});

test('when every wallet is capped the rest of the pool stays unallocated', () => {
  const amounts = split(holders(10, 10, 10), 1000, 100);
  assert.deepEqual(amounts, [100, 100, 100]);
});
