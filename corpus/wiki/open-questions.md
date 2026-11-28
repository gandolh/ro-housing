---
summary: Two calls left from the 2026-11-04 build run, each now a brief (2026-11-28 grill): the Report button hidden on the VPS (33) and imobiliare.ro's search unticked on a fresh database (34). The shared-origin sessions, the scrape endpoint's hops and the container checks were closed the same day.
updated: 2026-11-28
---

# Open questions

Each came up while building briefs 13 to 17 and 19 on 2026-11-04. The run took the conservative option
and went on; nothing here blocks anything.

## The Report button on the VPS

The button writes a Markdown file per report into `issues/`, which Claude reads in the repo
([docs/issues.md](../../docs/issues.md)). In the container that folder is `/data/issues`, on the
data volume, so reports made on the VPS sit on the box, not in the repo.

- **Taken:** keep the button and keep the files on the volume, so none is lost.
- **Answered 2026-11-28 (owner):** hide the button on the VPS. Built by
  [brief 33](../briefs/todo/33-the-report-button-is-hidden-on-the-vps.md), which deletes this entry.

## imobiliare.ro's search on a fresh database

A new database starts with imobiliare.ro's search ticked, as before, though it has answered 403
since 2026-10-16, so each Refresh sends it one request that fails. The RSS feed source, ticked too,
is what works for imobiliare now.

- **Taken:** left as it was; the owner can untick it on Sources.
- **Settled 2026-11-28 (controller's call):** a fresh database starts with it unticked. Built by
  [brief 34](../briefs/todo/34-imobiliare-search-starts-unticked.md), which deletes this entry.

## Closed 2026-11-28

- **Sessions that write, on a shared origin:** kept as built (controller's call). A CSRF token would not stop a
  script on the same origin, which can read the token as well; only a host of its own would, and the estate's other
  apps accept the shared origin.
- **The scrape endpoint on a server:** already built on 2026-11-06. Every fetch follows redirects by hand and checks
  each hop at connect time, and Chromium refuses local addresses ([docs/decisions.md](../../docs/decisions.md),
  "Every hop of a fetch is checked").
- **What the built container was not asked to do:** nothing to decide; the first deploys showed no gap.
