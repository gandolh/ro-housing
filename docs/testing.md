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
| `src/lib/normalize.test.ts` | All five `normalize.ts` helpers — `parsePriceEur`, `pickLargestPriceEur`, `parseRooms`, `parseSqm`, `cleanText`, `slugFromUrl`, `stripTrailingPrice`, `locationFromImobiliareUrl`. Includes regression tests for the imobiliare data-quality bugs (discount-fragment price, fractional rooms, embedded title price, neighborhood extraction). |
| `src/routes/issues.test.ts` | The slugify function used by the issue-write endpoint and the cap-counting logic. Uses a fresh `mkdtempSync` directory per test. |
| `src/details/extract.test.ts` | The listing-page extractor against trimmed real pages in `src/details/fixtures/` (storia, foxfort, primum, apostu, a DataDome page), plus the floor / top-floor / partitioning label parsers and the sanity ranges. |
| `src/details/fetchPage.test.ts` | `looksBlocked`: both imobiliare bot-check pages are caught, the four real listing pages pass. |
| `src/details/url.test.ts` | URL normalization (tracking params, hash, trailing slash), site names, the local-address guard. |
| `src/routes/saved-input.test.ts` | Validation of a saved apartment: ranges, whole numbers, floor above top floor, partitioning vocabulary. |

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
| `src/components/ui/Tabs.test.tsx` | Default tab renders its panel; click switches panel. |
| `src/lib/format.test.ts` | Floor formatting ("P/4", "3/4"), €/m². |
| `src/lib/apartment.test.ts` | Form strings ↔ saved record: "72.000 €", "42,5 mp", "parter", per-field errors. |
| `src/pages/SavedPage.test.tsx` | The add-by-link flow with `fetch` stubbed: draft → edit → save (checks the POST body), the bot-check message, "already saved", a link handed over from Listings, two-click delete. |

**Conventions**

- Co-locate tests next to the file under test.
- Use React Testing Library: query by role, never by class name or DOM structure.
- Use `userEvent` (not `fireEvent`) for interactions — it simulates the full event chain so Base UI state machines behave correctly.
- When Base UI components do enter/exit animations, wrap the post-action assertion in `waitFor(...)` instead of using fake timers.

## Bugs as tests

Whenever a bug is found in the live app, the fix lands together with a regression test that would have caught it. The current `normalize.test.ts` has explicit tests for the four imobiliare adapter bugs found in the session 3 Playwright audit:

- `pickLargestPriceEur` picks the actual price out of "+ 2000 € Discount … 111.359 €"
- `parseRooms` rejects the wrong half of "1,5 camere"
- `stripTrailingPrice` removes the embedded euro suffix from titles
- `locationFromImobiliareUrl` extracts the neighborhood from the URL slug

If any of these tests goes red, the corresponding adapter behavior regressed.
