// Read-only demo mode: no path may reach a wallet's signing or sending methods.
import test from 'node:test';
import assert from 'node:assert/strict';

// A minimal browser: the URL hash, history and events, enough for src/config/demo.js.
const listeners = {};
globalThis.window = {
  location: { pathname: '/hub', search: '', hash: '#demo' },
  history: {
    state: { idx: 0 },
    replaceState(state, _title, url) {
      this.state = state;
      const u = new URL(url, 'https://vibehome.dog');
      window.location.pathname = u.pathname;
      window.location.search = u.search;
      window.location.hash = u.hash;
    },
  },
  addEventListener: (type, cb) => { (listeners[type] ||= new Set()).add(cb); },
  removeEventListener: (type, cb) => { listeners[type]?.delete(cb); },
  dispatchEvent: (e) => { listeners[e.type]?.forEach((cb) => cb(e)); return true; },
};

const demo = await import('../src/config/demo.js');
const { sendWalletTx } = await import('../src/config/walletTx.js');
const { DEMO_ADDRESS, isDemoActive, enterDemo, exitDemo, keepDemoHash, guardProvider, blockInDemo, isDemoModeError, SIGNING_METHODS, subscribeDemoPreview } = demo;

const TO = '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886';

/** A wallet that records every request it gets. */
function spyWallet(address = DEMO_ADDRESS) {
  const calls = [];
  const provider = {
    request: async (args) => {
      calls.push(args.method);
      if (args.method === 'wallet_sendCalls') return '0x' + 'ab'.repeat(32);
      return '0x1';
    },
  };
  return { calls, wallet: { address, getEthereumProvider: async () => provider } };
}

test('the demo address is a valid checksummed-length address', () => {
  assert.match(DEMO_ADDRESS, /^0x[0-9a-fA-F]{40}$/);
});

test('#demo in the URL turns demo mode on', () => {
  assert.equal(isDemoActive(), true);
});

test('sendWalletTx in demo mode throws and never touches the wallet', async () => {
  enterDemo();
  const { calls, wallet } = spyWallet();
  let previewed = null;
  const off = subscribeDemoPreview((p) => { previewed = p; });
  await assert.rejects(
    sendWalletTx({ wallets: [wallet], address: DEMO_ADDRESS, to: TO, data: '0x1249c58b', value: 5n * 10n ** 15n }),
    (e) => isDemoModeError(e),
  );
  off();
  assert.deepEqual(calls, [], 'the wallet received no request');
  assert.equal(previewed.contract, TO, 'a preview was shown instead');
  assert.equal(previewed.from, DEMO_ADDRESS);
});

test('sendWalletTx in demo mode shows the caller\'s own preview', async () => {
  enterDemo();
  let previewed = null;
  const off = subscribeDemoPreview((p) => { previewed = p; });
  const { wallet } = spyWallet();
  await assert.rejects(sendWalletTx({ wallets: [wallet], address: DEMO_ADDRESS, to: TO, data: '0x', preview: { action: 'Daily check-in', amount: '', contract: TO } }));
  off();
  assert.equal(previewed.action, 'Daily check-in');
});

test('sendWalletTx in demo mode refuses even with no wallet at all', async () => {
  enterDemo();
  await assert.rejects(sendWalletTx({ wallets: [], address: DEMO_ADDRESS, to: TO, data: '0x' }), (e) => isDemoModeError(e));
});

for (const method of SIGNING_METHODS) {
  test(`a guarded provider refuses ${method} in demo mode`, async () => {
    enterDemo();
    const { calls, wallet } = spyWallet();
    const provider = guardProvider(await wallet.getEthereumProvider());
    await assert.rejects(provider.request({ method, params: [{ to: TO, data: '0x', value: '0x0' }] }), (e) => isDemoModeError(e));
    assert.deepEqual(calls, []);
  });
}

test('a guarded provider still answers read requests in demo mode', async () => {
  enterDemo();
  const { calls, wallet } = spyWallet();
  const provider = guardProvider(await wallet.getEthereumProvider());
  assert.equal(await provider.request({ method: 'eth_chainId' }), '0x1');
  assert.deepEqual(calls, ['eth_chainId']);
});

test('blockInDemo stops the code after it', () => {
  enterDemo();
  let reached = false;
  assert.throws(() => {
    blockInDemo({ action: 'Claim', contract: TO });
    reached = true;
  }, (e) => isDemoModeError(e));
  assert.equal(reached, false);
});

test('the URL keeps #demo after an in-app navigation dropped it', () => {
  enterDemo();
  window.history.replaceState(window.history.state, '', '/claim');
  assert.equal(window.location.hash, '');
  keepDemoHash();
  assert.equal(window.location.hash, '#demo');
  assert.equal(window.location.pathname, '/claim');
});

test('outside demo mode a transaction reaches the wallet as before', async () => {
  exitDemo();
  assert.equal(isDemoActive(), false);
  assert.equal(window.location.hash, '');
  const { calls, wallet } = spyWallet();
  const hash = await sendWalletTx({ wallets: [wallet], address: DEMO_ADDRESS, to: TO, data: '0x' });
  assert.equal(hash, '0x' + 'ab'.repeat(32));
  assert.deepEqual(calls, ['wallet_sendCalls']);
  const provider = guardProvider(await wallet.getEthereumProvider());
  await provider.request({ method: 'personal_sign', params: [] });
  assert.deepEqual(calls, ['wallet_sendCalls', 'personal_sign']);
  assert.doesNotThrow(() => blockInDemo({ action: 'Claim' }));
});

// Every place in the app that gets a wallet provider must go through guardProvider (or sendWalletTx),
// so a new code path cannot sign or send in demo mode by accident.
test('every wallet provider in the app is wrapped by guardProvider', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = new URL('../src/', import.meta.url).pathname;
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(d.name)) files.push(p);
  });
  walk(root);
  const unguarded = [];
  for (const file of files) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/getEthereumProvider\(\)|window\.ethereum\b/.test(code) && !/guardProvider\(/.test(code)) unguarded.push(`${path.relative(root, file)}:${i + 1}`);
      // wallet hooks that sign or send outside our guarded paths
      if (/\b(useSendTransaction|useWriteContract|useSignMessage|useSignTypedData|useSendCalls)\b/.test(code)) unguarded.push(`${path.relative(root, file)}:${i + 1}`);
    });
  }
  assert.deepEqual(unguarded, []);
});
