// Synthesizes the background track (public/music.wav): chill 120 BPM electronic, synced to the scene cuts.
// No samples, everything is generated here, so the track is ours to use anywhere. Run: npm run music
import { writeFileSync } from 'node:fs';

const SR = 44100;
const DUR = 40;
const N = SR * DUR;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5s
const L = new Float32Array(N);
const R = new Float32Array(N);

// Scene cuts in seconds (see src/Promo.jsx): hook→intro, intro→rewards, … agents→outro.
const CUTS = [3, 6, 12, 17, 23, 27, 35];
const DROP = 6; // full beat starts with the first product shot
const END = 35; // drums stop for the outro

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// Fmaj7 → Am7 → Dm9 → Cmaj7, two bars each.
const CHORDS = [
  { root: 41, notes: [53, 57, 60, 64] },
  { root: 45, notes: [52, 55, 57, 60] },
  { root: 38, notes: [53, 57, 60, 64, 62] },
  { root: 36, notes: [52, 55, 59, 60] },
];
const chordAt = (t) => CHORDS[Math.floor(t / (BEAT * 8)) % CHORDS.length];

let seed = 7;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

// Sidechain-style duck after every kick, shared by pad, bass and pluck.
const duck = (t) => {
  if (t < DROP || t >= END) return 1;
  const ph = (t % BEAT) / BEAT;
  return 0.45 + 0.55 * Math.min(1, ph * 3.2);
};

const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// ---- Pad: detuned saws, slow lowpass that opens up over the intro ----
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
    const open = t < DROP ? 300 + (t / DROP) * 900 : t < END ? 1300 + Math.sin(t / 3) * 300 : 1300 - (t - END) * 180;
    const a = 1 - Math.exp((-2 * Math.PI * open) / SR);
    lpL += a * (sl - lpL);
    lpR += a * (sr - lpR);
    const env = Math.min(1, t / 2.5) * (t > 38 ? Math.max(0, (DUR - t) / 2) : 1);
    add(i, lpL * 0.032 * env * duck(t), lpR * 0.032 * env * duck(t));
  }
}

// ---- Sub bass: root on 8ths with the duck ----
{
  let ph = 0;
  for (let i = Math.floor(DROP * SR); i < Math.floor(END * SR); i++) {
    const t = i / SR;
    ph += midi(chordAt(t).root) / SR;
    const e = Math.exp(-((t % (BEAT / 2)) / (BEAT / 2)) * 1.4);
    const s = Math.sin(2 * Math.PI * ph) + 0.25 * Math.sin(4 * Math.PI * ph);
    add(i, s * 0.16 * e * duck(t));
  }
}

// ---- Pluck arp: 16ths, chord tones up an octave, ping-pong delay ----
{
  const dry = new Float32Array(N);
  const step = BEAT / 4;
  const pattern = [0, 2, 1, 3, 2, 0, 3, 1];
  for (let n = 0; n * step < END; n++) {
    const t0 = n * step;
    if (t0 < 3) continue; // arp enters with the logo
    const ch = chordAt(t0);
    const m = ch.notes[pattern[n % pattern.length] % ch.notes.length] + 12;
    const f = midi(m);
    const vel = (n % 4 === 0 ? 1 : 0.7) * (t0 < DROP ? 0.6 : 1);
    const start = Math.floor(t0 * SR);
    for (let j = 0; j < SR * 0.4; j++) {
      const tt = j / SR;
      const e = Math.exp(-tt * 14) * Math.min(1, tt * 400);
      const s = Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt) * Math.exp(-tt * 30);
      if (start + j < N) dry[start + j] += s * e * vel * 0.07;
    }
  }
  const d = Math.floor(BEAT * 0.75 * SR); // dotted 8th
  const dl = new Float32Array(N);
  const dr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    dl[i] = (i >= d ? dry[i - d] + dr[i - d] * 0.4 : 0);
    dr[i] = (i >= d ? dl[i - d] * 0.4 : 0);
    const k = duck(t);
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
  let bp = 0, lp = 0;
  for (let j = 0; j < SR * 0.22; j++) {
    const tt = j / SR;
    const x = noise();
    lp += 0.35 * (x - lp);
    bp = x - lp;
    const burst = tt < 0.03 ? 0.6 + 0.4 * Math.sin(tt * 900) : 1;
    add(s + j, bp * Math.exp(-tt * 18) * burst * 0.16 * g);
  }
};

for (let b = 0; b * BEAT < END; b++) {
  const t = b * BEAT;
  if (t < DROP) continue;
  kick(t);
  hat(t + BEAT / 2, 0.09, 0.06, b % 2 ? 0.3 : -0.3);
  hat(t + BEAT / 4, 0.035, 0.03, 0.4);
  hat(t + (3 * BEAT) / 4, 0.035, 0.03, -0.4);
  if (t >= 12 && b % 2 === 1) clap(t);
}
// Intro heartbeat kicks under the hook, a little lighter.
[0, 1.5, 3, 4.5].forEach((t) => kick(t, 0.55));

// ---- Transition FX: whoosh into each cut, soft impact on the big ones ----
const whoosh = (cut, len = 0.7, g = 1) => {
  const s = Math.floor((cut - len) * SR);
  let lp = 0;
  for (let j = 0; j < SR * len; j++) {
    const p = j / (SR * len);
    const f = 300 + p * p * 6000;
    lp += (1 - Math.exp((-2 * Math.PI * f) / SR)) * (noise() - lp);
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
CUTS.forEach((c) => whoosh(c, c === DROP ? 1.2 : 0.6, c === DROP ? 1.4 : 0.8));
impact(3, 0.8);
impact(DROP, 1);
impact(END, 1.1);
// Outro: the lockup slides left and the Base Square pops in (frame 76 of the outro).
const BASE_IN = END + 76 / 30;
whoosh(BASE_IN, 0.6, 0.7);
impact(BASE_IN, 0.55);

// ---- Small room reverb on everything (Schroeder) ----
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
  L[i] = Math.tanh((L[i] + wl[i] * 0.22) * 1.4);
  R[i] = Math.tanh((R[i] + wr[i] * 0.22) * 1.4);
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
writeFileSync('public/music.wav', buf);
console.log('public/music.wav written, peak before normalize', peak.toFixed(3));
