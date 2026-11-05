// Every proof bundled with the site must verify against its round's root, or that wallet cannot claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { claimLeaf, verifyProof } from '../src/data/snapshot/merkle.js';

const DATA = new URL('../src/data/', import.meta.url);
const SNAPSHOTS = new URL('../../snapshots/', import.meta.url);
const files = fs.readdirSync(DATA).filter((f) => f.endsWith('_proofs.json'));

// Unlock 1 is closed and came out 3 $VIBE over its pool through rounding. New rounds get no allowance.
const ROUNDING = { 'round_1_proofs.json': 3 };

test('all bundled rounds are found', () => {
  assert.ok(files.length >= 8, `found ${files.length}`);
});

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(new URL(file, DATA), 'utf8'));
  const round = data.round ?? data.epoch;

  test(`${file}: every wallet's proof verifies`, () => {
    const claims = Object.entries(data.claims);
    assert.ok(claims.length > 0);
    for (const [address, claim] of claims) {
      const leaf = claimLeaf(address, round, claim.amountWei);
      assert.equal(leaf.toLowerCase(), claim.leaf.toLowerCase(), `${address}: wrong leaf`);
      assert.equal(verifyProof(leaf, claim.proof, data.merkleRoot), true, `${address}: proof fails`);
    }
  });

  test(`${file}: the site uses the published root`, () => {
    const rootFile = new URL(file.replace('_proofs.json', '_root.txt'), SNAPSHOTS);
    assert.equal(fs.readFileSync(rootFile, 'utf8').trim().toLowerCase(), data.merkleRoot.toLowerCase());
  });

  const pool = data.poolAmount ?? data.monthlyPool;
  if (pool !== undefined) {
    test(`${file}: payouts do not exceed the pool`, () => {
      const total = Object.values(data.claims).reduce((sum, c) => sum + BigInt(c.amountWei), 0n);
      const allowed = (BigInt(pool) + BigInt(ROUNDING[file] || 0)) * 10n ** 18n;
      assert.ok(total <= allowed, `total ${total} is over the pool ${pool}`);
    });
  }
}
