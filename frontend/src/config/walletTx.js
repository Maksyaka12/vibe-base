// Sending a transaction from the connected wallet (EOA or smart wallet) with the Base builder code.
// A rejection in the wallet throws right away (no second prompt); only an unsupported wallet_sendCalls
// falls back to eth_sendTransaction. Returns the tx hash, or null when a smart wallet accepted the call
// but never reported a hash: callers then confirm the result onchain instead.
import { appendBuilderSuffix, DATA_SUFFIX } from './builderCode';

/** User pressed reject / cancel in the wallet (EIP-1193 code 4001, or the wallet's own wording). */
export const isWalletRejection = (e) => e?.code === 4001 || e?.cause?.code === 4001 || /reject|denied|cancel/i.test(e?.message || '');

export async function sendWalletTx({ wallets, address, to, data, value = 0n }) {
  const wallet = wallets?.find((w) => w.address?.toLowerCase() === address?.toLowerCase()) || wallets?.[0];
  if (!wallet) throw new Error('Wallet not connected');
  const provider = await wallet.getEthereumProvider();
  const calldata = appendBuilderSuffix(data);
  const valueHex = '0x' + BigInt(value).toString(16);

  let callsRes;
  try {
    callsRes = await provider.request({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0',
        chainId: '0x2105',
        from: address,
        calls: [{ to, value: valueHex, data: calldata }],
        capabilities: { dataSuffix: { value: DATA_SUFFIX, optional: true } }
      }]
    });
  } catch (e) {
    if (isWalletRejection(e)) throw e;
    return provider.request({ method: 'eth_sendTransaction', params: [{ from: address, to, data: calldata, value: valueHex }] });
  }

  if (typeof callsRes === 'string' && /^0x[0-9a-fA-F]{64}$/.test(callsRes)) return callsRes;
  const callId = typeof callsRes === 'object' ? (callsRes?.id || callsRes) : callsRes;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    let status;
    try {
      status = await provider.request({ method: 'wallet_getCallsStatus', params: [callId] });
    } catch (e) {
      continue;
    }
    const receipt = status?.receipts?.[0];
    if (receipt?.transactionHash) {
      if (receipt.status === '0x0' || receipt.status === 0) throw new Error('Transaction reverted on Base');
      return receipt.transactionHash;
    }
    // EIP-5792: 400+ means the batch was rejected or failed
    if (typeof status?.status === 'number' && status.status >= 400) throw new Error('Transaction was rejected or failed');
  }
  return null;
}

/** Waits until `check()` is true (polled every 2s, up to ~60s). */
export async function waitUntil(check, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    if (await check().catch(() => false)) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
