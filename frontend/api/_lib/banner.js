// Core of /api/banner: the "claimed" banner image of each Vibe Club royalty round.
//
// GET ?round=N[&v=]   -> the image (cached long when v is given, the URL changes on every upload)
// PUT ?round=N  { type, data: base64 } with admin session headers -> { url } to put in the schedule

import { json, store, checkAdminSession } from './common.js';

const key = (round) => `vibe:banner:${round}`;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BANNER_BYTES = 600 * 1024; // keeps the stored base64 under Upstash's 1 MB request limit

async function shortHash(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleBanner({ method, query = {}, body, headers = {} }) {
  const round = Number(query.round);
  if (!Number.isInteger(round) || round < 1 || round > 9999) return json(400, { error: 'Invalid round' });

  try {
    const db = await store();

    if (method === 'GET') {
      const banner = await db.get(key(round));
      if (!banner) return json(404, { error: 'No banner for this round' }, { 'Cache-Control': 'public, max-age=60' });
      return {
        status: 200,
        raw: Buffer.from(banner.data, 'base64'),
        headers: {
          'Content-Type': banner.type,
          'Cache-Control': query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=60, s-maxage=300',
        },
      };
    }

    if (method === 'PUT') {
      const denied = await checkAdminSession(headers);
      if (denied) return denied;
      const { type, data } = body || {};
      if (!TYPES.includes(type) || typeof data !== 'string') return json(400, { error: 'Send a JPEG, PNG or WebP image' });
      const bytes = Buffer.from(data, 'base64');
      if (!bytes.length || bytes.length > MAX_BANNER_BYTES) return json(400, { error: 'Image is too large (max 600 KB after compression)' });
      await db.write([['set', key(round), { type, data, updatedAt: new Date().toISOString() }]]);
      return json(200, { url: `/api/banner?round=${round}&v=${await shortHash(data)}` }, { 'Cache-Control': 'no-store' });
    }

    return json(405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
