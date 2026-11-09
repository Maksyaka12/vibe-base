# Vibe Hub design system

The design of [vibehome.dog](https://vibehome.dog), written down from the live product. Anything new (a page, a
feature, a fix) follows this file, and if the design changes on purpose, this file changes in the same commit.

**One UI, two themes.** Every page is built once (`src/themes/o1`, `src/components`) and both themes render the same
markup and layout. A theme only changes design tokens, type and motion.

**Contents:** [Rules](#1-rules) · [Themes](#2-themes) · [Colour](#3-colour) · [Typography](#4-typography) ·
[Spacing and layout](#5-spacing-and-layout) · [Surfaces](#6-surfaces) · [Components](#7-components) ·
[Patterns](#8-patterns) · [Motion](#9-motion) · [Icons and images](#10-icons-and-images) · [Copy](#11-copy) ·
[Files](#12-files) · [Checklist](#13-checklist)

---

## 1. Rules

1. **Never hard-code a colour.** Use the tokens in this file, and no others. A colour written as hex or rgba in a
   component breaks the other theme. Style with classes rather than inline colours and radii.
2. **One accent.** `--accent` is the only brand colour on a screen. The agent colour is used only for agent features
   (Agent Zone, Settings, Skill). Grays and white space carry the rest.
3. **Same layout in every theme.** Never branch markup by theme. If a theme needs a different look for something, add a
   token or a scoped rule in `based.css` (`html[data-theme='based'] ...`).
4. **Reuse before you build.** Use the components in `src/themes/o1/components/ui/index.jsx` and the existing classes.
   Don't write a new button, card or badge.
5. **Flat surfaces.** Depth comes from stepped surfaces and 1px borders, not shadows. Shadows are only for things that
   float above the page (menus and modals).
6. **Numbers in mono.** Amounts, balances, addresses and countdowns use the mono font with tabular figures.
7. **Mobile is a first-class layout.** Every screen works at 375 px, with no sideways scrolling and nothing hidden
   behind the bottom bar.
8. **Calm and factual.** Short left-aligned headers and plain text. No decorative gradients on cards, no emoji in the
   UI, no marketing shouting.

---

## 2. Themes

| Theme | Look | Tokens | Fonts |
|---|---|---|---|
| **O1** (default) | Dark, flat surfaces, light-blue accent, teal for the agent | `src/themes/o1/styles/o1-tokens.css` | Inter, JetBrains Mono |
| **Based** | Light, Base brand (brand.base.org): white + Base gray ramp, Base Blue | `src/themes/o1/styles/based.css` | Inter Tight, Roboto Mono, Doto |

- The theme is `<html data-theme="o1|based">`. `src/theme.js` picks it from `?theme=`, then the stored `vibe_theme`,
  and defaults to O1. Users switch it in the header on desktop and in the More sheet on mobile.
- `o1-tokens.css` defines every token, and `based.css` overrides them. A new token goes into **both** files, or it must
  work unchanged in both themes.
- The build scopes the theme folder's CSS to both themes (`THEME_IDS` in `vite.config.js`). Add new theme CSS to
  `src/themes/o1/`, and it is scoped automatically.
- CSS loads in the order set by `src/themes/o1/index.js`, with `based.css` last, so its overrides win.

---

## 3. Colour

### Surfaces, lines and text

| Token | O1 | Based | Use |
|---|---|---|---|
| `--bg` | `#090A0C` | `#FFFFFF` | Page |
| `--bg-bar` | `#0B0C0F` | `#FFFFFF` | Header and sidebar |
| `--surface` | `#111317` | `#FFFFFF` | Cards, tiles, secondary buttons |
| `--surface-2` | `#16191E` | `#EEF0F3` | Anything inside a card, hover state |
| `--surface-3` | `#1D2128` | `#DEE1E7` | Progress track, scrollbar thumb |
| `--tile` | `#15181D` | `#FFFFFF` | Raised tiles |
| `--code-bg` | `#0D0F13` | `#EEF0F3` | Code blocks |
| `--on-image` | `#F5F7FA` | `#FFFFFF` | Text on artwork, always over a dark overlay |
| `--border` | white 7% | `#DEE1E7` | Default 1px line |
| `--border-strong` | white 12% | `#B1B7C3` | Hover, secondary buttons, menus |
| `--text` | `#F5F7FA` | `#0A0B0D` | Primary text |
| `--text-2` | `#A3A9B3` | `#5B616E` | Descriptions, inactive nav |
| `--text-3` | `#6C727D` | `#717886` | Labels, hints, captions |

### Brand and agent

| Token | O1 | Based | Use |
|---|---|---|---|
| `--accent` | `#66BEFF` | `#0000FF` | Primary action, active state, focus |
| `--accent-hover` | `#82CBFF` | `#3C8AFF` | Hover |
| `--accent-press` | `#4FADF2` | `#0033A0` | Pressed |
| `--on-accent` | `#06121F` | `#FFFFFF` | Text on the accent |
| `--accent-soft` | accent 14% | accent 7% | Active nav item, info alert |
| `--accent-border` | accent 30% | accent 28% | Border of soft accent elements |
| `--agent` | `#2EE6CF` | `#0000FF` | Agent features only |
| `--agent-hover` | `#5FF0DD` | `#3C8AFF` | Hover |
| `--on-agent` | `#04201C` | `#FFFFFF` | Text on the agent colour |
| `--base-blue` | `#0052FF` | `#0000FF` | Chain dot only |

### Status

Each status colour has a text colour, a background (`-bg`) and a border (`-bd`). Use all three together.

| Token | O1 | Based | Meaning |
|---|---|---|---|
| `--green` | `#2FD08A` | `#3D9A00` | Live, eligible, claimed, success |
| `--amber` | `#F5B83D` | `#B07A00` | Warning, rules to know, streak flame |
| `--red` | `#FF5A5F` | `#E5341A` | Errors, ended, expired |

### Overlays and tints

- Subtle overlay: `color-mix(in srgb, var(--tint-ink) N%, transparent)`. The ink is white in O1 and dark in Based.
- Tint of a token: `color-mix(in srgb, var(--accent) 14%, transparent)`.
- Shared wallet and agent pages read the tokens through aliases (`--vwp-*`, `--agp-*`), so they follow the theme.

---

## 4. Typography

**Fonts:** `--font-sans` for all text and `--font-mono` for numbers (`.num` or `.mono`). In Based, `--font-display`
(Doto, bold, all caps) is for very short labels only, such as the Agent Zone badge. Weights in use: 400, 500, 600, 700.
Base size is 15 px.

| Role | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Page title (`.page-title`) | 36 px, 28 px on mobile | 700 | `--text` | Line height 1.15, spacing -0.02em (-0.03em in Based) |
| Page description (`.page-desc`) | 15 px | 400 | `--text-2` | Line height 1.5, max width 680 px |
| Section title (`.section-title`) | 18 px | 600 | `--text` | Count beside it: 14 px, 500, `--text-3` |
| Card title | 16 px (14 px in compact cards) | 700 (600) | `--text` | Spacing -0.01em |
| Body | 14–15 px | 400 | `--text` or `--text-2` | |
| Alert | 14 px | 400 | `--text` | Line height 1.45 |
| Secondary text, captions | 12–13 px | 400 | `--text-3` | |
| Tile label (`.tile-label`) | 13 px | 400 | `--text-3` | |
| Tile value (`.tile-value`) | 20 px mono | 700 | `--text` | Spacing -0.01em |
| Tile sub (`.tile-sub`) | 13 px mono | 400 | `--text-3` | |
| Large amount input | 24 px mono | 700 | `--text` | Swap |
| Button | 15 px; 16 px `lg`; 14 px `sm` | 600 | By variant | |
| Badge | 11 px; 12 px as a pill | 600 | By tone | Spacing 0.02em |
| Form label | 12 px | 600 | `--text-2` | |
| Form input | 14 px | 400 | `--text` | |
| Sidebar item | 14 px | 500 | `--text-2`, active `--accent` | |
| Sidebar group label | 11 px | 600 | `--text-3` | All caps, spacing 0.06em |
| Bottom bar label | 11 px | 500 | `--text-3`, active `--accent` | |

Text is 11 px at the smallest. All caps is only for small group labels and Doto labels.

---

## 5. Spacing and layout

### Spacing

The base unit is 4 px: `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 20 · `--s6` 24 · `--s8` 32 · `--s10` 40 ·
`--s12` 48 · `--s16` 64.

| Where | Value |
|---|---|
| Between page sections | 24 px |
| Page header to content | 32 px |
| Section title to content | 16 px |
| Card grid gap | 12 px (8–10 px on mobile) |
| Card padding | 20 px (18 px compact) |
| Inside a card, between blocks | 12–18 px |
| Tile padding | 14 px 16 px |
| Table row padding | 14 px 16 px (header 10 px 16 px) |
| Icon to text | 6–10 px |

### App shell

| Element | Desktop (1024 px and up) | Mobile (below 1024 px) |
|---|---|---|
| Sidebar | Fixed, 248 px; 64 px collapsed | Drawer, 260 px (max 85vw), opened from the header |
| Header | Sticky, 68 px, side padding 24 px | Sticky, 60 px, side padding 10 px |
| Bottom bar | Hidden | Fixed, 64 px, 5 tabs (see [Navigation](#navigation)) |
| Page section | Padding 24 px top, 60 px bottom | Same |
| Page gutter | 20 px on `.wrap` pages, otherwise 14 px | 14 px |
| Space under content | 40 px | 90 px, to clear the bottom bar |

### Page widths

| Width | Pages |
|---|---|
| 1040 px | Rewards Hub, Claim Portal, Profile, Vibe Club NFT, Tokenomics, Official addresses, Agent Zone, Skill, Admin |
| 760 px | Docs article (its own shell: top bar, menu, "On this page") |
| 640 px | Settings |
| 560 px | Wallet, Account |
| 480 px | Swap |

Use the widest width for dashboards, and a narrow column for one focused task. Pages are left-aligned inside a centred
container.

### Breakpoints

| Width | What changes |
|---|---|
| 1024 px | Desktop shell with sidebar. Below it: drawer and bottom bar (use this one for the shell only) |
| 768 px | Main content breakpoint: 4 columns become 2, page title 28 px, `lg` buttons become full-width pills |
| 640 px | Stat and tile grids collapse to 1 column, table headers hide, action rows stack |
| 480 px, 380 px | Fine tuning on narrow phones |

### Grids

Grids use `repeat(N, minmax(0, 1fr))` so content can't push them wider than the page.

| Grid | Desktop | Mobile |
|---|---|---|
| Campaign cards (`.o1-campaign-grid`) | 4 columns, gap 12 px | 2 columns, gap 10 px |
| Tiles (`.o1-hub-tiles-3`) | 3 columns, gap 12 px | 1 column, gap 8 px |
| Claim stats (`.o1-claim-stats-grid`) | 3 columns, gap 12 px | 1 column, gap 8 px |
| Mint (`.o1-nft-mint-grid`) | `1fr 1.15fr`, gap 24 px | 1 column, gap 16 px |

---

## 6. Surfaces

| Token | O1 | Based | Use |
|---|---|---|---|
| `--r-sm` | 8 px | 6 px | Small controls, close buttons |
| `--r-md` | 12 px | 8 px | Buttons, tiles, alerts, campaign cards |
| `--r-lg` | 16 px | 12 px | Cards, large buttons |
| `--r-xl` | 20 px | 16 px | Hero blocks, celebration modals |
| `--r-full` | 999 px | 999 px | Pills, segmented controls, header buttons |

**Layering:** page (`--bg`) → card (`--surface`) → block inside a card (`--surface-2`). A `.tile` inside a `.card`
steps to `--surface-2` automatically. Every card needs a border of `1px solid var(--border)`.

**Shadows** are for floating elements only:
- Menus: `0 12px 32px rgba(0,0,0,.5)`
- Modals: `0 12px 40px rgba(0,0,0,.6)` to `0 24px 64px rgba(0,0,0,.6)`

**In Based, every card, panel and table needs its own background** (`var(--surface)`). The page has a texture that
would show through otherwise.

**Focus:** `outline: 2px solid var(--accent)` with a 2 px offset comes from the base styles. Never remove it.

---

## 7. Components

Import from `src/themes/o1/components/ui/index.jsx`.

### Button

`<Button variant size fullWidth as>`. Use `as="a"` for links.

| Variant | Look | Use |
|---|---|---|
| `primary` | Accent fill, `--on-accent` text | The one main action in a view |
| `secondary` (default) | `--surface`, `--border-strong` border | Everything else |
| `ghost` | Transparent, `--text-2`, fills on hover | Low-priority actions |
| `warn` | Amber fill | Rare, for an action that needs attention |

| Size | Height | Padding | Radius |
|---|---|---|---|
| `sm` | 32 px | 0 12 px | 10 px |
| `md` (default) | 40 px | 0 16 px | `--r-md` |
| `lg` | 52 px | 0 24 px | `--r-lg`; full-width pill at 768 px and below |

Icon gap 8 px. Pressed: `scale(0.98)`. Disabled: opacity 0.45. While loading, show `Loader2` spinning and a short
label ("Claiming on Base...").

### Card

`<Card hover>`: `--surface`, 1 px border, `--r-lg`, padding 20 px. `hover` makes it step to `--surface-2` with
`--border-strong`. Use it for clickable cards only.

### Tile

`<Tile label value sub icon>` shows one metric, such as a balance or a pool. The value is mono. Add `tile-danger` for a
red value.

### Badge and StatusPill

`<Badge tone pill>`, with tones `neutral`, `accent`, `success`, `warn` and `danger`. Plain badges are 20 px high and
pills are 24 px. `<StatusPill status>` picks the tone from the text:

| Status | Tone |
|---|---|
| Live, active, unlocked, eligible | `success` |
| New, info, pre | `accent` |
| Warn | `warn` |
| Ended, not eligible | `danger` |
| Anything else (locked, upcoming) | `neutral` |

### PageHeader and SectionTitle

Every page starts with `<PageHeader title description badge action>`, left-aligned: one sentence of description, no
hero art. Sections inside a page use `<SectionTitle title count right>`.

### Alert

`<Alert tone icon action>`, with tones `info`, `warn`, `success` and `danger`. It takes the tone's `-bg` and `-bd`
colours, `--r-md` and padding 12 px 16 px. The text stays `--text`, so it remains readable.

### EmptyState and ProgressBar

- `<EmptyState icon title description action>`: centred, padding 48 px 24 px. Say what is missing and what happens
  next, never just "No data".
- `<ProgressBar value max>`: 4 px high, `--surface-3` track, accent fill.

### Segmented control

`.seg` with `<button aria-selected>` inside. A pill row: 32 px buttons, 14 px, selected in accent fill. Add `.soft` for
the quieter accent-soft version. Use it for switching a view or filter.

### Forms

Use `.vwp-field`: label 12 px, 600, `--text-2`, gap 6 px. Inputs and selects are 44 px high, padding 0 12 px, 10 px
radius, on `--surface-2` with a `--border` border that turns `--accent` on focus. `.vwp-amount` holds an amount with a
token select.

---

## 8. Patterns

### A new page

```jsx
<section style={{ padding: '24px 0 60px 0' }}>
  <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
    <PageHeader title="Page name" description="One factual sentence about what it does" />
    {/* sections 24px apart */}
  </div>
</section>
```

Then add the route in `src/themes/o1/App.jsx`, the view in `BaseAppView.jsx` and the item in `BaseAppSidebar.jsx`. Give
the page a stylesheet `styles/o1-<page>.css` with `o1-<page>-*` classes, and import it in `src/themes/o1/index.js`
before `based.css`.

### Navigation

- **Sidebar item:** 40 px high, padding 0 10 px, 10 px radius, 18 px icon. Active: `--accent-soft` with `--accent`.
  Hover: `--surface-2` with `--text`.
- **Sidebar groups:** Navigation, Tools, $VIBE Docs, DEX, Socials.
- **Bottom bar:** Profile, Swap, Rewards Hub, Claim, More. Other pages live in the More sheet, and on those pages More
  counts as the current tab. Classes: `.base-app-bottom-nav`, `.bnav-track`, `.bnav-item`.
  - **O1:** full-width dark bar with `--text-3` icons, `--accent` when active, and a raised 52 px Rewards Hub circle in
    the centre.
  - **Based:** a floating bar of white glass, 12 px from the screen edges, with a blur and `--r-xl` corners. All icons
    and labels are `--accent`. A glass marker (`.bnav-glider`, `--r-lg`) slides to the current tab, whose label goes
    from 500 to 600. Rewards Hub is a regular tab here.
- **Header:** logo on mobile, then Agent Zone, wallet toggle, theme switcher, streak and NFT pills, and the wallet or
  Connect button. Everything is a pill: 36 px on desktop, 32 px on mobile.
- **Try demo** (always, with or without a wallet): on desktop a secondary pill in the middle of the header (the header
  is a `1fr auto 1fr` grid), with an (i) beside it whose popover explains the demo, like the achievements' info. On
  phones it is a 40 px `--accent-soft` strip above the header with the same (i) and a × that hides it until the next
  page load. While the read-only demo is on, both hide and a 40 px amber banner with Tour and Exit demo sits above the
  header (`src/components/demo/`).
- **Demo tour** (demo only): a welcome card, then steps (`components/demo/tourState.js`) that open a page, ring one
  block in `--accent` over a dimmed page and show a card with a caret beside it (docked above the bottom bar on
  phones). Clicks pass through the dim, so the highlighted action can be tried. The banner's Tour button reopens it.

### Campaign card

`.o1-campaign-card`: a 16:9 image with a dark gradient overlay, a badge top-left and a 13 px `--on-image` title
bottom-left. `--r-md`. Active: accent border and outline. Hover: the image scales to 1.02. In Based the badge sits on a
white plate so its colour stays readable over the art. Any text placed on artwork follows the same rules.

### Featured card

`.o1-hub-featured-card`: padding 20 px, gap 18 px. It has a head (40 px icon, 16 px name, 12 px sub, status badges on
the right), then a tile grid, then the action row aligned right. On mobile the action row stacks at full width.

### Tables and schedules

`.o1-schedule-card` wraps a `--r-md` block. The head is `--surface-2`, 12 px, 500, `--text-3`. Rows are padded 14 px
16 px with a `--border` divider and `--surface-2` on hover. At 640 px and below the head hides and rows reflow. Long
lists scroll inside the card (`.o1-schedule-scroll`).

### FAQ

`.o1-faq-card` with `.o1-faq-item` and `.o1-faq-trigger`: rows of 13 px, 600, padding 14 px 16 px, divided by
`--border`, with a chevron on the right.

### Modals

| Type | Classes | Width | Enter animation |
|---|---|---|---|
| Form or confirmation | `.vwp-modal-overlay`, `.vwp-modal` | 440 px | `vwp-pop`, 0.18 s |
| Share after a claim | `.o1-share-modal-overlay`, `.o1-share-modal-card` | 440 px | None |
| Celebration after a mint | `.o1-nft-modal-overlay`, `.o1-nft-modal-content` | 400 px | `o1-mint-card-in`, 0.32 s |

The overlay is fixed, centres its card, has 16–20 px padding and a dark blurred backdrop. The close button sits
top-right, 28 px. A modal must scroll on small screens.

### Transaction states

Each on-chain action goes through: idle → waiting for the wallet → pending (spinner on the button) → success (a Basescan
link) or error (a short message in plain words). Rejecting in the wallet is not an error, so return to idle quietly. The exception is the Claim Portal: the wallet doesn't
always tell a rejection from a failure, so its claim buttons show "Claim was cancelled or failed" for both.

### Connect wallet

Pages stay readable when logged out. Show "Connect wallet to verify", "Not connected" or "Log in to see your wallet" in
place of personal data, and keep the public numbers visible.

---

## 9. Motion

| What | Duration | Easing |
|---|---|---|
| Hover and colour changes | 0.15 s | `ease` |
| Button press | 0.05 s | `ease` |
| Sidebar width | 0.2–0.25 s | `ease` / `cubic-bezier(0.16, 1, 0.3, 1)` |
| Progress fill | 0.3 s | `ease` |
| Modal entrance | 0.18–0.32 s | `cubic-bezier(0.16, 1, 0.3, 1)` |

**In general:** UI feedback takes 120–240 ms. Animate `transform`, `opacity` and colours only. No motion blur, no 3D, no
bounce. Decorative loops belong only to the Agent Zone hero.

**`prefers-reduced-motion` is always respected.** The base styles cut transitions and animations to almost nothing,
and Based turns its own animations off.

**Based only**, all using `--ease` (`cubic-bezier(0.4, 0, 0.2, 1)`):
- Pages slide up 10 px in 240 ms (`based-slide-in`).
- Page titles reveal with a Base Blue square wipe in 560 ms (`based-reveal`, `based-wipe`).
- The bottom bar marker slides between tabs in 240 ms.
- The background texture drifts slowly over 48 s (`based-drift`).

---

## 10. Icons and images

**Icons:** [lucide-react](https://lucide.dev) only, with `strokeWidth={1.75}` in navigation.

| Where | Size |
|---|---|
| Inline in a tile, badge or small button | 12–14 px |
| Buttons and rows | 15–16 px |
| Sidebar | 18 px |
| Mobile menu button, bottom bar | 20–22 px |

Icons take a colour from their text or a token.

**Images** live in `public/`.

| Asset | Path | Shape |
|---|---|---|
| Logo | `/logo.png` | Always this file |
| Site icons | `/favicon.ico`, `/icon-192.png`, `/apple-touch-icon.png` | Made from the logo |
| Link preview card | `/x-banner.png` | 1200×630, O1 look |
| NFT art | `/nft/images/{id}.png` | 1:1 |
| Campaign art | `/rewards-hub/*.webp` (800×450; `.jfif` originals kept) | 16:9, `object-fit: cover` |
| Royalty banners | `/vibe-club-royalties-*` | 16:9 |
| Docs screenshots | `/docs-media/{o1,based}/*.webp` | One per theme; sizes in `pages/docs/shotSizes.json` |
| Partner logos | `/brands/*` | Square |

Images that sit on a colour need their own rounded frame. A white logo that needs ink on a light tile gets a scoped
filter in `based.css`.

**Based background:** fine vertical gray lines and dot-matrix clusters in the free space of the page, fixed to the
viewport, on `.base-app-shell`. It is weaker on mobile. The docs go without it, because their long text sits right on the page. Don't add other page backgrounds.

**Glows** are O1 only. Based stays flat, and `based.css` removes them.

---

## 11. Copy

- **Language:** English, in sentence case ("Claim Portal" and "Vibe Club NFT" are names and keep their capitals).
- **Token:** always `$VIBE`. Numbers use commas: `10,000,000 $VIBE`. Compact forms are fine in tight spots: `31.50M`.
- **ETH:** as `0.005 ETH`, gas as `~0.0001 ETH`.
- **Dates:** `25 Oct, 00:00 UTC`. Always show UTC for rounds, snapshots and claim windows.
- **Countdowns:** `19d 01h 04m 01s`, in mono.
- **Addresses:** in full where people copy them, and short as `0x9E92...b886` elsewhere.
- **Domain:** always vibehome.dog.
- **Page descriptions:** one factual sentence with no full stop: "Personal reward allocations, active claims, and
  distribution history".
- **Buttons:** verb first: "Go to Claim Portal", "View rules", "Connect wallet".
- **Names to keep:** Rewards Hub, Claim Portal, Vibe Club NFT, Agent Zone, Vibe Agent Wallet, Official addresses.

---

## 12. Files

| File | What it holds |
|---|---|
| `src/theme.js` | Theme list, fonts, how the theme is chosen |
| `src/themes/o1/styles/o1-tokens.css` | All tokens (O1 values), base type, focus, scrollbars |
| `src/themes/o1/styles/based.css` | Based tokens, texture and motion |
| `src/themes/o1/styles/o1-components.css` | Buttons, cards, tiles, badges, segmented control, header, alerts, empty state |
| `src/themes/o1/components/ui/index.jsx` | The React components for the above |
| `src/themes/o1/styles/o1-{hub,claim,profile,swap,nft,tokenomics,contracts,admin,docs}.css` | One page each |
| `src/themes/o1/pages/docs/` | Docs at `/docs`: shell (`DocsPage.jsx`), blocks (`kit.jsx`), content by menu group (`pages/`) |
| `src/themes/o1/components/BaseApp{View,Sidebar,Header,BottomNav}.jsx` | App shell |
| `src/components/wallet/WalletPages.css` | Wallet, Account, Settings, forms, modals (`vwp-*`) |
| `src/components/agent/AgentsPage.css`, `SkillPage.css` | Agent Zone and Skill (`agp-*`, `skp-*`) |

**New CSS goes** into the stylesheet of its page, or `o1-components.css` if it is reused. Don't add to
`BaseAppTheme.css` or `src/themes/o1/index.css`: they hold older layers.

---

## 13. Checklist

Before shipping a UI change, check that:

- [ ] It looks right in both themes: `?theme=o1` and `?theme=based`.
- [ ] It works at desktop width and at 375 px, with no sideways scrolling.
- [ ] Nothing is hidden behind the bottom bar or the sidebar.
- [ ] There are no hard-coded colours, and only tokens from this file.
- [ ] It reuses existing components.
- [ ] Hover, focus, disabled, loading, empty and error states exist.
- [ ] It works logged out as well as logged in.
- [ ] Numbers are mono, dates are in UTC, and the copy follows section 11.
- [ ] This file is updated if the design changed on purpose.
