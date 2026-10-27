# Worklog

Chronological, terse. Update at the end of each working session so resuming after a pause is fast.

Format: date + 2–6 lines per session. What got built, what's next, anything weird discovered.

---

## Session 6 (2026-10-27) — the 2026-10-20 sweep's briefs, one at a time

Built from `corpus/briefs/`, in number order; each brief's outcome note has the details.

**Built:**
- Brief 01: no CORS; the API answers 403 to any request whose `Origin` is another site's (`api/src/lib/origin.ts`, `WEB_ORIGINS`).
- Brief 02: the eight non-imobiliare adapters read the price with `extractPriceEur()` (a fresh number, 5,000-5,000,000 €, not "Preț vechi"), not a regex that took the floor number too.

## Session 5 (2026-10-16) — Saved tab: paste a link, confirm, compare

**Built:**
- **Saved tab.** Paste one listing's link → Fetch details → a draft form with every field marked "from page", "edited" or "not on page" → Save. Saved apartments sit in a table sortable by newest, price, €/m², m² and year built, with notes, a thumbnail, Edit (dialog) and two-click Delete. A link already saved shows "Already saved" instead of a second copy. Each row in the Listings table got a "save" action that opens the same flow.
- API: `POST /api/saved/scrape` (reads only), `GET/POST /api/saved`, `PUT/DELETE /api/saved/:id`; new `saved` table. Extraction lives in `api/src/details/` and works on any site: storia's JSON, Romanian label/value lines, Open Graph, phrases. See [adapters.md](adapters.md#single-listing-pages-the-saved-tab).
- `lib/fetch.ts` now times out after 20 s (it could hang a refresh forever before).
- Formatters moved from `ListingsTable` into `web/src/lib/format.ts`.

**Verified:**
- api 88/88 and web 39/39 tests; `tsc --noEmit` clean in both; `vite build` clean.
- Live, through the running API: storia 9 of 10 fields (no partitioning on that page), foxfort 10 of 10, both matching the page. imobiliare.ro → "bot check" and an empty form. localhost links refused, unknown host reported.
- Drove the built UI in headless Chrome: fetch, edit a price, save, the table, the edit dialog.

**Weird:**
- imobiliare.ro now blocks this machine for plain fetch (Cloudflare) **and** headless Chromium (DataDome CAPTCHA). The search adapter is affected too. storia.ro answers plain fetch now. Noted in [adapters.md](adapters.md); adapters not changed.
- `vite` dev failed here with `ENOSPC`: the inotify watch limit (already 524288) was used up by VS Code's file watcher with all of `~/projects` open (~500k watches). Opening just this repo in VS Code, or excluding `node_modules`/`dist` in `files.watcherExclude`, frees them. `npm run build && npx vite preview` works meanwhile.

**Later the same day:**
- A "save" from Listings fetched twice under React StrictMode in dev; a ref now keeps it to one, with a StrictMode test that fails without it.
- No tab had looked selected since session 3: the styles keyed on `data-selected`, but Base UI 1.x sets `data-active`. Fixed in `ui/Tabs.tsx`, with a test pinning the attribute. The Listings table's m², price and €/m² also stopped wrapping their unit onto a second line.
- README rewritten to the shared readme-docs standard, with `docs/getting-started.md` and real screenshots in `docs/images/`, taken from a throwaway clone filled by `docs/images/demo-seed.mjs`. `shots.md` says how to re-take them.

**Next:**
- Open the Saved tab on a real imobiliare listing in the owner's browser: if the block lifts, check what the extractor reads there (no fixture yet).
- Maybe: re-check a saved apartment for price changes; join saved rows to `listings` history. See the end of [decisions.md](decisions.md).

---

## Session 4 — Vitest set up; bug audit; CSS, Select, DB, and imobiliare adapter fixes

**Built:**
- **Vitest** added to both packages (`vitest@4.1.7`). api uses `node` environment; web uses `happy-dom` + RTL + `@testing-library/jest-dom`. Tests are co-located next to source files. `npm test` and `npm run test:watch` scripts wired up. Verified Jest is not present anywhere. See [testing.md](testing.md) for the full setup.
- **Bug audit** via the Playwright MCP. Drove the live UI: tabs, Sources Save flow, Refresh (30 real imobiliare listings scraped), Report-issue dialog. Logged ten bugs and fixed all of them in the same session.

