# ro-housing

A house-hunting tool for one person looking to buy a flat in Timișoara. It pulls apartments for sale from imobiliare.ro, storia.ro and seven local agency sites into one table, lists new Timișoara flats from imobiliare.ro's RSS feed, and keeps a shortlist of the flats you want to compare.

<p align="center">
  <img src="docs/images/hero.webp" width="100%" alt="The Listings tab: eleven made-up apartments from storia, imobiliare, foxfort and three other sources in one table, with rooms, m², price, €/m², area, how many days ago each was first seen, a small line of its price over time, and a save action on every row">
</p>

**Status:** Personal project, being moved to the owner's VPS, behind sign-in; until then it runs on your own computer. The repo has the container and the setup notes, and it is not deployed yet. Of the nine search scrapers, only imobiliare.ro's has been checked against the live site, and since 2026-10-16 imobiliare.ro has answered the app with a bot check. Reading single listings works on storia.ro and the three agency sites tried.

## What it does

- Collects listings from up to nine sites into one table you can sort by price, m² or date and filter by site, with €/m² worked out for every row. A price quoted before VAT ("+ TVA") is marked as such, so €/m² compares like with like.
- Lists new Timișoara flats for sale from imobiliare.ro's public RSS feed, with the title and the link only, since imobiliare.ro answers the app's own requests with a bot check. Each link opens in your browser.
- Says so when a site's Refresh finds no listings at all, which usually means its page changed, instead of dimming all its listings as gone.
- Keeps each listing's price history, one point per Refresh, drawn as a small line beside it.
- Saves one listing from its link. The app reads price, rooms, m², floor, year built, area, partitioning and photo from the page into a form. Each field says "from page", "edited" or "not on page", and nothing is stored until you press Save. When a site shows a bot check instead of the ad, the form opens empty with the link kept.
- Lines up the saved flats with your notes, sorted by price, €/m², m² or year built. You can edit any of them later. Deleting one takes two clicks.
- Asks you to sign in: with a local account the owner makes with a script, or with "Sign in with Ward", the account service the owner's other apps share. There is no sign-up page.

Each listing site shows only its own ads, and a spreadsheet means copying every field by hand. This tool covers one city, one buyer and flats for sale only. It does not merge a flat listed on two sites, refresh on a schedule, or store photos, only links to them.

## Screenshots

| The shortlist, cheapest €/m² first | One search URL per site, with imobiliare.ro's last run failed |
|---|---|
| ![The Saved tab: an empty box for a listing link with a Fetch details button, then five made-up apartments sorted by €/m², each with its site, partitioning, a note, price, €/m², m², rooms, floor such as 3/4 or P/2, year built, area, and Edit and Delete](docs/images/saved.webp) | ![The Sources tab: nine sites, each with a tick box, its search-results URL and when it last ran; imobiliare.ro shows a red mark and "failed", the others ran a minute ago or never](docs/images/sources.webp) |

| A pasted link read into a draft | A site that answers with a bot check |
|---|---|
| <img src="docs/images/draft-phone.webp" width="300" alt="The draft form in a narrow window: 8 of 10 fields read from exemplu.ro; the price is marked edited, rooms, m², floor, top floor, year built and area are marked from page, partitioning and photo link not on page; €/m² is worked out as 1.764 and a note is typed in"> | <img src="docs/images/blocked-phone.webp" width="300" alt="A red notice under an imobiliare.ro link: the site answered with a bot check instead of the listing, nothing was read, fill in what you know and the link is saved with it; below it, the empty form"> |

The screens show made-up listings and apartments from [demo-seed.mjs](docs/images/demo-seed.mjs). The draft is a staged answer for `exemplu.ro`, a site that does not exist. The bot check is imobiliare.ro's real answer on 2026-10-16. How each image was made: [docs/images/shots.md](docs/images/shots.md).

## How it works

Two npm packages. `api/` is a Fastify server on SQLite. For Refresh it runs one scraper per site in turn: cheerio on plain HTML, or a headless Chromium driven by Playwright when a site needs a real browser. For a single link it fetches the page, tries the browser if the plain request is refused, and reads the fields with one site-independent extractor: storia's embedded JSON, then a price in the page's JSON-LD, then Romanian label/value pairs such as "Nr. camere: 3", then the page's Open Graph tags, then phrases like "etajul 3 din 4". `web/` is a React app built with Vite, Tailwind and Base UI, served at `/ro-housing/`; it reaches the API at `/ro-housing-api`, through Vite's proxy in development and Caddy on the VPS. Sign-in comes from ward-auth, a small library vendored into `api/vendor/ward` and `web/vendor/ward`. On the VPS the API runs in one container with Playwright's Chromium, capped at one CPU and 1 GiB of memory.

```mermaid
flowchart LR
  web["web/<br/>React + Vite"] -- "/ro-housing-api/*" --> api["api/<br/>Fastify + sign-in"]
  api --> db[("SQLite<br/>data/ro-housing.db")]
  api -- "Refresh: one scraper per site" --> sites["listing sites"]
  api -- "Fetch details: one listing page" --> sites
```

More in [docs/architecture.md](docs/architecture.md), and how each scraper reads its site in [docs/adapters.md](docs/adapters.md). Self-hosted Firecrawl with a local model was tried on 2026-10-28 and left out: it needs five containers and 2 to 3 GiB of RAM before a model is loaded. What it would take on a bigger machine: [docs/research-firecrawl-ollama.md](docs/research-firecrawl-ollama.md#firecrawl-on-a-bigger-machine).

## Run it locally

Requires Node 24 and npm. Make your account once, then use two terminals:

```bash
cd api && npm install && npm run seed   # asks for a username and password. The install also downloads Chromium
cd api && npm run dev                   # API on http://127.0.0.1:3000
cd web && npm install && npm run dev    # web app on http://127.0.0.1:5173/ro-housing/
```

Open <http://127.0.0.1:5173/ro-housing/> and sign in. In **Sources**, tick a site, paste a search-results URL from it and press Save, then press Refresh on **Listings**. In **Saved**, paste one listing's link and press Fetch details. The API creates its database, `data/ro-housing.db`, on the first start. Settings, tests and known problems: [docs/getting-started.md](docs/getting-started.md).

## Project layout

| Path | What lives there |
|---|---|
| `api/` | Fastify server: the database, sign-in, the nine search scrapers and the RSS feed reader, the single-listing reader, the routes, the seed script |
| `web/` | React app: the Listings, Saved and Sources tabs, and the shared UI components |
| `data/` | The SQLite file, created on first start, not in git |
| `infrastructure/` | The container: `Dockerfile` and `docker-compose.yml` for the VPS |
| `docs/` | Setup, architecture, the scrapers, decisions, the worklog and the images here |

## Docs

- [docs/](docs/README.md): setup, what the app is and isn't, how it's built, the scrapers, the design system, tests, decisions and the session-by-session worklog
- [docs/owner-setup.md](docs/owner-setup.md): putting it on the VPS (port, settings, routes, volume, caps) and the owner's steps

## License

No license yet; all rights reserved.
