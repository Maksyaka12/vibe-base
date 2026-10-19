// Core of /api/snapshots (reward snapshots made in the admin panel).
//
// GET                    -> { snapshots: [summary, ...] } newest first (no proofs)
// GET ?type=&round=      -> full snapshot with claims and proofs
// PUT { snapshot: "<json>", address, issuedAt, signature } -> saves after verifying the admin
//      signature and that every proof matches the Merkle root.

import { json, store, checkAdminSignature } from './common.js';
import { claimLeaf, verifyProof } from '../../src/data/snapshot/merkle.js';
import { hashScheduleJson } from '../../src/data/scheduleSchema.js';
import { snapshotSignMessage, MAX_SNAPSHOT_BYTES } from '../../src/data/snapshot/publish.js';

const key = (type, round) => `vibe:snapshot:${type}:${round}`;
const INDEX_KEY = 'vibe:snapshots';

const summaryOf = (s) => ({
  type: s.type,
  round: s.round,
  pool: s.pool,
  rules: s.rules,
  snapshotBlock: s.snapshotBlock,
  snapshotTime: s.snapshotTime,
  merkleRoot: s.merkleRoot,
  totalWallets: s.totalWallets,
  totalDistributed: s.totalDistributed,
  publishedAt: s.publishedAt,
  publishedBy: s.publishedBy,
});

function validate(s) {
  if (!s || (s.type !== 'holder' && s.type !== 'royalty')) throw new Error('Unknown snapshot type');
  if (!Number.isInteger(s.round) || s.round < 1) throw new Error('Invalid round');
  if (!(s.pool > 0)) throw new Error('Invalid pool');
  if (!/^0x[0-9a-fA-F]{64}$/.test(s.merkleRoot || '')) throw new Error('Invalid Merkle root');
  const claims = Object.entries(s.claims || {});
  if (!claims.length) throw new Error('Snapshot has no eligible wallets');
  let total = 0;
  for (const [addr, c] of claims) {
    if (addr !== String(c.address).toLowerCase()) throw new Error(`Claim key mismatch for ${addr}`);
    const leaf = claimLeaf(c.address, s.round, BigInt(c.amountWei));
    if (leaf !== c.leaf || !verifyProof(leaf, c.proof || [], s.merkleRoot)) throw new Error(`Proof does not match the root for ${addr}`);
    total += Number(c.amount);
  }
  if (total > s.pool + 1) throw new Error('Allocations exceed the pool');
}

export async function handleSnapshots({ method, query = {}, body }) {
  try {
    const db = await store();

    if (method === 'GET') {
      if (query.type && query.round) {
        const snap = await db.get(key(query.type, Number(query.round)));
        return snap ? json(200, snap, { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' }) : json(404, { error: 'Snapshot not found' });
      }
      const index = Object.values(await db.hgetall(INDEX_KEY));
      index.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
      return json(200, { snapshots: index }, { 'Cache-Control': 'no-store' });
    }

    if (method === 'PUT') {
      const { snapshot: snapJson, address, issuedAt, signature } = body || {};
      if (typeof snapJson !== 'string' || snapJson.length > MAX_SNAPSHOT_BYTES) return json(400, { error: 'Invalid snapshot payload' });

      let snap;
      try {
        snap = JSON.parse(snapJson);
        validate(snap);
      } catch (e) {
        return json(400, { error: e.message });
      }

      const message = snapshotSignMessage({ address: String(address || ''), issuedAt, type: snap.type, round: snap.round, root: snap.merkleRoot, hash: await hashScheduleJson(snapJson) });
      const denied = await checkAdminSignature({ address, issuedAt, signature, message });
      if (denied) return denied;

      const record = { ...snap, publishedAt: new Date().toISOString(), publishedBy: address.toLowerCase() };
      await db.write([
        ['set', key(snap.type, snap.round), record],
        ['hset', INDEX_KEY, `${snap.type}:${snap.round}`, summaryOf(record)],
      ]);
      return json(200, summaryOf(record), { 'Cache-Control': 'no-store' });
    }

    return json(405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
