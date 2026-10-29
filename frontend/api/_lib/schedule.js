// Core of /api/schedule, shared by the Vercel function (api/schedule.js) and the Vite dev server.
//
// GET  -> { schedule, updatedAt, updatedBy } (schedule is null until the admin publishes one)
// GET ?history=1 -> { history: [{ schedule, updatedAt, updatedBy }, ...] } newest first
// PUT  { schedule: "<json>", address, issuedAt, signature } -> saves after verifying the admin signature

import { json, store, checkAdminSignature } from './common.js';
import { validateSchedule, hashScheduleJson, scheduleSignMessage, MAX_SCHEDULE_BYTES } from '../../src/data/scheduleSchema.js';

const KEY = 'vibe:schedule';
const HISTORY_KEY = 'vibe:schedule:history';
const HISTORY_LIMIT = 50;

export async function handleSchedule({ method, query = {}, body }) {
  try {
    const db = await store();

    if (method === 'GET') {
      if (query.history) return json(200, { history: await db.list(HISTORY_KEY, HISTORY_LIMIT) }, { 'Cache-Control': 'no-store' });
      const record = await db.get(KEY);
      return json(200, record || { schedule: null }, {
        'Cache-Control': query.fresh ? 'no-store' : 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
      });
    }

    if (method === 'PUT') {
      const { schedule: scheduleJson, address, issuedAt, signature } = body || {};
      if (typeof scheduleJson !== 'string' || scheduleJson.length > MAX_SCHEDULE_BYTES) return json(400, { error: 'Invalid schedule payload' });

      let schedule;
      try {
        schedule = validateSchedule(JSON.parse(scheduleJson));
      } catch (e) {
        return json(400, { error: e.message });
      }

      const message = scheduleSignMessage({ address: String(address || ''), issuedAt, hash: await hashScheduleJson(scheduleJson) });
      const denied = await checkAdminSignature({ address, issuedAt, signature, message });
      if (denied) return denied;

      const previous = await db.get(KEY);
      const record = { schedule, updatedAt: new Date().toISOString(), updatedBy: address.toLowerCase() };
      await db.write([['set', KEY, record], ...(previous ? [['push', HISTORY_KEY, previous, HISTORY_LIMIT]] : [])]);
      return json(200, record, { 'Cache-Control': 'no-store' });
    }

    return json(405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
