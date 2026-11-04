# Testing

Both packages use **Vitest 4**. Jest is intentionally absent — don't add it back.

```sh
cd api && npm test              # one-shot, exits when done
cd api && npm run test:watch    # watch mode

cd web && npm test
cd web && npm run test:watch
```

Both `test` scripts run `vitest run` (single-shot, suitable for CI). `test:watch` is `vitest` (interactive).

## api/

- Runtime: `environment: 'node'`. No DOM.
- Config: [api/vitest.config.ts](../api/vitest.config.ts).
- Globs: `src/**/*.test.ts`.

**What's covered today**

| File | What it exercises |
|------|-------------------|
| `src/lib/normalize.test.ts` | All the `normalize.ts` helpers — `parsePriceEur`, `extractPriceEur` (the adapters' price: the numbers in front, ranges, discounts, €/m², "Preț vechi", the 5,000-5,000,000 € range), `extractPrice`/`cardPrice`/`isPlusVat` (the "+ TVA" mark, on the amount it follows), `parseRooms`, `parseSqm`, `cleanText`, `slugFromUrl`, `stripTrailingPrice`, `locationFromImobiliareUrl`. Includes regression tests for the imobiliare data-quality bugs (discount-fragment price, fractional rooms, embedded title price, neighborhood extraction). |
| `src/app.test.ts` | The real app on an in-memory database (`RO_HOUSING_DB=:memory:`, issues in a temp folder), with `inject()`: the `/ro-housing-api` prefix stripped, the health check open, every other `/api` route 401 without a session, no sign-up and no rename (404 for a signed-in session), a seeded account signing in from `PUBLIC_ORIGIN` with a `ro_housing_session` cookie on `/ro-housing-api` that reads and writes, the Host and Origin guards still in front, a wrong password refused. |
| `src/config.test.ts` | `loadConfig`: the local defaults, the container's settings, every bad variable named at once, half the Ward settings or a callback outside `/ro-housing-api` refused. |
| `src/lib/host.test.ts` | The guard against DNS rebinding: the allowed hostnames, `HOST` and `PUBLIC_ORIGIN`'s host, reading the hostname out of `Host` (port dropped, IPv6 in brackets, malformed values refused), and a bare Fastify instance driven with `inject()` answering 403 to `Host: evil.example:3000` on a read and a post and to a blank `Host`, and serving `localhost`, `127.0.0.1` and `[::1]` on any port and the `HOST` address when set. One test listens on a throwaway port and sends an HTTP/1.0 request with no `Host` over a raw socket, since `inject()` always fills one in. |
| `src/lib/origin.test.ts` | The guard that refuses other websites: the allowed-origin list, `WEB_ORIGINS` and `PUBLIC_ORIGIN`, and a bare Fastify instance driven with `inject()` (no port, no database) answering 403 to `Origin: https://evil.example` on a read, a form post and a preflight, and serving requests with no Origin or the app's own. |
| `src/adapters/imobiliare-feed.test.ts` | The RSS feed reader on a made-up feed: keeps flats for sale in Timișoara with title and link only, drops rentals, houses, land, other towns, repeats and other hosts; refuses any URL but the feed without a request; one request naming the app; a 403 or a non-RSS answer fails the run. |
| `src/adapters/imobiliare.test.ts` | The imobiliare adapter on two made-up search cards, with `lib/fetch.ts` mocked: the price over the crossed-out "Preț vechi" one and over a discount blurb, rooms, m², the neighborhood from the URL. |
| `src/routes/refresh.test.ts` | The one-at-a-time guard: a second `POST /api/refresh` during a run gets 409, and a new one is taken after a run finishes or fails; a run that returns no listings answers `warning: 'no listings found'` and every run's count is recorded. The database and the adapters are mocked (`db/index.ts` throws if loaded); a bare Fastify instance with `inject()`. |
| `src/lib/playwright.test.ts` | The shared Chromium, with `playwright` mocked: a launch that fails once is retried on the next call, calls share one browser, a disconnected browser is replaced (and a late event from an old one does not drop the new one), and `closeBrowser()` survives a failed launch; `--disable-dev-shm-usage` only when `CHROMIUM_DISABLE_DEV_SHM=1`. |
| `src/routes/issues.test.ts` | The slugify function used by the issue-write endpoint and the cap-counting logic. Uses a fresh `mkdtempSync` directory per test. |
| `src/details/extract.test.ts` | The listing-page extractor against trimmed real pages in `src/details/fixtures/` (storia, foxfort, primum, apostu, a DataDome page) and a hand-built hitchmosher page, plus the floor / top-floor / partitioning label parsers and the sanity ranges, the "+ TVA" mark taken from the layer that read the price, the JSON-LD price, the bare price under the title and the zone kept on one line. |
| `src/db/migrate.test.ts` | `addMissingColumns` on in-memory databases: an old-shape one (today's `schema.sql` without the added columns) gains `price_plus_vat` (and `sources` gains `last_run_count`) and keeps its rows; a second run and a new database are no-ops. Never opens `data/`. |
| `src/details/fetchPage.test.ts` | `looksBlocked`: both imobiliare bot-check pages are caught, the four real listing pages pass. |
| `src/details/url.test.ts` | URL normalization (tracking params, hash, trailing slash), site names, the local-address guard. |
| `src/routes/saved-input.test.ts` | Validation of a saved apartment: ranges, whole numbers, floor above top floor, partitioning vocabulary, the `pricePlusVat` boolean. |

**Conventions**

- Co-locate tests next to the file under test (`foo.ts` → `foo.test.ts`).
- `globals: false` — always `import { describe, expect, it } from 'vitest'`.
- Don't spin up the Fastify server in tests. Re-implement the small piece you need or extract it into a pure helper.
- When you find a bug, write a failing test first. If you can't fix the bug yet, mark the test `it.fails(...)` so the suite stays green and the test will flip to passing once the bug is gone.

## web/

- Runtime: `environment: 'happy-dom'`. Lighter than jsdom; fast enough.
- Config: [web/vitest.config.ts](../web/vitest.config.ts).
- Setup: [web/src/test/setup.ts](../web/src/test/setup.ts) — wires up `@testing-library/jest-dom` matchers and runs RTL `cleanup()` between tests (needed because we don't use `globals: true`).
- Globs: `src/**/*.test.ts` and `src/**/*.test.tsx`.

**What's covered today**

| File | What it exercises |
|------|-------------------|
| `src/lib/cn.test.ts` | The `cn()` helper — class joining, conditional objects, tailwind-merge conflict resolution. |
| `src/components/ui/Button.test.tsx` | Render, variant classes, click handler, disabled-state click suppression. |
| `src/components/ui/Checkbox.test.tsx` | Accessible role, onCheckedChange firing, controlled checked prop. |
| `src/components/ui/Dialog.test.tsx` | Trigger-open, title/description rendering, close-button unmount (with `waitFor` because Base UI has a 150ms fade-out transition). |
| `src/components/ui/Tabs.test.tsx` | Default tab renders its panel; click switches panel. The selected tab, and only it, carries `data-active`, the attribute the active-tab styles key on. |
| `src/lib/format.test.ts` | Floor formatting ("P/4", "3/4"), €/m². |
| `src/lib/apartment.test.ts` | Form strings ↔ saved record: prices as typed ("72.000 €", "72000.00", "72000 euro", "72 000", "85.500,00 EUR") and the 10,000,000 € cap, the +TVA box, "42,5 mp", "parter", per-field errors. |
| `src/pages/ListingsPage.test.tsx` | Staleness with `fetch` stubbed: on a fresh load, rows older than their source's last good run carry `data-stale` (also for a source whose last run failed), the Age cell's title has the last-seen time, and a failed Refresh shows an alert and dims nothing; a 409 says another Refresh is running; a Refresh where a source found nothing shows EMPTY and a warning line, and that run dims none of its rows; a listing priced before VAT shows +TVA beside its price and €/m²; with the API down (a 502 from the proxy), the alert and Retry instead of "No listings yet". |
| `src/AuthGate.test.tsx` | Sign-in with the vendored hooks on a stubbed `/ro-housing-api/auth`: signed out shows the login page at `/login` with no sign-up and no Ward button (one when the API has Ward), a wrong password is said and the right one shows the app; a 401 from `api.ts` tells its listeners; `pageOf` reads the three addresses. The page tests' `fetch` stubs refuse any call without the `/ro-housing-api` prefix. |
| `src/App.test.tsx` | The tabs keep their pages mounted: an open draft and its notes survive going to Listings and back, unsaved Sources edits survive a tab switch, and Sources re-reads the last runs when it opens again. |
| `src/pages/SavedPage.test.tsx` | The add-by-link flow with `fetch` stubbed: draft → edit → save (checks the POST body), the bot-check message, "already saved", a link handed over from Listings, two-click delete; a draft marked "+ TVA" by the page ticks the box, saves `pricePlusVat` and marks the saved row; fetching again over a draft with edits asks first (button, Enter, a "save" from Listings) and fetches at once when there are none; with the API down, the alert and Retry instead of the empty shortlist. |
| `src/pages/SourcesPage.test.tsx` | With the API down: the load shows the alert and Retry instead of an empty list; a failed Save says "Not saved", keeps the edit, and Retry saves it; a source whose last run found nothing says so. |

**Conventions**

- Co-locate tests next to the file under test.
- Use React Testing Library: query by role, never by class name or DOM structure.
- Use `userEvent` (not `fireEvent`) for interactions — it simulates the full event chain so Base UI state machines behave correctly.
- When Base UI components do enter/exit animations, wrap the post-action assertion in `waitFor(...)` instead of using fake timers.

## Bugs as tests

Whenever a bug is found in the live app, the fix lands together with a regression test that would have caught it. The current `normalize.test.ts` has explicit tests for the four imobiliare adapter bugs found in the session 3 Playwright audit:

- the card's price comes out of "+ 2000 € Discount … 111.359 €" (`pickLargestPriceEur` then; `extractPriceEur` since 2026-10-27, which also skips the "Preț vechi" amount)
- `parseRooms` rejects the wrong half of "1,5 camere"
- `stripTrailingPrice` removes the embedded euro suffix from titles
- `locationFromImobiliareUrl` extracts the neighborhood from the URL slug

If any of these tests goes red, the corresponding adapter behavior regressed.
