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

## Outcome (2026-10-28)

Done in 4c25974. A new `api/src/lib/host.ts` beside `origin.ts` adds an `onRequest` hook,
registered in `server.ts` before brief 01's, that answers 403 `{ error: "requests for other host
names are refused" }` when `Host` is missing, malformed or names anything but `localhost`,
`127.0.0.1` or `[::1]`, and logs the host and URL at `warn`. Only the hostname is compared (port
dropped, lowercased, IPv6 in brackets). `HOST` set to another address adds that hostname (`::1`
style addresses are bracketed to match). `docs/decisions.md` (brief 01's entry), getting-started
(the `HOST` row and a common-problems line), architecture and testing are updated.

What the API sees from the web app: Vite 8.3.5 turns the string shorthand in `web/vite.config.ts`
into `{ target, changeOrigin: true }`, so every proxied request arrives as `Host: 127.0.0.1:<api
port>`, whether the browser opened `localhost` or `127.0.0.1`. Vite also refuses a rebound name on
its own port (`server.allowedHosts`, checked before the proxy), so the API's check matters for
port 3000 straight.

Checked: `host.test.ts`, 11 tests. With `inject()`: `Host: evil.example:3000` gets 403 on a GET and
a POST, a blank Host gets 403, `localhost:3000`, `127.0.0.1:3000` and `[::1]:3000` get 200, and with
`HOST=192.168.1.20` that address gets 200 while evil.example still gets 403. `inject()` always fills
in a missing Host, so one test listens on a throwaway port and sends an HTTP/1.0 request with no
Host over a raw socket: 403. (Node itself answers 400 to an HTTP/1.1 request without Host.) api
133/133, tsc clean. On a throwaway copy with a fresh database (API :3027, Vite :5187 proxying to it,
`WEB_ORIGINS` set): curl with `Host: evil.example` got 403 on a GET and a POST, the three local
names 200, HTTP/1.0 without Host 403, Vite with a rebound name 403; in Chrome opened at
`localhost:5187` the Listings and Saved tabs loaded and a flat typed into the empty form (a
`.invalid` link, so no site was fetched) saved and showed in the table, every request reaching the
API as `127.0.0.1:3027`. A second copy with `HOST=127.0.0.2` answered `127.0.0.2` and `localhost`,
and refused evil.example. The owner's database was not opened.
