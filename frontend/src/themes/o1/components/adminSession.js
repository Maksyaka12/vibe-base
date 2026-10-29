// Admin "session" headers for admin-only API calls (/api/transfers, /api/banner).
// The admin signs once; the signature is reused until shortly before the server's 2-hour limit.
import { stringToHex } from 'viem';
import { adminSessionMessage } from '../../../data/snapshot/publish';

const REUSE_MS = 90 * 60 * 1000;
let cached = null;

export function pickAdminWallet(wallets, activeAddress) {
  return wallets.find((w) => w.address.toLowerCase() === activeAddress?.toLowerCase()) || wallets[0];
}

export async function adminSessionHeaders(wallet) {
  if (!wallet) throw new Error('Connect the admin wallet first.');
  const address = wallet.address.toLowerCase();
  if (cached && cached.address === address && Date.now() - cached.at < REUSE_MS) return cached.headers;
  const issuedAt = new Date().toISOString();
  const provider = await wallet.getEthereumProvider();
  const signature = await provider.request({ method: 'personal_sign', params: [stringToHex(adminSessionMessage({ address: wallet.address, issuedAt })), wallet.address] });
  const headers = { 'x-admin-address': wallet.address, 'x-admin-issued': issuedAt, 'x-admin-signature': signature };
  cached = { address, at: Date.now(), headers };
  return headers;
}

// Re-encodes an image as JPEG, scaled to at most maxWidth and compressed until it fits maxBytes.
export async function compressImage(file, { maxWidth = 1600, maxBytes = 600 * 1024 } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('This file is not an image the browser can read'));
      i.src = url;
    });
    let width = Math.min(maxWidth, img.naturalWidth);
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * width);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.74, 0.66]) {
        const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
        if (blob && blob.size <= maxBytes) {
          const data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          return { type: 'image/jpeg', data, bytes: blob.size, width: canvas.width, height: canvas.height };
        }
      }
      width = Math.round(width * 0.8);
    }
    throw new Error('Could not compress the image under 600 KB');
  } finally {
    URL.revokeObjectURL(url);
  }
}
