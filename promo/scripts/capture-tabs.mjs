// Captures each Rewards Hub tab (holders, Vibe Club, staking, giveaways) at viewport size.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const TABS = [['holders', 'Holders'], ['vibeclub', 'Vibe Club'], ['staking', 'Staking'], ['giveaways', 'Giveaways']];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/hub?theme=o1`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2500);
for (const [id, label] of TABS) {
  const el = page.locator('main').getByText(label, { exact: true }).first();
  const box = await el.boundingBox();
  console.log(id, JSON.stringify(box));
  await el.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `public/shots/hub-${id}.png` });
}
await browser.close();
