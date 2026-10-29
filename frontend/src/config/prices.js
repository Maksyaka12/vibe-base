import { VIBE_TOKEN } from '../data/snapshot/constants.js';

// $VIBE and ETH prices in USD. DEX Screener first (deepest VIBE/ETH pool on Base); when it has no pairs
// (it sometimes drops the token), GeckoTerminal. Returns { vibe, eth } or null when neither source answers.

const WETH = '0x4200000000000000000000000000000000000006';
const ETH_QUOTES = ['0x0000000000000000000000000000000000000000', WETH]; // native ETH, WETH

async function fromDexScreener() {
  const data = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${VIBE_TOKEN}`).then((r) => r.json());
  const pair = (data?.pairs || [])
    .filter((p) => p.chainId === 'base'
      && p.baseToken?.address?.toLowerCase() === VIBE_TOKEN.toLowerCase()
      && ETH_QUOTES.includes(p.quoteToken?.address?.toLowerCase())
      && Number(p.priceUsd) > 0 && Number(p.priceNative) > 0)
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  return pair ? { vibe: Number(pair.priceUsd), eth: Number(pair.priceUsd) / Number(pair.priceNative) } : null;
}

async function fromGeckoTerminal() {
  const data = await fetch(`https://api.geckoterminal.com/api/v2/simple/networks/base/token_price/${VIBE_TOKEN},${WETH}`).then((r) => r.json());
  const prices = data?.data?.attributes?.token_prices || {};
  const vibe = Number(prices[VIBE_TOKEN.toLowerCase()]);
  const eth = Number(prices[WETH]);
  return vibe > 0 && eth > 0 ? { vibe, eth } : null;
}

export async function fetchPrices() {
  for (const source of [fromDexScreener, fromGeckoTerminal]) {
    try {
      const prices = await source();
      if (prices) return prices;
    } catch (e) {}
  }
  return null;
}
