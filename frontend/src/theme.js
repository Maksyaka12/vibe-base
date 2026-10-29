// Site-wide visual theme. Both themes run the same UI (src/themes/o1): Based only swaps the design tokens,
// type and motion for the Base brand (themes/o1/styles/based.css, keyed on <html data-theme>), so layouts never drift apart.
export const THEMES = [
  {
    id: 'o1',
    label: 'O1',
    fonts: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Press+Start+2P&display=swap',
  },
  {
    id: 'based',
    label: 'Based',
    fonts: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500;600&family=Doto:wght@700;800;900&display=swap',
  },
];

export const DEFAULT_THEME = 'o1';
const STORAGE_KEY = 'vibe_theme';

const isTheme = (id) => THEMES.some((t) => t.id === id);
// the retired pixel theme was replaced by Based
const migrate = (id) => (id === 'pixel' ? 'based' : id);

export function getTheme() {
  // ?theme=based in the URL wins and is remembered, handy for sharing a specific look.
  try {
    const fromUrl = migrate(new URLSearchParams(window.location.search).get('theme'));
    if (isTheme(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch (e) {}
  try {
    const saved = migrate(localStorage.getItem(STORAGE_KEY));
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
