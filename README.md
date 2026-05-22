# ro-housing

Personal, local-only aggregator for "apartamente de vânzare Timișoara" across imobiliare.ro, storia.ro, and several local agency sites. Paste a search URL per site, click Refresh, see everything in one table.

See [docs/overview.md](docs/overview.md) for what this is and isn't, [docs/architecture.md](docs/architecture.md) for how it's built, [docs/adapters.md](docs/adapters.md) for the scraper contract.

## Running

Two terminals.

**Terminal 1 — API**

```sh
cd api
npm install            # also runs `playwright install chromium` post-install
npm run dev            # Fastify on http://127.0.0.1:3000
```

**Terminal 2 — Web**

```sh
cd web
npm install
npm run dev            # Vite on http://127.0.0.1:5173
```

Open http://127.0.0.1:5173. Go to **Sources**, enable the sites you want, paste a search-results URL for each (e.g. `https://www.imobiliare.ro/vanzare-apartamente/timisoara`), switch back to **Listings**, click Refresh.

By default `imobiliare` and `storia` are enabled; the six agency adapters are disabled until you turn them on.

The SQLite database lives at `data/ro-housing.db` and is created on first boot.