**Bugs fixed in this session:**
1. CSS — bare `button { background: transparent; border: none; padding: 0 }` block in `styles.css` was unlayered, overrode every Tailwind utility on every button (Refresh, Save, Discard, tabs, select triggers, dialog buttons). Removed; Tailwind preflight handles the reset.
2. CSS — `html { font-size: 13px }` shrank the rem base, making `h-7` measure 22.75px instead of 28px. Moved the 13px font-size to `body` only.
3. Tabs visually touching ("LISTINGSSOURCES") — symptom of #1; fixed automatically when the bare button reset was removed.
4. ListingsPage Sort/Order Select showed raw value (`lastSeen`, `desc`) instead of the human label. Added `SelectValueLabel` primitive (`<BaseSelect.Value>` with explicit `labels` map). Sort, Order, and Source filter selects all use it now.
5. Favicon 404 — added an inlined SVG favicon to `web/index.html` (16x16, black square on paper).
6. DB seed couldn't fix stale DBs (old `INSERT OR IGNORE` left `enabled=0` on imobiliare/storia for any DB created before session 2). Added a `PRAGMA user_version`-gated one-shot migration that flips defaults on rows where `last_run_at IS NULL`.
7. imobiliare adapter — title contained the embedded price suffix. Added `stripTrailingPrice()` to `normalize.ts`; adapter calls it on the title.
8. imobiliare adapter — rooms regex matched fractional formulations like "1,5 camere". Added negative lookbehind `(?<![\d.,])` so "5 camere" doesn't match when preceded by "1,".
9. imobiliare adapter — price regex picked the FIRST euro match in card text, so "+ 2000 € Discount" beat the real "111.359 €" price. Added `pickLargestPriceEur()` which scans every euro token and returns the max.
10. imobiliare adapter — location was always null. Added `locationFromImobiliareUrl()` that extracts the neighborhood from the URL slug (`/timisoara-<neighborhood>-N-camere-…`).

**Verified end-to-end:**
- `npm test` in both packages: api 29/29, web 15/15. No `.fails()` markers left — the bug that documented the "1,5 camere" issue is now a regular passing test.
- `tsc --noEmit` clean in both packages.
- Booted dev servers and drove the UI with Playwright again. Confirmed:
  - 0 console errors (was 1: favicon 404)
  - Tab strip has 20px padding + 1px divider between tabs; rem base is 16px
  - Sort/Order selects display "Sort: last seen" and "↓ desc" not raw values
  - DB migration ran: imobiliare and storia both `enabled=true` automatically on the existing dev DB
  - After re-refresh: **30/30 rows have a non-null location**, **0/30 titles end in €**, "discount row" priced at 111,359 € (was 2,000 €), "1,5 camere" row parsed as rooms=2 (was 5)

**Notes for next time:**
- The CSS lesson is in [decisions.md](decisions.md) now: don't add bare-element selectors after `@import 'tailwindcss';` — they outrank `@layer utilities`. Wrap any future ones in `@layer base { ... }`.
- The PRAGMA `user_version` migration scheme is in place. If you need another migration (new column, default change), bump to version 2 and add another `if (currentVersion < 2)` block in `db/index.ts`.
- imobiliare adapter still has one rough edge: titles like "Dezvoltator -3% Discount aplicat: Ap si Boxă +" get cut at the discount blurb's "+" because we treat what follows as a price token. Not a regression — the data is still better than the old "...125.000 €" suffix. Worth revisiting if/when you tighten the title selector to use just an `<h2>`.

---

## Session 3 — terminal/retro theme, Tailwind v4, Base UI primitives

