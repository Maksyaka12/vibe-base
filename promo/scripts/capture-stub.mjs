// Captures the live "upgrading" stub from vibehome.dog for the launch teaser: as it is, and with the
// launch date in place of "Coming soon". Prints element boxes so the teaser can animate over them.
import { chromium } from 'playwright';

const URL = process.env.STUB_URL || 'https://vibehome.dog/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'public/launch/stub.png' });

const boxes = await page.evaluate(() => {
  const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
  return { logo: box('.mt-logo'), badge: box('.mt-badge'), title: box('.mt-title'), progress: box('.mt-progress'), foot: box('.mt-foot') };
});

await page.evaluate(() => {
  const badge = document.querySelector('.mt-badge');
  badge.lastChild.textContent = 'Launch confirmed';
  document.querySelector('.mt-foot').textContent = 'Launch · Oct 29 · 15:00 UTC';
  const bar = document.querySelector('.mt-progress span');
  bar.style.animation = 'none';
  bar.style.left = '0';
  bar.style.width = '100%';
  bar.style.transform = 'none';
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/launch/stub-date.png' });

console.log(JSON.stringify(boxes));
await browser.close();
