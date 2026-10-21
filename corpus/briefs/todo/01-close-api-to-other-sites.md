# Task 01: Close the API to other websites

## Context

`api/src/server.ts:12` registers `@fastify/cors` with `origin: true`, and the API has no sign-in.
Any page open in the owner's browser can `GET /api/saved` (notes included) and the listings, and
`POST` to `/api/saved`, `/api/refresh` and `/api/issues`: from Origin `https://evil.example` the
preflight answered 204 and those requests succeeded (checked on a local copy). Preflights allow GET,
HEAD and POST only, so saved flats cannot be deleted this way. The web app does not need CORS: it
reaches the API through Vite's proxy on its own origin (`web/vite.config.ts:9-11`).

The worst case is the issues route: `api/src/routes/issues.ts:57` writes Markdown into issues/,
which `docs/issues.md` says Claude reads, implements and deletes, and `.gitignore` hides. A hostile
page can plant text that reads like the owner's own feedback, with nothing in git to show where it
came from, and can fill the ten slots so the real Report button gets 409. The "Refuse local
addresses in the scrape endpoint" entry in `docs/decisions.md` accepted cross-origin requests as a
trade-off; this removes the need for it.

Improvement sweep of 2026-10-20 (API correctness and safety lens), vetted against the code; the ranked report is the owner's "Repo improvement sweep" doc.

## Files you OWN

- `api/src/server.ts`
- `api/package.json` (drop `@fastify/cors` if unused)
- `docs/decisions.md` (update that entry)
- api tests

## What to do

1. Remove the CORS plugin.
2. Refuse any request whose `Origin` header is present and is not the app's own (the Vite dev origin), which also blocks form posts that need no preflight.
3. Keep the Vite proxy as the way in.

## Acceptance

- A test: a request with `Origin: https://evil.example` gets 403.
- Requests with no Origin or the app's own work, and the web app works in dev.
