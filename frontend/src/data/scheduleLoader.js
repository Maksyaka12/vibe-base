// Loads the schedule published from the admin panel and applies it over the built-in defaults.
// A cached copy is applied first; the network copy wins if it arrives within the timeout,
// otherwise it is cached for the next visit.
import { applySchedule, DEFAULT_SCHEDULE } from './rewardsSchedule';
import { validateSchedule } from './scheduleSchema';

const CACHE_KEY = 'vibe_schedule_v1';
const TIMEOUT_MS = 2500;

function tryApply(schedule) {
  try {
    applySchedule(validateSchedule(schedule));
    return true;
  } catch (e) {
    console.warn('Ignoring invalid published schedule:', e.message);
    return false;
  }
}

function writeCache(schedule) {
  try {
    if (schedule) localStorage.setItem(CACHE_KEY, JSON.stringify(schedule));
    else localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
}

export async function fetchPublishedSchedule({ fresh = false } = {}) {
  const res = await fetch(`/api/schedule${fresh ? '?fresh=1' : ''}`, fresh ? { cache: 'no-store' } : undefined);
  if (!res.ok) throw new Error(`Schedule request failed (${res.status})`);
  return res.json();
}

export async function loadPublishedSchedule() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached) tryApply(cached);
  } catch (e) {}

  const remote = fetchPublishedSchedule().catch(() => undefined);
  const result = await Promise.race([remote, new Promise((r) => setTimeout(() => r('timeout'), TIMEOUT_MS))]);

  const handle = (record) => {
    if (!record) return;
    if (record.schedule === null) {
      applySchedule(DEFAULT_SCHEDULE);
      writeCache(null);
    } else if (record.schedule && tryApply(record.schedule)) {
      writeCache(record.schedule);
    }
  };

  if (result === 'timeout') remote.then((record) => record && writeCache(record.schedule ?? null));
  else handle(result);
}

// Used by the admin editor right after publishing.
export function applyPublishedSchedule(schedule) {
  if (tryApply(schedule)) writeCache(schedule);
}
