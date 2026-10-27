# Log

## [2026-10-21] todo | Briefs 01-10 filed from the 2026-10-20 improvement sweep

The corpus starts here, small (see [CLAUDE.md](CLAUDE.md)), to hold the briefs the owner asked for:
every Now and Next item of the 2026-10-20 sweep. Two finders read the API and the web app; every
item was re-read against the code and the price parsers were run on real input. No listing site
was fetched, and no brief suggests getting past a site's bot check ("Blocked means blocked" in
docs/decisions.md). Checks: tsc clean in both packages, tests 88/88 (api) and 40/40 (web).
16 raw findings, none dropped, filed as 10 briefs. Listed in [wiki/status.md](wiki/status.md).

## [2026-10-27] done | Brief 01: Close the API to other websites

CORS is removed and a hook in `api/src/lib/origin.ts` answers 403 to any request whose `Origin`
names another site; the app's own origins (Vite on 5173, as `127.0.0.1` or `localhost`) and
requests with no `Origin` pass. `WEB_ORIGINS` overrides the list. Code d58329c. Checks: api 97/97,
tsc clean; on a throwaway copy evil.example got 403 direct and through the Vite proxy, and the app's
own writes from Chrome got 200. Decision recorded in docs/decisions.md.

## [2026-10-27] done | Brief 02: Adapters read the price, not the numbers before it

One shared `extractPriceEur()` in `normalize.ts` replaces the eight adapters' loose regex: a price
token starting at a fresh number, 5,000-5,000,000 €, not €/m², not the "Preț vechi" amount, first
one wins. "Etaj 2 89.000 €" now gives 89000 and "Strada Aradului 12 299 000 €" 299000. Open calls
settled and pinned in tests: a range gives its upper end; a space-grouped price over 1,000,000 €
loses its millions. Code fd14226. Checks: api 104/104, tsc clean, grep on the adapters.
