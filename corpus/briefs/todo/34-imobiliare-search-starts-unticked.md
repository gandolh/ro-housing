# Brief 34: imobiliare.ro's search starts unticked on a fresh database

**Depends on:** nothing.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-28 from that day's grill of open questions, as a technical call.

## Context

A new database ticks three sources: `DEFAULT_ENABLED` in `api/src/db/index.ts`, line 22, holds `imobiliare`, `storia`
and `imobiliare-feed`. imobiliare.ro's search page has answered 403 since 2026-10-16, so every Refresh on a fresh
database sends it one request that fails. The RSS feed (`imobiliare-feed`) is what works for imobiliare now. The
2026-11-04 build left the default as it was and listed it as an open question.

## Decisions

All settled. None of them is open.

- **`imobiliare` leaves `DEFAULT_ENABLED`.** A fresh database starts with `storia` and `imobiliare-feed` ticked.
- **Existing databases don't change.** The seed is `INSERT OR IGNORE`, so a row already there keeps its tick box. The
  `user_version < 1` migration below it applies `DEFAULT_ENABLED` to untouched rows of very old databases; it reads the
  same set, so it stops ticking `imobiliare` too, which is right for the same reason.
- The adapter stays registered and can be ticked on Sources, in case the site lets plain requests through again.

## Files you OWN

- `api/src/db/index.ts`, a test beside it (new: `api/src/db/defaults.test.ts` or the existing db tests)
- `corpus/wiki/open-questions.md`, `corpus/wiki/status.md`, `corpus/log.md`, and the docs page that lists the default
  sources, if one does

## Files you must NOT touch

- The adapters, the Sources page, any other source file, other repos.

## Steps

1. Drop `imobiliare` from `DEFAULT_ENABLED`.
2. A test on a `:memory:` database: `storia` and `imobiliare-feed` start ticked, `imobiliare` starts unticked, and a row
   that already exists keeps its tick box after the seed runs again.
3. Close the "imobiliare.ro's search on a fresh database" entry on `corpus/wiki/open-questions.md`, and fix any doc that
   lists the defaults.

## Acceptance

- [ ] `npm run check` exits 0.
- [ ] `bash corpus/lint.sh` passes.

## Owner steps

- None needed: a deployed database already exists, so nothing changes on the VPS. It ships with the next
  `node cli.ts ro-housing server`.

## Owner decisions

- None. The default is the controller's call (2026-11-28), since the site refuses the search.