**Built:**
- Loaded design principles from `pbakaus/impeccable` (skill files: color-and-contrast, typography, spatial-design) — surfaced rules around OKLCH neutrals, tinted-grays, single-accent palettes, 4pt spacing, "cards are overused."
- Pulled in retro-terminal visual references from outside the project to lock direction. Settled on **monospace + 1px ink-black borders + sharp 90° corners + paper background + offset-pixel shadows on overlays**.
- Added **Tailwind v4** via `@tailwindcss/vite`. Tokens live in `@theme` directive inside `web/src/styles.css`, not a config file.
- Added **Base UI** (`@base-ui/react@1.5.0`), **clsx** + **tailwind-merge** for the `cn()` helper at `web/src/lib/cn.ts`.
- Built primitive component library at `web/src/components/ui/`: Button (3 variants), Input, Textarea, Checkbox, Field/FieldLabel/FieldDescription/FieldError, Select + parts, Dialog + parts, Tabs + parts, Panel, Badge (4 tones), StatusDot. **Rule: nothing in the app uses bare `<button>`, `<input>`, `<select>`, or hand-rolled modals anymore. Everything composes from `ui/` primitives.**
- Migrated all pages: `App.tsx`, `ListingsPage`, `SourcesPage`, `ReportIssueButton`, `ListingsTable`, `PriceHistory`. Replaced the inline-styled modal in `ReportIssueButton` with proper Base UI Dialog (real focus trap, escape handling, accessibility tree).
- Rewrote `docs/design.md` from the flat stitch output to a concrete terminal/retro spec — palette, type scale, primitive table, anti-goals.

**Visual changes worth noting:**
- Sticky header (36px) + sticky footer (36px), both with 1px ink top/bottom borders. Title is uppercase + bold + tracked tight.
- Tabs are underline-driven (2px ink line under active tab flush with the list border). Inactive tabs are `ink-dim`, hover lifts them to `ink`.
- Tables: no zebra striping; soft 1px `rule-soft` between rows; header background `panel-alt` with uppercase tracked label. Headers use `text-xs` not `text-sm` so they read as labels not data.
- Dirty source rows on the Sources tab get an accent (burnt ochre) border instead of ink, plus a "▸ modified" caret. No glow, no shadow.
- Dialog and Select popups get a hard-edge offset shadow (e.g. `shadow-[4px_4px_0_0_var(--color-ink)]`) — looks like a printed sticker. Nothing else has shadows.
- Global `* { border-radius: 0 !important; }` rule enforces sharp corners — required because Tailwind's defaults round things and Base UI doesn't dictate visual style.

**Verified:**
- `npx tsc --noEmit` clean.
- `vite build` clean — 16.5 KB CSS, 384 KB JS. CSS contains the theme tokens and compiled `bg-ink`, `border-ink`, `bg-paper`, `bg-panel` utilities.
- Dev server boots, serves the updated CSS, page renders.

**Dependencies added (all exact-pinned via `.npmrc save-exact`):**
- `@base-ui/react@1.5.0`
- `tailwindcss@4.3.0`, `@tailwindcss/vite@4.3.0`
- `clsx@2.1.1`, `tailwind-merge@3.6.0`

**Notes for next time:**
- When adding a new UI element, **search `web/src/components/ui/` first.** If the primitive doesn't exist there, add it as a new wrapper around the Base UI primitive (not as inline JSX). The contract: app code only imports from `ui/`, never from `@base-ui/react/*` directly.
- Customize via `cn()` and the `className` prop. Do not use inline `style={{...}}` for visual properties; reserve inline styles for layout calculations only (e.g. dynamic widths).
- The terminal palette is in `@theme` inside `styles.css`. Add new colors there before referencing them in components.
- `text-paper` / `bg-ink` / `border-rule-soft` etc. are real Tailwind utilities now (because Tailwind v4 generates them from the `@theme` tokens). The autocomplete won't know them but they work at build time.

---

## Session 2 — sources Save button, light theme, issues channel

**Built:**
- **Light theme**: rewrote `web/src/styles.css` from a dark palette to an off-white one (panels white on `#f7f8fa` background, blue `#2563eb` accent). Tables now look like cards with rounded borders. Inputs get a blue focus ring. Status dots and source badges re-tuned for light contrast.
- **Explicit Save on Sources page**: `web/src/pages/SourcesPage.tsx` now keeps edits in a local `drafts` dict. Save button is disabled when nothing is dirty; shows "N unsaved changes" indicator when there are. Discard button reverts drafts to server state. Dirty rows get a blue border + soft glow.
- **Report-issue channel**: button in the top-right corner of the app (sits next to the `<h1>`). Opens a modal, user types feedback, POST `/api/issues` writes a markdown file to `issues/` at repo root. The 10-issue cap is enforced server-side (409 + clear error message) and surfaced in the button label (`Report an issue (N/10 — full)`).
- New api route `api/src/routes/issues.ts`. Hard cap = 10. File naming: `<unix-ms>-<slug>.md`, YAML frontmatter with `id` + `createdAt`.
- Docs: `docs/issues.md` with the workflow ("Claude reads, fixes, deletes the file with rm — no in-app resolve button").

