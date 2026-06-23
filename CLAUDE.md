# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Behavioral Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused; leave pre-existing dead code alone.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Development

**No build step.** This is a static site — vanilla JS ES modules served directly.

```bash
# Serve locally (required for ES modules and service worker)
python3 -m http.server 8080
# then open http://localhost:8080

# Deploy: push to main — GitHub Pages redeploys automatically
git push

# Regenerate PWA icons (pure Python, no deps)
python3 icons/gen_icons.py
```

The app cannot be opened as a plain `file://` URL — ES modules require a server origin. Any static server works.

**When the service worker cache changes** (new file added, file renamed), bump `CACHE` in `sw.js` from `love-notes-vN` to `love-notes-v(N+1)` and add the new file to the `ASSETS` array.

---

## Architecture

### Core constraint: local-only, zero dependencies

All data lives in IndexedDB on the user's device. No backend, no CDN libraries, no npm. The app must remain fully functional offline after first load.

### Module dependency graph

```
index.html
└── js/app.js          ← boots the app; owns router, sheet API, nav wiring
    ├── js/db.js        ← IndexedDB wrapper; the only place that touches storage
    ├── js/theme.js     ← reads/writes localStorage key 'ln-theme'; sets data-theme on <html>
    └── js/screens/*.js ← one module per route; each exports mount()
        └── js/tips-engine.js  ← pure functions, no imports; imported by home.js and tips.js
```

`db.js` and `tips-engine.js` have no imports — they are safe to import anywhere without circular dep risk.

### Router and screen contract

`app.js` lazy-imports screens via dynamic `import()`. Every screen exports a single function:

```js
export async function mount(container, db, navigate, showSheet, hideSheet) { … }
```

- `container` — the `<main>` element; screens write directly to `container.innerHTML`
- `db` — the entire `db.js` module (namespace import), passed by reference
- `navigate(route)` — pushes a new hash route and mounts the target screen
- `showSheet(html)` / `hideSheet()` — open/close the global bottom-sheet modal

Screens must not import `app.js`. All app-level APIs are injected via the `mount` parameters.

### Data model (IndexedDB, DB name: `love-notes`, version 1)

| Store | Key | Notable fields |
|-------|-----|---------------|
| `profile` | `id = 'main'` | name, nickname, birthday, anniversary, firstDate, loveLanguage, howWeMet, profileNotes |
| `preferences` | `id` (UUID) | category, sentiment (`'love'`\|`'hate'`\|`'neutral'`), item, notes, createdAt |
| `notes` | `id` (UUID) | content, tags (string[]), createdAt, updatedAt |
| `dates` | `id` (UUID) | title, type, date (YYYY-MM-DD), recurring (bool), leadTimeDays, notes |

All IDs use `crypto.randomUUID()`. The `profile` store holds exactly one record (`id='main'`). To bump the schema, increment `DB_VERSION` in `db.js` and handle migration in `onupgradeneeded`.

### Tips engine (`js/tips-engine.js`)

Pure functions — no side effects, no imports. `generateTips({ profile, preferences, dates })` returns an array of tip objects:

```js
{ type: 'date'|'fact'|'insight', icon, title, lines: string[], urgency: 0–3 }
```

Urgency thresholds: `>= 2` = "coming up soon", `>= 3` = today/tomorrow. Tips are surfaced on both the Home screen (top tip only) and the Tips screen (all, grouped by urgency).

To add a new tip rule: add a function that returns `{ type, icon, title, lines, urgency }` and call it inside `generateTips`.

### Theme system (`js/theme.js`)

Stores `'light'` or `'dark'` in `localStorage` key `ln-theme`. `'system'` means no key — CSS `prefers-color-scheme` media query takes over. `initTheme()` is called before first render in `app.js` to avoid flash.

Dark mode is implemented as CSS custom property overrides under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` in `css/app.css`.

### CSS design system (`css/app.css`)

All colors, radii, and shadows are CSS custom properties on `:root`. Dark mode works by overriding the same properties — no component-level dark-mode rules. When adding new UI, use existing variables (`--accent`, `--surface`, `--bg`, `--text`, `--border`, etc.) and dark mode will apply automatically.

The `--info` / `--info-soft` variables are for neutral-sentiment badges (blue tint). The `--accent` / `--accent-soft` variables are for the rose/love theme.

### Bottom sheet pattern

`showSheet(html)` injects HTML into `#sheet-content` and animates in from the bottom. Any element with `data-close-sheet` attribute is auto-wired to `hideSheet()`. Sheets are used for all add/edit forms across every screen.

### Sub-routes (`categories/`)

The categories screen handles its own internal routing via `location.hash` (`#categories/food`, etc.) to allow deep-linking into a specific category. All other screens use flat hash routes (`#home`, `#notes`, etc.).

### Deployment

GitHub repo: https://github.com/JLambs33/love-notes  
Live app: https://jlambs33.github.io/love-notes/  
Deploys automatically on push to `main` via GitHub Pages (static, root of branch).
