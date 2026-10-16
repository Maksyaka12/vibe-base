// Site-wide visual theme. Each theme is a full UI under src/themes/<id>;
// data, hooks and config under src/ are shared by both.
// fonts: each theme keeps the exact Google Fonts request it was designed with
// (the pixel theme relies on Inter's optical-size axis, O1 on the static instance).
export const THEMES = [
  {
    id: 'o1',
    label: 'O1',
    fonts: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Press+Start+2P&display=swap',
  },
  {
    id: 'pixel',
    label: 'Pixel',
    fonts: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&family=Press+Start+2P&family=Syne:wght@700;800&display=swap',
  },
];

export const DEFAULT_THEME = 'o1';
const STORAGE_KEY = 'vibe_theme';

const isTheme = (id) => THEMES.some((t) => t.id === id);

export function getTheme() {
  // ?theme=pixel in the URL wins and is remembered, handy for sharing a specific look.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    if (isTheme(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch (e) {}
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch (e) {}
  return DEFAULT_THEME;
}

export function setTheme(id) {
  if (!isTheme(id) || id === getTheme()) return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {}
  // Full reload so only the chosen theme's code and global side effects are active.
  const url = new URL(window.location.href);
  url.searchParams.delete('theme');
  window.location.replace(url.toString());
}
