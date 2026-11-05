// The Merkle tree the reward contracts verify claims against.
import test from 'node:test';
import assert from 'node:assert/strict';
import { claimLeaf, buildMerkleTree, verifyProof } from '../src/data/snapshot/merkle.js';

const WALLETS = [
  '0x07eba7dff730f58e932c5730bad48e757e188fc3',
  '0x94bb005711648e57dccc1770d84c54e71115ca81',
  '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a',
];

const elements = (count) => WALLETS.slice(0, count).map((address, i) => ({
  address,
  amountWei: BigInt(i + 1) * 10n ** 18n,
  leaf: claimLeaf(address, 7, BigInt(i + 1) * 10n ** 18n),
}));

for (const count of [1, 2, 3]) {
  test(`every proof verifies in a tree of ${count}`, () => {
    const list = elements(count);
    const { root, proofs } = buildMerkleTree(list);
    list.forEach((e, i) => assert.equal(verifyProof(e.leaf, proofs[i], root), true));
  });
}

test('a claim with another amount, wallet or round does not verify', () => {
  const list = elements(3);
  const { root, proofs } = buildMerkleTree(list);
  const { address, amountWei } = list[0];
  assert.equal(verifyProof(claimLeaf(address, 7, amountWei + 1n), proofs[0], root), false);
  assert.equal(verifyProof(claimLeaf(WALLETS[1], 7, amountWei), proofs[0], root), false);
  assert.equal(verifyProof(claimLeaf(address, 8, amountWei), proofs[0], root), false);
});

test('a proof from another wallet does not verify', () => {
  const list = elements(3);
  const { root, proofs } = buildMerkleTree(list);
  assert.equal(verifyProof(list[0].leaf, proofs[1], root), false);
});
