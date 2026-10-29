// Captures /profile as a connected holder sees it. The page needs a Privy login for real data, so after load
// the guest view is patched with the values of a real connected wallet (#03 MKS Vibe), keeping the real UI.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/profile?theme=o1`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2500);

await page.evaluate(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Identity card: the member NFT instead of the guest placeholder.
  const img = $('.o1-nft-img');
  img.src = '/nft/images/3.png';
  img.classList.remove('non-member');
  const badge = $('.o1-nft-badge-overlay .badge');
  badge.className = 'badge badge-success badge-pill';
  badge.textContent = 'Vibe Club member';
  $('.o1-nft-name').textContent = '#03 MKS Vibe';
  const id = document.createElement('span');
  id.className = 'o1-nft-id';
  id.textContent = '#3';
  $('.o1-nft-title-row').appendChild(id);
  $('.o1-nft-cta-box')?.remove();

  // Reward dashboard.
  const tiles = $$('.o1-reward-tile');
  const set = (tile, value, sub, cls) => {
    const v = $('.o1-reward-tile-value', tile);
    v.textContent = value;
    v.className = `o1-reward-tile-value ${cls}`;
    $('.o1-reward-tile-sub', tile).textContent = sub;
  };
  set(tiles[0], '+1,147,866 $VIBE', '10 claims completed', 'positive');
  set(tiles[1], '+3,243,999 $VIBE', '7 epochs participated', 'positive');
  set(tiles[2], '+0 $VIBE', '0 rewards ready', 'neutral');
  set(tiles[3], '0 $VIBE', '0 rewards missed', 'neutral');

  // Daily check-in: checked in today, streak matches the promo's streak card.
  $('.o1-checkin-streak-num').textContent = '7';
  $('.o1-checkin-streak-unit').textContent = 'days';
  $('.o1-checkin-icon-box svg')?.setAttribute('color', 'var(--green)');
  $('.o1-checkin-sub').textContent = 'Checked in today · next in 10H 05M 27S';
  const btn = $('.o1-checkin-right .btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="color:var(--green);margin-right:6px">✓</span><span>Checked in</span>';

  // Achievements: Vibe Club member + all five Dog staker tiles unlocked (6/10).
  const unlocked = ['Vibe Club member', 'Novice staker', 'Confident banker', 'Wolf of Wall St', 'Rich dog', 'Bank founder'];
  $$('.o1-achievement-tile').forEach((t) => {
    const name = $('.o1-achievement-name', t).textContent.trim();
    if (!unlocked.includes(name)) return;
    t.classList.remove('locked');
    t.classList.add('unlocked');
    $('.o1-achievement-lock', t)?.remove();
  });
  const counts = $$('.o1-achievements-group-count');
  counts[0].textContent = '1/2';
  counts[2].textContent = '5/5';
  $('.o1-achievements-progress-bar span').style.width = '60%';
  const total = $('.o1-achievements-progress .badge');
  total.className = 'badge badge-success badge-pill';
  total.textContent = '6/10 unlocked';

  // Header and sidebar: connected wallet chips instead of "Connect wallet".
  $$('button, a').filter((b) => b.textContent.trim() === 'Connect wallet' && !b.closest('.o1-checkin-right')).forEach((b) => {
    b.className = b.className.replace(/btn-primary/g, 'btn-secondary');
    b.style.background = 'var(--surface)';
    b.style.color = 'var(--text)';
    b.style.border = '1px solid var(--border-strong)';
    b.style.fontFamily = 'var(--font-mono)';
    b.innerHTML = '🔥 7 &nbsp;·&nbsp; 1 NFT &nbsp;·&nbsp; 246.72K $VIBE';
  });
});

await page.waitForTimeout(1200);
await page.screenshot({ path: 'public/shots/profile.png' });
await browser.close();
console.log('public/shots/profile.png');
