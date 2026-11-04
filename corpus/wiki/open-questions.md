---
summary: Calls the 2026-11-04 build run made without asking, each with the conservative option it took, for the owner to confirm or change. Report-button files on the VPS, sessions that write on a shared origin, the scrape endpoint's redirects from a server, imobiliare's search ticked on a fresh database, and the container checks brief 19 left out.
updated: 2026-11-04
---

# Open questions

Each came up while building briefs 13 to 17 and 19 on 2026-11-04. The run took the conservative option
and went on; nothing here blocks anything.

## The Report button on the VPS

The button writes a Markdown file per report into `issues/`, which Claude reads in the repo
([docs/issues.md](../../docs/issues.md)). In the container that folder is `/data/issues`, on the
data volume, so reports made on the VPS sit on the box, not in the repo.

- **Taken:** keep the button and keep the files on the volume, so none is lost.
- **To decide:** whether to fetch them into the repo by hand, hide the button on the VPS, or turn
  reports into something else.

## Sessions that write, on a shared origin

brief-board makes a browser session read-only, because the estate's apps share one origin and a
script in another app could send its cookie. ro-housing has no other client, so a session must
write (Save, Sources, Refresh).

- **Taken:** sessions write, as in the other apps with a browser UI; the Origin check still refuses
  other websites, and the cookie is scoped to `/ro-housing-api`.
- **To decide:** whether that is enough, or ro-housing wants a CSRF token or its own host.

## The scrape endpoint on a server

"Refuse local addresses in the scrape endpoint" ([docs/decisions.md](../../docs/decisions.md))
checks only the first hop: redirects are followed unchecked, and the Chromium fallback loads
whatever the page asks for. "Enough for a localhost tool." On the VPS a signed-in user could paste
a link that redirects to an address inside the box's network.

- **Taken:** nothing changed; only signed-in users reach the endpoint, and they are the owner and
  whoever the owner grants in Ward.
- **To decide:** whether to check every redirect hop (and block private addresses in Chromium)
  before anyone else gets access.

## imobiliare.ro's search on a fresh database

A new database starts with imobiliare.ro's search ticked, as before, though it has answered 403
since 2026-10-16, so each Refresh sends it one request that fails. The RSS feed source, ticked too,
is what works for imobiliare now.

- **Taken:** left as it was; the owner can untick it on Sources.
- **To decide:** whether a fresh database should start with it unticked.

## What the built container was not asked to do

Brief 19 checked the built image with one outbound request, a Refresh of the RSS feed (cheerio in
XML mode). It didn't run a search adapter for an agency site, didn't read a live listing page on
Saved (the scrape route was checked on a saved link, a name that doesn't resolve and a local
address), and didn't start Chromium.

- **Taken:** those code paths are the same TypeScript the 162 tests run, compiled by tsc; the
  server loads its modules at start (there are no dynamic imports) and the seed ran, so a missing
  file would have stopped one of them.
- **To decide:** nothing, unless the first deploy shows otherwise; owner-setup step 3 (Fetch details
  on a storia link) covers a live page and Chromium.
