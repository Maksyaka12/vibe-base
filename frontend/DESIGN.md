# Vibe Hub design system

One UI, two themes. Every page is built once (`src/themes/o1`, `src/components`) and both themes render the
same markup and layout. A theme only changes design tokens, type and motion.

| Theme | Look | Tokens |
|---|---|---|
| **O1** (default) | Dark, flat surfaces, light-blue accent, teal for the agent | `src/themes/o1/styles/o1-tokens.css` |
| **Based** | Light, Base brand (brand.base.org): white + Base gray ramp, Base Blue | `src/themes/o1/styles/based.css` |

The theme is `<html data-theme="o1|based">` (`src/theme.js`). The build scopes the theme folder's CSS to both
values (`THEME_IDS` in `vite.config.js`).

## Rules

1. **Never hard-code a colour.** Use tokens. A colour written as hex/rgba in a component breaks the other theme.
   - surfaces: `--bg`, `--bg-bar`, `--surface`, `--surface-2`, `--surface-3`, `--tile`, `--code-bg`
   - lines: `--border`, `--border-strong`
   - text: `--text`, `--text-2`, `--text-3`
   - brand: `--accent` (+ `-hover`, `-press`, `-soft`, `-border`), `--on-accent`
   - agent: `--agent`, `--agent-hover`, `--on-agent` (teal in O1, Base Blue in Based)
   - status: `--green`, `--red`, `--amber` (+ `-bg`, `-bd`)
   - subtle overlays: `color-mix(in srgb, var(--tint-ink) N%, transparent)` (white ink in O1, dark ink in Based)
   - tints of a token: `color-mix(in srgb, var(--accent) 14%, transparent)`
2. **One accent.** `--accent` is the only brand colour on a screen; the agent colour is used only for agent features
   (Agent Zone, Settings, Skill). Grays and white space carry the rest.
3. **Same layout in every theme.** Never branch markup by theme. If a theme needs a different look for something,
   add a token or a scoped rule in its tokens file (`html[data-theme='based'] ...`).
4. **Type.** O1: Inter + JetBrains Mono. Based: Inter Tight + Roboto Mono (the brand's fallbacks for Base Sans /
   Base Mono) and Doto for short all-caps display labels. Numbers in mono with tabular figures.
5. **Radius.** `--r-sm/md/lg/xl`. Based uses squarer corners (the Square).
6. **Motion.** UI feedback 120–240 ms. Based uses the Base curve `cubic-bezier(0.4, 0, 0.2, 1)` everywhere:
   pages slide in, page titles reveal with a Base Blue square wipe. No motion blur, no 3D. Always respect
   `prefers-reduced-motion`.
7. **Background.** Based shows the Base brand texture (fine vertical lines and dot-matrix clusters) in the free
   space of the page. Every card, panel and table must have its own background (`var(--surface)`), never rely on
   the page colour, or the texture shows through it.
8. **Shared components** (`src/components/wallet`, `src/components/agent`) read the same tokens through their
   own aliases (`--vwp-*`, `--agp-*`), so they follow the theme automatically.
9. **Check both themes** (desktop and 375 px) before shipping a UI change: `?theme=o1` / `?theme=based`.