**Verified:**
- Both `tsc --noEmit` runs clean (added `web/src/vite-env.d.ts` for `declare module '*.css'`).
- Issues round-trip works: empty body → 400, normal submit → file appears on disk with correct frontmatter, 11th submission → 409 + status stays at 10.
- Vite serves the updated light-theme CSS.

**Notes for next time:**
- When processing `issues/*.md`, delete the file with `rm` (or `Edit` to nothing) as part of the same change that addresses it. Don't append "fixed in commit X" — file existing == pending, file gone == done.
- `ApiError` class lives in `web/src/api.ts` — use `instanceof ApiError` to recover the server's `error` string in catch blocks.

---

## Session 1 — initial scaffold + v1 complete

**Built (in this order):**
- Repo skeleton: `api/`, `web/`, `data/`, `docs/`.
- `api/` package.json + tsconfig + .npmrc (pinned exact versions).
- DB layer: `schema.sql`, `db/index.ts` (connection + boot + adapter seed), `db/queries.ts` (typed helpers for sources, listings, price history).
- Adapter interface (`adapters/types.ts`), shared libs (`lib/fetch.ts` cookie jar, `lib/playwright.ts` chromium singleton, `lib/normalize.ts` RO price/rooms/m² parsers).
- All 9 adapters: imobiliare, storia (Playwright), foxfort, blitz, hitchmosher, agentie-imo-tm, apostu, primum, district.
- Adapter registry (`adapters/index.ts`) — explicit map, not auto-discovery.
- Fastify routes: GET/PUT `/api/sources`, GET `/api/listings`, POST `/api/refresh`. `refresh.ts` is the sequential per-source try/catch loop.
- React app: `App.tsx` (tab switcher), `ListingsPage`, `SourcesPage`, `ListingsTable`, `PriceHistory` (inline SVG sparkline). Vite proxies `/api/*` to fastify.

**Verified end-to-end:**
- `npm install` succeeds in both packages; api postinstall pulled chromium.
- Both `tsc --noEmit` runs clean.
- API boots, all three endpoints respond correctly. `GET /api/sources` returns 9 rows with imobiliare + storia enabled by default. `POST /api/refresh` with no configured URLs returns `{perSource:[]}` (correctly skips disabled/unconfigured sources).
- PUT toggle round-trips: enabling a source + setting its URL persists across the next GET.
- Web boots on :5173. Vite proxy forwards `/api/sources` to fastify successfully.

**Known limitations:**
- 7 of 9 adapters were not live-verified against real markup during dev (the agency sites' anti-bot blocked the research environment's WebFetch). Expect to iterate selectors on first real run for: imobiliare, apostu, primum, district, hitchmosher, agentie-imo-tm. foxfort and blitz had their markup confirmed in the planning phase.
- Each cheerio adapter uses a defensive "find listing-link anchors, climb to closest card container, regex out price/rooms/m² from card text". This is intentionally pessimistic — when a selector breaks, the adapter returns fewer rows rather than throwing.
- storia adapter waits on `a[href*="/oferta/"], [data-cy="search.listing"]`. If storia's DOM uses different markers when actually rendered, that selector list is the first thing to adjust.

**Next session (when you come back):**
- Run `cd api && npm run dev` and `cd web && npm run dev`. Open :5173 → Sources. Paste a real imobiliare.ro search URL, click Refresh.
- For each source that returns 0 rows: open the search URL in your browser, view source, find a listing link, adjust the corresponding adapter's anchor selector + text regexes.
- If storia times out on `waitForSelector`, screenshot or `page.content()`-dump the rendered HTML and adjust the wait target.

**Decisions worth flagging:**
- `tsx`-only runtime (no `tsc` build for api). `allowImportingTsExtensions: true` + `noEmit: true`. The user explicitly asked for `.ts` import suffixes.
- Vite proxy used instead of hardcoding `http://127.0.0.1:3000` in `api.ts`. Makes the fetch calls portable if someone moves the api later.
- `dim "stale" listings` cutoff is `lastRefreshAt - 5_000` — chosen so just-completed scrapes don't get marked stale due to client/server clock skew. Adjust if it ever feels wrong.
