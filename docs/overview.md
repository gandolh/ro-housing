# Overview

## What this is

A personal-use, local-only tool that aggregates apartment-for-sale listings from several Romanian real-estate sites into a single UI, scoped to **Timișoara** and **buy-only**. The user pastes a search-results URL from each site they want to monitor, clicks Refresh, and sees a unified, sortable list with price / rooms / m² / location / a link back to the original.

## Who it's for

One user: the author. Single-user, no auth, runs on `localhost`. No deployment story.

## Job-to-be-done

Replace the manual ritual of opening 6–8 tabs and comparing listings across sites. The unified view exists so the user can sort all listings together by €/m², spot the same apartment across multiple sites at different prices, and watch prices drift over time on individual listings.

## In scope (v1)

- 8 site adapters: imobiliare.ro, storia.ro, foxfort.ro, blitz.ro, hitchmosher.ro, agentie-imobiliare-timisoara.ro, apostuestate.ro, primum.ro, districtestate.ro. All implemented; only imobiliare + storia enabled by default. The rest are toggled on from the UI when the user adds a search URL for them.
- Core fields: price, rooms, m², location, source link.
- Per-listing price history that accumulates one data point per manual refresh.
- On-demand refresh from the UI. No scheduler, no background jobs.
- **Saved apartments** (session 5): paste one listing's link, the app reads what it can from the page into a draft, the user confirms or edits every field, and the apartment is saved to a shortlist table for comparing. Works with any site; reads storia.ro and the agency sites well, and falls back to typing by hand when a site shows a bot check (imobiliare.ro, as of 2026-10-16). Same shape as shelfmark's scan-a-book flow: the page is a draft, nothing is saved without the user.

## Out of scope

- Rent listings, cities other than Timișoara, multi-user, auth, hosting.
- Deduplication across sites. Same apartment on imobiliare + on the agency's own site shows up twice with different source badges — that's a feature, not a bug (lets the user compare).
- Image storage. Source links carry the photos; we don't pull them. A saved apartment keeps the link to the page's main photo and shows it as a thumbnail, so the thumbnail breaks if the listing is taken down.
- Map view / geocoding. Location is a free-form neighborhood string.
- Background refresh, alerting, email notifications.

## Acknowledged risks

- **Scraping is brittle.** Each adapter will break when its site changes markup. Failures are silent at the source level — other sources keep working, the UI shows what succeeded. Fix the adapter when its column goes empty.
- **ToS gray area.** The sites don't want to be scraped. Personal-volume use (a handful of requests per manual refresh click) is unlikely to cause friction, but the user has accepted the risk.
- **Anti-bot.** storia.ro requires a real browser (Playwright). The other 7 should work with plain HTTP + cheerio at the volumes involved, but expect occasional 403s from any of them. As of 2026-10-16 this flipped: storia.ro answered plain fetch, and imobiliare.ro blocked both plain fetch (Cloudflare) and headless Chromium (DataDome CAPTCHA). The app never tries to get past a CAPTCHA.
