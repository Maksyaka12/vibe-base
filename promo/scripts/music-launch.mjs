// Synthesizes the launch teaser track (public/launch/music.wav), synced to src/launch/Launch.jsx.
// Same toolkit as scripts/music.mjs: no samples, everything generated here. Run: npm run music:launch
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const DUR = 15;
const N = SR * DUR;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5s
const L = new Float32Array(N);
const R = new Float32Array(N);

// Scene timings in seconds (frames @30fps, see the scene files).
const GLITCH = 54 / 30; // "coming soon" → launch date
const COUNT = 5; // countdown scene starts
const FF = [COUNT + 12 / 30, COUNT + 2]; // fast-forward from 04:59:59 to 3
const TICKS = [7, 8, 9]; // 3 · 2 · 1
const DROP = 10; // zero: flash, "TODAY"
const BASE_IN = DROP + 78 / 30; // Basemark blocks start popping
const END = 14.2; // drums stop before the fade

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// Dm9 → Bbmaj7 → Fmaj7 → C, one bar each after the drop; Dm drone before it.
const CHORDS = [
  { root: 38, notes: [53, 57, 60, 64] },
  { root: 34, notes: [50, 53, 57, 62] },
  { root: 41, notes: [53, 57, 60, 64] },
  { root: 36, notes: [52, 55, 60, 64] },
];
const chordAt = (t) => (t < DROP ? CHORDS[0] : CHORDS[Math.floor((t - DROP) / (BEAT * 4)) % CHORDS.length]);

let seed = 11;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

const duck = (t) => {
  if (t < DROP || t >= END) return 1;
  const ph = ((t - DROP) % BEAT) / BEAT;
  return 0.45 + 0.55 * Math.min(1, ph * 3.2);
};

const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// ---- Pad: dark and filtered during the stub, tightens through the countdown, opens on the drop ----
{
  const voices = [];
  let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ch = chordAt(t);
    let sl = 0, sr = 0;
    ch.notes.forEach((m, k) => {
      for (let d = 0; d < 3; d++) {
        const id = k * 3 + d;
        const f = midi(m) * (1 + (d - 1) * 0.006);
        voices[id] = ((voices[id] || Math.random()) + f / SR) % 1;
        const s = voices[id] * 2 - 1;
        if (d === 0) sl += s; else if (d === 2) sr += s; else { sl += s * 0.5; sr += s * 0.5; }
      }
    });
    const open = t < COUNT ? 260 + (t / COUNT) * 700 : t < DROP ? 500 + ((t - COUNT) / 5) ** 2 * 1600 : 1700 + Math.sin(t) * 300;
    const a = 1 - Math.exp((-2 * Math.PI * open) / SR);
    lpL += a * (sl - lpL);
    lpR += a * (sr - lpR);
    const env = Math.min(1, t / 1.2) * (t > DUR - 1 ? Math.max(0, DUR - t) : 1);
    add(i, lpL * 0.03 * env * duck(t), lpR * 0.03 * env * duck(t));
  }
}

// ---- Sub bass after the drop ----
{
  let ph = 0;
  for (let i = Math.floor(DROP * SR); i < Math.floor(END * SR); i++) {
    const t = i / SR;
    ph += midi(chordAt(t).root) / SR;
    const e = Math.exp(-(((t - DROP) % (BEAT / 2)) / (BEAT / 2)) * 1.4);
    add(i, (Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph)) * 0.17 * e * duck(t));
  }
}

// ---- Pluck: 16th arp after the drop with a ping-pong delay ----
const blip = (dry, t0, f, g, len = 0.35, decay = 14) => {
  const s = Math.floor(t0 * SR);
  for (let j = 0; j < SR * len; j++) {
    const tt = j / SR;
    const e = Math.exp(-tt * decay) * Math.min(1, tt * 400);
    if (s + j < N) dry[s + j] += (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt) * Math.exp(-tt * 30)) * e * g;
  }
};
{
  const dry = new Float32Array(N);
  const step = BEAT / 4;
  const pattern = [0, 2, 1, 3, 2, 0, 3, 1];
  for (let n = 0; DROP + n * step < END; n++) {
    const t0 = DROP + n * step;
    const ch = chordAt(t0);
    blip(dry, t0, midi(ch.notes[pattern[n % 8] % ch.notes.length] + 12), (n % 4 === 0 ? 1 : 0.7) * 0.07);
  }
  // Stub: sparse high pings, the "waiting" state of the page.
  [0.4, 1.2, 2.6, 3.4, 4.2].forEach((t, k) => blip(dry, t, midi([81, 76, 84, 81, 88][k]), 0.05, 0.6, 7));
  // Countdown fast-forward: a clock ticking faster and faster.
  for (let t = FF[0], gap = 0.03; t < FF[1]; t += gap, gap *= 1.07) blip(dry, t, midi(96), 0.03, 0.04, 90);
  const d = Math.floor(BEAT * 0.75 * SR);
  const dl = new Float32Array(N);
  const dr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dl[i] = i >= d ? dry[i - d] + dr[i - d] * 0.4 : 0;
    dr[i] = i >= d ? dl[i - d] * 0.4 : 0;
    const k = duck(i / SR);
    add(i, (dry[i] + dl[i] * 0.45) * k, (dry[i] + dr[i] * 0.45) * k);
  }
}

