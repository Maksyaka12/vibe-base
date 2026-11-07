import { useEffect, useMemo, useRef, useState } from 'react';
import { Tile } from '../../components/ui';
import history from './vibeMarketHistory.json';

// Live $VIBE market data for the docs: key metrics and a market cap chart.
// GeckoTerminal's public API only returns the last 180 days of candles, so the history since launch is saved in
// vibeMarketHistory.json and the live candles are laid over it.

export const VIBE_POOL = '0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5';
const SUPPLY = 1_000_000_000;
const API = `https://api.geckoterminal.com/api/v2/networks/base/pools/${VIBE_POOL}`;
const DAY = 86400;
const CACHE_KEY = 'vibe_docs_market_v2';

// The last good answer, so a busy API (it allows about 30 calls a minute) still shows recent live numbers
function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    return c && c.candles ? { ...c, at: new Date(c.at) } : null;
  } catch (e) {
    return null;
  }
}

export const LAUNCH = { label: '27 Jul 2026, 14:01 UTC', unix: Date.UTC(2026, 6, 27, 14, 1, 9) / 1000 };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (t, withYear) => {
  const d = new Date(t * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${withYear ? ` ${d.getUTCFullYear()}` : ''}`;
};

export function usd(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(digits)}K`;
  return `$${n.toFixed(0)}`;
}

const price = (n) => (n ? `$${n.toFixed(8).replace(/0+$/, '')}` : '—');

function useVibeMarket() {
  const [live, setLive] = useState(readCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let on = true;
    const get = (url) => fetch(url, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
    // The same candles priced in ETH give the volume in ETH. Optional: without them the saved ETH volume is kept
    const inEth = get(`${API}/ohlcv/day?limit=200&currency=token`).catch(() => null);
    Promise.all([get(API), get(`${API}/ohlcv/day?limit=200&currency=usd`), inEth])
      .then(([pool, ohlcv, eth]) => {
        if (!on) return;
        const a = pool.data.attributes;
        const ethByDay = new Map((eth?.data.attributes.ohlcv_list || []).map((d) => [d[0], d[5]]));
        const candles = ohlcv.data.attributes.ohlcv_list.map(([t, , h, , c, v]) => [t, c * SUPPLY, h * SUPPLY, v, ethByDay.get(t)]);
        const next = { price: Number(a.base_token_price_usd), liquidity: Number(a.reserve_in_usd), volume24h: Number(a.volume_usd?.h24), change24h: Number(a.price_change_percentage?.h24), candles, at: new Date() };
        setLive(next);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch (e) {}
      })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);

  return useMemo(() => {
    const byDay = new Map(history.days.map((d) => [d[0], d]));
    live?.candles.forEach((d) => byDay.set(d[0], d[4] == null && byDay.has(d[0]) ? [...d.slice(0, 4), byDay.get(d[0])[4]] : d));
    const days = [...byDay.values()].sort((a, b) => a[0] - b[0]);
    const last = days[days.length - 1];
    const mc = live?.price ? live.price * SUPPLY : last[1];
    let ath = { value: 0, t: 0 };
    let volume = 0;
    let volumeEth = 0;
    for (const [t, , high, v, vEth] of days) {
      volume += v;
      volumeEth = vEth == null || volumeEth == null ? null : volumeEth + vEth;
      if (high > ath.value) ath = { value: high, t };
    }
    if (mc > ath.value) ath = { value: mc, t: last[0] };
    return {
      days,
      mc,
      price: live?.price ?? mc / SUPPLY,
      ath,
      fromAth: mc / ath.value - 1,
      volume,
      volumeEth,
      liquidity: live?.liquidity,
      volume24h: live?.volume24h,
      change24h: live?.change24h,
      at: live?.at,
      savedOn: history.days[history.days.length - 1][0],
      loading: !live && !failed,
      failed: failed && !live,
    };
  }, [live, failed]);
}

const pct = (n) => (Number.isFinite(n) ? `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%` : '—');

function Status({ m }) {
  if (m.loading) return <p className="o1-docs-market-status">Loading live data from GeckoTerminal...</p>;
  if (m.failed) return <p className="o1-docs-market-status"><span>Live data is unavailable right now. Showing the numbers saved on <span className="mono">{dayLabel(m.savedOn, true)}</span>.</span></p>;
  const t = m.at;
  const hh = String(t.getUTCHours()).padStart(2, '0');
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  return <p className="o1-docs-market-status"><i aria-hidden="true" /><span>Live from GeckoTerminal, updated <span className="mono">{hh}:{mm} UTC</span></span></p>;
}

/** The key numbers of $VIBE, live. */
export function VibeMetrics() {
  const m = useVibeMarket();
  const days = Math.max(1, Math.floor((Date.now() / 1000 - LAUNCH.unix) / DAY));
  return (
    <div className="o1-docs-market">
      <div className="o1-docs-metrics">
        <Tile label="Market cap" value={usd(m.mc)} sub={m.failed || m.loading ? 'Fully diluted' : `Fully diluted · ${pct(m.change24h / 100)} 24h`} />
        <Tile label="All-time high" value={usd(m.ath.value)} sub={`${dayLabel(m.ath.t, true)}`} />
        <Tile label="From all-time high" value={pct(m.fromAth)} sub="Current vs ATH market cap" />
        <Tile label="Total volume" value={usd(m.volume)} sub={m.volumeEth != null ? `${m.volumeEth.toFixed(2)} ETH · ${days} days` : `Since launch, ${days} days`} />
        <Tile label="Liquidity" value={m.liquidity ? usd(m.liquidity) : '—'} sub="Permanently locked" />
        <Tile label="Price" value={price(m.price)} sub={m.volume24h != null && Number.isFinite(m.volume24h) ? `24h volume ${usd(m.volume24h)}` : 'Per $VIBE'} />
      </div>
      <Status m={m} />
      <MarketChart m={m} />
    </div>
  );
}

const RANGES = [
  { id: '1M', days: 30 },
  { id: '3M', days: 90 },
  { id: 'All', days: Infinity },
];

function niceStep(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return ([1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s)) * mag;
}

/** Daily market cap since launch, with volume underneath. */
function MarketChart({ m }) {
  const [range, setRange] = useState('All');
  const [hover, setHover] = useState(null);
  const [width, setWidth] = useState(700);
  const box = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const span = RANGES.find((r) => r.id === range).days;
  const days = span === Infinity ? m.days : m.days.slice(-span);
  const H = 260;
  const pad = { top: 12, right: 8, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const volH = plotH * 0.22;

  const athInRange = days.some((d) => d[0] === m.ath.t);
  const maxMc = Math.max(...days.map((d) => d[1]), athInRange ? m.ath.value : 0, 1);
  const step = niceStep(maxMc);
  const top = Math.ceil(maxMc / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const maxVol = Math.max(...days.map((d) => d[3]), 1);

  const x = (i) => pad.left + (days.length < 2 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - (v / top) * plotH;
  const line = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[1]).toFixed(1)}`).join('');
  const area = `${line}L${x(days.length - 1).toFixed(1)},${pad.top + plotH}L${x(0).toFixed(1)},${pad.top + plotH}Z`;
  const barW = Math.max(1, (plotW / days.length) * 0.6);

  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(plotW / 90)));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - pad.left) / plotW) * (days.length - 1));
    setHover(Math.min(days.length - 1, Math.max(0, i)));
  };

  const h = hover != null ? days[hover] : null;
  const tipLeft = h ? Math.min(Math.max(x(hover), 80), width - 80) : 0;

  return (
    <div className="o1-docs-chart">
      <div className="o1-docs-chart-head">
        <div>
          <div className="o1-docs-chart-title">Market cap</div>
          <div className="o1-docs-chart-sub">Daily close in USD, $VIBE/ETH pool on o1 Launchpad</div>
        </div>
        <div className="seg soft" role="tablist" aria-label="Chart range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id} onClick={() => { setRange(r.id); setHover(null); }}>{r.id}</button>
          ))}
        </div>
      </div>
      <div className="o1-docs-chart-plot" ref={box}>
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={`$VIBE market cap from ${dayLabel(days[0][0], true)} to ${dayLabel(days[days.length - 1][0], true)}. All-time high ${usd(m.ath.value)} on ${dayLabel(m.ath.t, true)}.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
              <text className="axis mono" x={pad.left - 8} y={y(t) + 4} textAnchor="end">{usd(t, 0)}</text>
            </g>
          ))}
          {days.map((d, i) => (
            <rect key={d[0]} className={hover === i ? 'vol on' : 'vol'} x={x(i) - barW / 2} width={barW} y={pad.top + plotH - (d[3] / maxVol) * volH} height={(d[3] / maxVol) * volH} />
          ))}
          <path className="area" d={area} />
          <path className="line" d={line} />
          {athInRange && (
            <g>
              <line className="ath" x1={pad.left} x2={width - pad.right} y1={y(m.ath.value)} y2={y(m.ath.value)} />
              <text className="ath-label mono" x={width - pad.right} y={y(m.ath.value) - 6} textAnchor="end">ATH {usd(m.ath.value)}</text>
            </g>
          )}
          {days.map((d, i) => (i % labelEvery === 0 ? (
            <text key={d[0]} className="axis mono" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : 'middle'}>{dayLabel(d[0])}</text>
          ) : null))}
          {h && (
            <g>
              <line className="cursor" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} />
              <circle className="dot" cx={x(hover)} cy={y(h[1])} r="4" />
            </g>
          )}
        </svg>
        {h && (
          <div className="o1-docs-chart-tip" style={{ left: tipLeft }}>
            <span className="mono">{dayLabel(h[0], true)}</span>
            <b className="mono">{usd(h[1])}</b>
            <span>Volume <span className="mono">{usd(h[3])}</span></span>
          </div>
        )}
      </div>
      <div className="o1-docs-chart-legend">
        <span><i className="line" aria-hidden="true" />Market cap</span>
        <span><i className="vol" aria-hidden="true" />Daily volume</span>
        <span><i className="ath" aria-hidden="true" />All-time high, intraday</span>
      </div>
    </div>
  );
}
