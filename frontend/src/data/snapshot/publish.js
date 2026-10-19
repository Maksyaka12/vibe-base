// Signing text for publishing a snapshot; the server rebuilds it to verify the admin signature.
export const MAX_SNAPSHOT_BYTES = 900 * 1024; // stays under Upstash's 1 MB request limit

export function snapshotSignMessage({ address, issuedAt, type, round, root, hash }) {
  return [
    'Vibe Hub: publish reward snapshot',
    `Admin: ${address.toLowerCase()}`,
    `Issued: ${issuedAt}`,
    `Snapshot: ${type === 'holder' ? 'Holder rewards' : 'Vibe Club royalties'} #${round}`,
    `Merkle root: ${root}`,
    `Payload SHA-256: ${hash}`,
  ].join('\n');
}

// Signed once per run so the server lets the admin use its Blockscout key.
export function adminSessionMessage({ address, issuedAt }) {
  return ['Vibe Hub: admin data access', `Admin: ${String(address).toLowerCase()}`, `Issued: ${issuedAt}`].join('\n');
}
