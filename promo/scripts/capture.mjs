// Captures the real Vibe Hub pages (o1 theme) from the local dev server into public/shots/.
// Run `npm run dev` in frontend first, then `npm run capture` (runs this, capture-tabs and capture-profile).
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
// /profile is captured by capture-profile.mjs (connected-wallet view), so it is not in this list.
const PAGES = ['hub', 'claim', 'agents', 'skill'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => localStorage.setItem('vibe_theme', 'o1'));

for (const name of PAGES) {
  await page.goto(`${BASE}/${name}?theme=o1`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `public/shots/${name}.png` });
  // The app scrolls inside its own container, so expand it to grab the whole page.
  const h = await page.evaluate(() => {
    let best = document.scrollingElement;
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 50 && el.scrollHeight > (best?.scrollHeight || 0)) best = el;
    }
    return best.scrollHeight;
  });
  await page.setViewportSize({ width: 1440, height: Math.min(h, 6000) });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `public/shots/${name}-full.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log(name, h);
}
await browser.close();
