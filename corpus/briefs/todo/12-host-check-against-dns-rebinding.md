# Task 12: Refuse requests whose Host is not this machine

## Context

Brief 01 closed the API to other websites with an `Origin` check
(`api/src/lib/origin.ts`, registered in `api/src/server.ts`). Its outcome left one gap open:
DNS rebinding. A hostile page at `evil.example` can point its own name at 127.0.0.1 after the
page has loaded, then fetch `http://evil.example:3000/api/saved`. To the browser that is a
same-origin request, so it carries no `Origin` header and passes brief 01's hook. The API listens on
127.0.0.1 (`HOST`, default `127.0.0.1`, in `server.ts`), which a rebound name reaches.

What such a request cannot hide is its `Host` header: it says `evil.example:3000`. The app's own
requests say `localhost` or `127.0.0.1`. The owner chose this fix on 2026-10-28.

Check before relying on it: what `Host` the API sees for the web app's own requests. Brief 01's
outcome says Vite's proxy rewrites it (the string shorthand in `web/vite.config.ts` may set
`changeOrigin`); either way the hostname should be `127.0.0.1` or `localhost`. Write what you found
in the outcome.

## Files you OWN

- `api/src/lib/origin.ts` (or a new `api/src/lib/host.ts` beside it, if that reads better)
- `api/src/server.ts` (registering the hook)
- the api tests for these (`origin.test.ts`, or a new `host.test.ts`)
- `docs/decisions.md` (add to brief 01's entry), `docs/` pages that describe the API's checks
- corpus: this brief's outcome, `wiki/status.md`, `log.md`

## What to do

1. Add an `onRequest` hook, registered before the routes like brief 01's, that answers 403 when the
   `Host` header is missing or its hostname is not `localhost`, `127.0.0.1` or `[::1]`. Compare the
   hostname only, not the port, so moving the API or Vite off its port needs no change.
2. If `HOST` is set to something else (an address for the LAN), allow that hostname too, so the
   variable keeps working.
3. Log a refusal at `warn` with the host and the URL, as brief 01's hook does.

## Acceptance

- Tests with `inject()`: `Host: evil.example:3000` gets 403 on a GET and on a POST; a missing Host
  gets 403; `localhost:3000`, `127.0.0.1:3000` and `[::1]:3000` get through; with `HOST` set to
  another address, that address gets through.
- The web app works in dev through Vite's proxy (open the Listings and Saved tabs, save a flat).
- api tests and `tsc` pass.
