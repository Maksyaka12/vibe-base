// Merkle tree used by the reward distributors: leaf = keccak256(abi.encodePacked(address, epochId, amountWei)),
// pairs hashed in sorted order, an odd node is carried up unchanged.
// Must stay byte-for-byte identical to scripts/makeSnapshot.cjs and makeVibeClubSnapshot.cjs.
import { keccak256, encodePacked, concatHex } from 'viem';

export function claimLeaf(address, round, amountWei) {
  return keccak256(encodePacked(['address', 'uint256', 'uint256'], [address, BigInt(round), BigInt(amountWei)]));
}

function hashPair(a, b) {
  return a.toLowerCase() < b.toLowerCase() ? keccak256(concatHex([a, b])) : keccak256(concatHex([b, a]));
}

// elements: [{ leaf, ... }] in the order they should appear as leaves.
// Returns { root, proofs: string[][] } with proofs[i] for elements[i].
export function buildMerkleTree(elements) {
  const leaves = elements.map((e) => e.leaf);
  if (leaves.length === 0) return { root: '0x0', proofs: [] };

  const layers = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const current = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? hashPair(current[i], current[i + 1]) : current[i]);
    }
    layers.push(next);
  }

  const proofs = elements.map((_, i) => {
    const proof = [];
    let idx = i;
    for (let l = 0; l < layers.length - 1; l++) {
      const pair = idx % 2 === 1 ? idx - 1 : idx + 1;
      if (pair < layers[l].length) proof.push(layers[l][pair]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  });

  return { root: layers[layers.length - 1][0], proofs };
}

export function verifyProof(leaf, proof, root) {
  let hash = leaf;
  for (const p of proof) hash = hashPair(hash, p);
  return hash.toLowerCase() === root.toLowerCase();
}
