Trimmed copies of real listing pages, fetched 2026-10-16, cut down to the
blocks the extractor reads. Agent names, phone numbers, seller IDs and
session tokens were removed by hand; image URLs are placeholders. When a site
changes markup, refresh its fixture the same way: keep the structure, drop
the people.

`hitchmosher.html` is the exception: built by hand on 2026-11-04 from the
shapes the Firecrawl and Ollama research recorded on a real hitchmosher.ro
listing (docs/research-firecrawl-ollama.md, "What the extractor got wrong on
the unseen page"): the price in JSON-LD offers and on a bare line under the
title, "Pretul de vanzare este" in the prose, "zona Lidia" ending a line, "imobil
cu 4 niveluri". No listing page could be found without a browser that day (no
sitemap; the home and search pages carry no listing links in their HTML), so
none was fetched.
