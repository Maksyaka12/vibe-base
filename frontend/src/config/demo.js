// Read-only demo mode for hackathon judges: the whole site shows real onchain and API data for one fixed
// address, and nothing can be signed or sent. The mode lives in the URL (#demo), so a link can be shared.
// When a real wallet connects, demo mode turns off (see DemoController) and the site works as usual.

/**
 * The one address the demo shows. Change it here only. A regular holder (Vibe Club NFT, 5M+ $VIBE, open claims),
 * never the admin wallet: tests/demo.test.js checks that.
 */
export const DEMO_ADDRESS = '0x8B8D77c89d33879E9ad4Cf72ED4F4f196358F837';
export const DEMO_HASH = '#demo';

const CHANGE_EVENT = 'vibe_demo_change';
export const PREVIEW_EVENT = 'vibe_demo_tx_preview';

const hasWindow = () => typeof window !== 'undefined';
const hashIsDemo = () => hasWindow() && window.location?.hash === DEMO_HASH;

let demoOn = null; // read from the URL on first use
const ensure = () => {
  if (demoOn === null) demoOn = hashIsDemo();
  return demoOn;
};

const notify = () => {
  if (hasWindow() && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(CHANGE_EVENT));
};

const replaceHash = (hash) => {
  if (!hasWindow() || !window.history?.replaceState) return;
  const { pathname, search } = window.location;
  // keep the router's own history state
  window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`);
};

/** True while the site is in read-only demo mode. Every transaction path checks this. */
export function isDemoActive() {
  return ensure();
}

export function enterDemo() {
  demoOn = true;
  if (!hashIsDemo()) replaceHash(DEMO_HASH);
  notify();
}

export function exitDemo() {
  demoOn = false;
  if (hashIsDemo()) replaceHash('');
  notify();
}

/** Puts #demo back after an in-app navigation dropped it, so the address bar stays shareable. */
export function keepDemoHash() {
  if (ensure() && hasWindow() && !window.location.hash) replaceHash(DEMO_HASH);
}

export function subscribeDemo(cb) {
  if (!hasWindow()) return () => {};
  // Only an explicit change of the hash switches the mode: #demo turns it on, an empty hash (e.g. going back
  // past the point where the demo started) turns it off. Other anchors (#vesting-details) leave it as it is.
  const onHash = () => {
    const h = window.location.hash;
    const next = h === DEMO_HASH ? true : h === '' ? false : ensure();
    if (next !== ensure()) {
      demoOn = next;
      notify();
    }
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('hashchange', onHash);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('hashchange', onHash);
  };
}

/* ── Transaction previews ─────────────────────────────────────────────────────────────────────────── */

export const basescanAddress = (a) => `https://basescan.org/address/${a}`;

/**
 * Shows what an action would do, instead of doing it.
 * preview: { action, amount, contract, contractLabel?, method?, note? }
 */
export function showDemoTxPreview(preview) {
  if (!hasWindow() || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: { from: DEMO_ADDRESS, ...preview } }));
}

export function subscribeDemoPreview(cb) {
  if (!hasWindow()) return () => {};
  const handler = (e) => cb(e.detail);
  window.addEventListener(PREVIEW_EVENT, handler);
  return () => window.removeEventListener(PREVIEW_EVENT, handler);
}

export class DemoModeError extends Error {
  constructor(message = 'Read-only demo: no transaction was sent') {
    super(message);
    this.name = 'DemoModeError';
    this.code = 'DEMO_READ_ONLY';
  }
}

export const isDemoModeError = (e) => e?.code === 'DEMO_READ_ONLY';

/**
 * Last line of defence for every transaction path: in demo mode it shows the preview and throws,
 * so the code after it (the wallet request) never runs.
 */
export function blockInDemo(preview) {
  if (!isDemoActive()) return;
  showDemoTxPreview(preview);
  throw new DemoModeError();
}

/**
 * True for a request the read-only demo must not send: anything but GET/HEAD to this site's own /api
 * (agent settings, keys, admin uploads). Reads stay allowed, so the demo shows live data.
 */
export function isBlockedDemoRequest(input, init) {
  const method = String(init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return false;
  const raw = typeof input === 'string' ? input : input?.url || String(input);
  try {
    const origin = hasWindow() && window.location?.origin ? window.location.origin : 'https://vibehome.dog';
    const url = new URL(raw, origin);
    return url.origin === origin && url.pathname.startsWith('/api/');
  } catch (e) {
    return false;
  }
}

/**
 * Installs once a fetch wrapper that, while the demo is on, refuses writes to /api before they leave the
 * browser. Outside the demo every request goes through unchanged. A wallet may be connected during the demo,
 * so this keeps its Privy session from changing anything on the server.
 */
export function installDemoFetchGuard() {
  if (!hasWindow() || typeof window.fetch !== 'function' || window.fetch.__vibeDemoGuard) return;
  const original = window.fetch.bind(window);
  const guarded = (input, init) => {
    if (isDemoActive() && isBlockedDemoRequest(input, init)) return Promise.reject(new DemoModeError('Read-only demo: nothing was saved'));
    return original(input, init);
  };
  guarded.__vibeDemoGuard = true;
  window.fetch = guarded;
}

/** Wallet RPC methods that sign or send anything. */
export const SIGNING_METHODS = new Set([
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
  'wallet_grantPermissions',
]);

const previewFromRequest = ({ method, params } = {}) => {
  const p = Array.isArray(params) ? params[0] : undefined;
  const call = p?.calls?.[0] || p || {};
  let amount = '';
  try {
    if (call.value && BigInt(call.value) > 0n) amount = `${Number(BigInt(call.value)) / 1e18} ETH`;
  } catch (e) {}
  return {
    action: `Wallet request: ${method}`,
    amount,
    contract: typeof call.to === 'string' ? call.to : '',
    method: typeof call.data === 'string' ? call.data.slice(0, 10) : '',
  };
};

/**
 * Wraps an EIP-1193 provider so that, in demo mode, any signing or sending request is refused before it
 * reaches the wallet. Read requests pass through. Outside demo mode the provider behaves exactly as before.
 */
export function guardProvider(provider) {
  if (!provider || typeof provider.request !== 'function') return provider;
  return new Proxy(provider, {
    get(target, prop) {
      if (prop === 'request') {
        return (args) => {
          if (isDemoActive() && SIGNING_METHODS.has(args?.method)) {
            showDemoTxPreview(previewFromRequest(args));
            return Promise.reject(new DemoModeError());
          }
          return target.request(args);
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}
