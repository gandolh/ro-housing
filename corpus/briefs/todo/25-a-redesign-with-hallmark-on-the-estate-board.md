# Task 25: A redesign with Hallmark, on the estate board

**Depends on:**

- In ro-housing: brief 23, which leaves the app on Base UI 1.9.0, Tailwind with one token set, and the Light / Dark / System switch.
- In the owner's skills library:
  - brief 24, which vendors Hallmark as the design skill and adopts taste-skill 2.5's ideas (palettes and type dealt by trade, and its copy layer);
  - the estate redesign board: one artifact with a page per app, owned by the skills library.
- The owner's grilling of 2026-11-10, Q39: no bake-off; Hallmark redesigns every web UI, and the owner approves each app on the board before any code changes.

**Runs after:** 21, 22, 23 and 24. Brief 24 touches no UI, so it may run before or after this one.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

ro-housing is a personal tool that lists flats for sale in Timișoara from nine sites and one feed, and keeps a shortlist of apartments the owner has checked by hand.

### The screens (read 2026-11-10)

| Screen | Address | Rendered by |
|---|---|---|
| Sign-in | `/ro-housing/login` | `web/src/LoginPage.tsx` (137 lines), behind `web/src/AuthGate.tsx` |
| Listings tab | `/ro-housing/` | `web/src/pages/ListingsPage.tsx` (206 lines), `web/src/components/ListingsTable.tsx`, `PriceHistory.tsx` |
| Saved tab | the same page, second tab | `web/src/pages/SavedPage.tsx` (533 lines), `SavedTable.tsx`, `ApartmentForm.tsx`, `FillGaps.tsx` |
| Edit saved apartment | a dialog over Saved | `web/src/pages/SavedPage.tsx:498` |
| Sources tab | the same page, third tab | `web/src/pages/SourcesPage.tsx` (230 lines) |
| Account | `/ro-housing/account`, a dialog | `web/src/components/AccountButton.tsx` |
| Report an issue | a dialog | `web/src/components/ReportIssueButton.tsx` |
| Header, tabs and footer | every screen | `web/src/App.tsx` |

The tabs are not addresses (`web/src/route.ts`); only `login` and `account` are.

### What the design docs fix today

- [docs/design.md](../../../docs/design.md) sets the direction: **terminal-retro, monospace, sharp 90 degree corners, one-pixel ink borders, paper-white ground, one muted accent (burnt ochre), no shadows on standard elements.** Its anti-goals forbid rounded corners, gradient text, glassmorphism and a second accent. The colour table, the 13 px type scale and the 18 px row rhythm are in the same file.
- [docs/decisions.md](../../../docs/decisions.md) holds look-affecting calls: no bare-element rules outside `@layer base`; tabs stay mounted (`keepMounted`); the "from page", "edited" and "not on page" marks on the Saved form; the "+TVA" marker beside a price. Those are behaviour the redesign keeps.
- Brief 23 recorded the theme switch (Q18) and the dark tokens.

A proposal stays inside those decisions unless the owner reopens one on the board.

## Owner decisions (defaults)

1. **The retro direction is kept as the starting point.** Hallmark proposes inside it (type, spacing, the accent, density, the empty and error states). If it argues for leaving it, that is a board question, not a build.
2. **No invented facts.** Copy comes from the app's own words and data. No made-up listings, prices or counts in the proposal.

## Files you OWN

- Proposals and screenshots, kept outside git (the board holds them).
- After approval: `web/src/styles.css` (the tokens), `web/src/components/**`, `web/src/pages/**`, `web/src/LoginPage.tsx`, `web/src/App.tsx` and their tests.
- `docs/design.md` (updated to the approved design), `docs/decisions.md`, `corpus/wiki/status.md`, `corpus/log.md`.

## Files you must NOT touch

- `api/`, `web/package.json`, and behaviour: what each control does, the `keepMounted` tabs, the Saved form's marks, the "+TVA" marker.
- Anything before the owner's approval is recorded.

## What to do

1. **Screenshots** of every screen in the table at 1280 and 390 px, in both themes, kept out of git. The seeded local data from `docs/getting-started.md` serves; never a real account.
2. **A proposal per screen** with Hallmark, taking taste-skill 2.5's trade palettes and copy layer where they help (a housing tool for one buyer, so a calm, dense, scannable direction). One page of notes per screen: what changes, why, what stays.
3. **Put it on ro-housing's page of the board**, beside today's screenshots, at 1280 and 390 px.
4. **Wait for the owner's approval there.** Record it in `corpus/log.md` with the date. Nothing below starts before that.
5. **Build a token change first.** Colours, type, spacing and radii in `@theme` and the dark block, one commit. Then **one screen per commit**: sign-in, Listings, Saved, the Edit dialog, Sources, Account and Report, header and footer. After each commit, `npm run check` passes.
6. **Update `docs/design.md`** to the approved design, replacing the retro rules it no longer follows.

## Acceptance

- [ ] The owner's approval on the board is recorded in `corpus/log.md` with its date.
- [ ] Hallmark's "Floor" checks run as commands or tests, in both themes, on every screen:
  - the contrast test from brief 23 passes for every text and surface token pair, 4.5:1 for body text and 3:1 for large text;
  - a visible focus ring on every control (a test that tabs through each screen and checks the computed outline);
  - a `prefers-reduced-motion` path (a test that emulates it and finds no running transition);
  - no invented facts or numbers (a grep of the new copy against the approved proposal, and no hard-coded sample data under `web/src`);
  - no horizontal scroll at 390 px (a check that `document.documentElement.scrollWidth` is at most 390 on every screen).
- [ ] The theme switch still works: Light, Dark and System, light on a first visit (brief 23's tests pass).
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 23's wrappers, tokens and theme module are what this brief changes. It adds no new Base UI behaviour.
- `docs/design.md` is rewritten here, so brief 22's `.claude/rules/web.md` points at it by name only.