// ---- Drums ----
const kick = (t0, g = 1) => {
  const s = Math.floor(t0 * SR);
  let ph = 0;
  for (let j = 0; j < SR * 0.35; j++) {
    const tt = j / SR;
    ph += (45 + 110 * Math.exp(-tt * 38)) / SR;
    add(s + j, Math.sin(2 * Math.PI * ph) * Math.exp(-tt * 9) * 0.42 * g);
  }
};
const hat = (t0, g, len = 0.05, pan = 0) => {
  const s = Math.floor(t0 * SR);
  let prev = 0;
  for (let j = 0; j < SR * len; j++) {
    const x = noise();
    const hp = x - prev; prev = x;
    const v = hp * Math.exp(-(j / SR) * (3 / len)) * g;
    add(s + j, v * (1 - pan), v * (1 + pan));
  }
};
const clap = (t0, g = 1) => {
  const s = Math.floor(t0 * SR);
  let lp = 0;
  for (let j = 0; j < SR * 0.22; j++) {
    const tt = j / SR;
    const x = noise();
    lp += 0.35 * (x - lp);
    const burst = tt < 0.03 ? 0.6 + 0.4 * Math.sin(tt * 900) : 1;
    add(s + j, (x - lp) * Math.exp(-tt * 18) * burst * 0.16 * g);
  }
};

// Heartbeat under the stub, quiet during the fast-forward, then the full beat on the drop.
[0, 1, 2, 3, 4].forEach((t) => kick(t, 0.45));
for (let b = 0; DROP + b * BEAT < END; b++) {
  const t = DROP + b * BEAT;
  kick(t);
  hat(t + BEAT / 2, 0.09, 0.06, b % 2 ? 0.3 : -0.3);
  hat(t + BEAT / 4, 0.035, 0.03, 0.4);
  hat(t + (3 * BEAT) / 4, 0.035, 0.03, -0.4);
  if (b % 2 === 1) clap(t);
}
// Snare roll in the last second before zero.
for (let k = 0; k < 8; k++) clap(9 + k / 8, 0.35 + k * 0.09);

// ---- FX ----
const whoosh = (at, len = 0.7, g = 1) => {
  const s = Math.floor((at - len) * SR);
  let lp = 0;
  for (let j = 0; j < SR * len; j++) {
    const p = j / (SR * len);
    lp += (1 - Math.exp((-2 * Math.PI * (300 + p * p * 6000)) / SR)) * (noise() - lp);
    const e = p ** 2.2 * 0.13 * g;
    add(s + j, lp * e * (1 - p * 0.5), lp * e * (0.5 + p * 0.5));
  }
};
const impact = (t0, g = 1) => {
  const s = Math.floor(t0 * SR);
  let ph = 0, lp = 0;
  for (let j = 0; j < SR * 1.6; j++) {
    const tt = j / SR;
    ph += (38 + 40 * Math.exp(-tt * 6)) / SR;
    lp += 0.04 * (noise() - lp);
    add(s + j, (Math.sin(2 * Math.PI * ph) * 0.35 * Math.exp(-tt * 2.6) + lp * 0.5 * Math.exp(-tt * 3)) * g);
  }
};
// Digital glitch: bit-crushed noise bursts with a pitch stutter.
const glitch = (t0, len = 0.45) => {
  const s = Math.floor(t0 * SR);
  for (let j = 0; j < SR * len; j++) {
    const tt = j / SR;
    const hold = Math.floor(j / 24) * 24;
    seed = (hold * 2654435761) >>> 0;
    const x = noise();
    const gate = Math.floor(tt * 28) % 3 !== 1 ? 1 : 0;
    const tone = Math.sign(Math.sin(2 * Math.PI * (900 - tt * 1400) * tt));
    const v = (x * 0.5 + tone * 0.25) * gate * Math.exp(-tt * 5) * 0.12;
    add(s + j, v * (j % 2 ? 1 : 0.6), v * (j % 2 ? 0.6 : 1));
  }
};
// Countdown hits: a bright bell per number, the last one higher.
const bell = (t0, m, g = 1) => {
  const s = Math.floor(t0 * SR);
  const f = midi(m);
  for (let j = 0; j < SR * 1.2; j++) {
    const tt = j / SR;
    const v = (Math.sin(2 * Math.PI * f * tt) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * tt) * Math.exp(-tt * 6)) * Math.exp(-tt * 3.5) * 0.09 * g;
    add(s + j, v);
  }
};

glitch(GLITCH - 0.1);
impact(GLITCH, 0.4);
whoosh(COUNT, 1.4, 1.1);
impact(COUNT, 0.6);
TICKS.forEach((t, k) => { kick(t, 0.8); impact(t, 0.35); bell(t, [74, 74, 81][k], k === 2 ? 1.2 : 1); });
whoosh(DROP, 1, 1.6);
impact(DROP, 1.2);
whoosh(BASE_IN, 0.6, 0.7);
impact(BASE_IN, 0.55);
bell(BASE_IN + 0.3, 86, 0.6);

// ---- Small room reverb (Schroeder) ----
function reverb(x) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp += 0.3 * (y - c.lp);
      c.buf[c.i] = x[n] + c.lp * 0.78;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      const v = s + y * -0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      s = y + v * 0.5;
    }
    out[n] = s * 0.25;
  }
  return out;
}
const wl = reverb(L);
const wr = reverb(R.map((v, i) => (i > 23 ? R[i - 23] : 0)));

// ---- Master: mix, soft clip, normalize, write 16-bit WAV ----
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + wl[i] * 0.25) * 1.4);
  R[i] = Math.tanh((R[i] + wr[i] * 0.25) * 1.4);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.02));
  buf.writeInt16LE(Math.round(L[i] * gain * fade * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(R[i] * gain * fade * 32767), 46 + i * 4);
}
mkdirSync('public/launch', { recursive: true });
writeFileSync('public/launch/music.wav', buf);
console.log('public/launch/music.wav written, peak before normalize', peak.toFixed(3));
