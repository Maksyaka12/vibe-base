// Finding a wallet's Vibe Club NFT, shared by both themes (profile avatar, mint card).
// Token ids are spread over 1..333, so every id is checked rather than the first few.
import { parseAbi } from 'viem';
import { VIBE_CLUB_NFT } from './snapshot/constants.js';

export const VIBE_CLUB_MAX_SUPPLY = 333;

const ownerOfAbi = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);

// Token ids the wallet holds now, lowest first. null when the chain could not be read (keep what you had).
export async function findOwnedVibeClubNfts(client, address) {
  if (!address) return [];
  const ids = Array.from({ length: VIBE_CLUB_MAX_SUPPLY }, (_, i) => i + 1);
  const results = await client.multicall({
    contracts: ids.map((id) => ({ address: VIBE_CLUB_NFT, abi: ownerOfAbi, functionName: 'ownerOf', args: [BigInt(id)] })),
    allowFailure: true,
  });
  // unminted ids revert, so failures are normal; a mostly failed read means the RPC did not answer
  if (results.filter((r) => r.status === 'success').length === 0) return null;
  const me = address.toLowerCase();
  return ids.filter((id, i) => results[i].status === 'success' && String(results[i].result).toLowerCase() === me);
}

const mintedKey = (address) => `vibe_minted_nft_${address.toLowerCase()}`;

export function rememberMintedVibeClubNft(address, tokenId) {
  try {
    if (address && tokenId) localStorage.setItem(mintedKey(address), String(tokenId));
  } catch (e) {}
}

// The token id this wallet minted: saved on this device at mint time, else asked from /api/minted-nft
// (the mint transfer, via Alchemy). null when unknown.
export async function findMintedVibeClubNft(address) {
  if (!address) return null;
  try {
    const saved = Number(localStorage.getItem(mintedKey(address)));
    if (saved > 0) return saved;
  } catch (e) {}
  try {
    const res = await fetch(`/api/minted-nft?address=${address.toLowerCase()}`);
    if (!res.ok) return null;
    const { tokenId } = await res.json();
    if (tokenId) rememberMintedVibeClubNft(address, tokenId);
    return tokenId || null;
  } catch (e) {
    return null;
  }
}
