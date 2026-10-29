// o1 dark UI tokens, mirrored from frontend/src/themes/o1/styles/o1-tokens.css.
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

const inter = loadInter('normal', { weights: ['400', '500', '600', '700', '800'] });
const mono = loadMono('normal', { weights: ['400', '500', '600'] });

export const FONT = inter.fontFamily;
export const MONO = mono.fontFamily;

export const C = {
  bg: '#090A0C',
  bgBar: '#0B0C0F',
  surface: '#111317',
  surface2: '#16191E',
  surface3: '#1D2128',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#F5F7FA',
  text2: '#A3A9B3',
  text3: '#6C727D',
  accent: '#66BEFF',
  accentSoft: 'rgba(102,190,255,0.14)',
  accentBorder: 'rgba(102,190,255,0.30)',
  onAccent: '#06121F',
  agent: '#2EE6CF',
  agentSoft: 'rgba(46,230,207,0.14)',
  agentBorder: 'rgba(46,230,207,0.30)',
  onAgent: '#04201C',
  green: '#2FD08A',
  greenBg: 'rgba(47,208,138,0.12)',
  greenBd: 'rgba(47,208,138,0.28)',
  amber: '#F5B83D',
};

export const FPS = 30;
export const DOMAIN = 'vibehome.dog';
