# Owner setup

Everything it takes to put ro-housing on the VPS. Nothing in this repo deploys or writes a
secret. vps-deploy's ro-housing stack was written from [What the vps-deploy stack
needs](#what-the-vps-deploy-stack-needs); keep the two in step. The numbered steps after it are the
owner's, in order. Running it on your own computer is under [Local development](#local-development)
and in [getting-started.md](getting-started.md).

`<production origin>` below means `https://` plus the main domain's host, with no path.

## What the vps-deploy stack needs

The same shape as brief-board's stack: Caddy serves the built web app and forwards the API's
prefix to one container on loopback.

| What | Value |
|---|---|
| Container | Built from `infrastructure/Dockerfile` (build context: the repo root, target `prod`), service `ro-housing-api` in `infrastructure/docker-compose.yml`, image `ro-housing-api:1.0`. The image compiles the API itself (a build stage runs `npm run build`), so no `api/dist/` needs to be shipped; it starts `node dist/server.js` |
| Port | **8809**, published on `127.0.0.1` only. The server listens on `0.0.0.0:8809` inside the container |
| Web app | `cd web && npm ci && npm run build` gives `web/dist/`, built for `/ro-housing/` (`RO_HOUSING_BASE` moves it; leave it unset) |
| Route: the app | `/ro-housing/*` serves `web/dist/`; any path under it that isn't a file answers `/ro-housing/index.html` (the login and account pages are addresses: `/ro-housing/login`, `/ro-housing/account`); `/ro-housing` redirects to `/ro-housing/` |
| Route: the API | `/ro-housing-api/*` goes to `127.0.0.1:8809` with the prefix stripped (Caddy's `handle_path`). Keep the browser's `Host` header (Caddy's default): the API's Host check allows `PUBLIC_ORIGIN`'s host and refuses others |
| Volume | A host data directory bind-mounted at `/data` (`RO_HOUSING_DATA_DIR` in the compose file). It holds `ro-housing.db` (with its `-wal` and `-shm` files: listings, saved flats, accounts, sessions) and `issues/` (the Report button's files). Back up the directory, not the file alone |
| Health check | `GET /api/health` answers `{"ok":true}` with no session: `curl -s http://127.0.0.1:8809/api/health` on the box, or `<production origin>/ro-housing-api/api/health`. The image has its own `HEALTHCHECK` (Node's `fetch`; the slim image has no `wget` or `curl`) |
| Caps | `cpus: 1.0`, `mem_limit: 1g`, `memswap_limit: 1g`, `pids_limit: 256`, `init: true`, `restart: unless-stopped`. Already in the compose file; see [Caps](#caps) |
| Outbound network | HTTPS to the listing sites, to Ward's issuer and to Wicket. Nothing listens but 8809 |
| Schedule | None. Refresh runs only when someone presses the button |
| Database | Starts fresh: the first start creates it and its tables, and the accounts' tables. Nothing to copy or migrate |

### Settings

The deploy writes `infrastructure/.env` (0600, git-ignored), which compose reads both for
interpolation and as the service's `env_file`:

| Variable | Value | Secret |
|---|---|---|
| `PUBLIC_ORIGIN` | `<production origin>` | no |
| `AUTH_TRUSTED_PROXIES` | The range Caddy reaches containers from, as for the other apps on the box | no |
| `WARD_OIDC_ISSUER` | Ward's issuer, as the other apps use it | no |
| `WARD_OIDC_CLIENT_ID` | `ro-housing` | no |
| `WARD_OIDC_CLIENT_KEY` | The private key from step 1 | **yes** |
| `WARD_OIDC_REDIRECT_URI` | `<production origin>/ro-housing-api/auth/ward/callback` (the API refuses to start with any other path) | no |
| `WARD_OIDC_POST_LOGOUT_REDIRECT_URI` | `<production origin>/ro-housing/` | no |
| `RO_HOUSING_DATA_DIR` | The host data directory, for the compose file's volume line | no |
| `RO_HOUSING_PORT` | Optional; `8809` when unset | no |
| `WICKET_URL` | `<production origin>/wicket-api`, the public address: under the box's rootless Docker a container can't reach the host's loopback, so not `127.0.0.1:8808` | no |
| `WICKET_TOKEN` | ro-housing's own token, its pair in Wicket's `WICKET_APP_TOKENS` | **yes** |

`WARD_OIDC_CLIENT_KEY` and `WICKET_TOKEN` are the secrets: kept, like brief-board's, in
vps-deploy's `secrets/ro-housing.env`. Without both Wicket settings the app runs as before, with
no "Fill the gaps" button. ro-housing has no CLI token. The image sets the rest itself, and the
compose file's `environment:` pins them so an `.env` can't move them: `HOST=0.0.0.0`,
`PORT=8809`, `RO_HOUSING_DB=/data/ro-housing.db`, `RO_HOUSING_ISSUES_DIR=/data/issues`,
`CHROMIUM_DISABLE_DEV_SHM=1`, `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`. `WEB_ORIGINS` stays
unset: `PUBLIC_ORIGIN` is always allowed.

### Caps

The box has 3.7 GiB of RAM (about 2.1 GiB free) and 2 vCPUs, shared with mail, Ward, monitoring
and the other apps. Measured on 2026-11-04 on the owner's laptop, no listing site fetched but the
RSS feed:

- the API idle, as built JavaScript (`node dist/server.js`): about 112 MiB in `docker stats`
  (160 MiB resident), 12 tasks; about 119 MiB after a Refresh of the RSS feed. Under `tsx`, the
  same container idled at about 160 MiB in `docker stats` (198 MiB resident for Node plus 15 MiB
  for esbuild's helper process), 24 tasks;
- headless Chromium just launched: about 100 MiB (proportional share, five processes);
- Chromium with one heavy local page open (storia's fixture repeated 200 times): about 190 MiB,
  and the API plus Chromium ran about 90 threads.

A real site's page runs its scripts and loads images, so expect more; the Firecrawl research saw a
Playwright service peak at 385 MiB on one listing page. Hence 1 GiB for the container: roughly the
API, a busy Chromium and headroom, leaving the box about 1 GiB. `cpus: 1.0` leaves the other vCPU
to the rest of the box; a Refresh only runs slower. Refresh runs one site at a time and only
storia's search, and a Saved-tab link a site refuses, open Chromium, so there is one page at a time.

When the cap is hit, the kernel kills the biggest process in the container. If that is a Chromium
process, the scrape in progress fails (that source shows FAIL), the API notices the browser has
gone and launches a fresh one on the next call (`lib/playwright.ts`). If it is the API itself, the
container restarts (`restart: unless-stopped`); the Refresh in progress is lost and SQLite keeps
what was committed. `init: true` reaps Chromium's child processes when one dies.

## 1. Register ro-housing in production Ward

Brief-board was registered the same way; the adoption guide is `shared-library/README.md` in the
wzd_auth repo.

1. Open the console on Ward's own host (`/console`) and sign in as the break-glass superuser.
2. Create an app with slug `ro-housing` and name `ro-housing`, with public registration closed.
3. Make the client's key pair, from Ward's checkout:

   ```
   cd path/to/wzd_auth && npm run oidc-client-key --workspace=api -- ro-housing
   ```

   It prints a private `WARD_OIDC_CLIENT_KEY=...` line and a public JWK. Keep the private line
   for step 2. Never paste it into Ward.
4. On the app's page, under "Sign in with Ward", register a client with the public JWK and:
   - redirect URI: `<production origin>/ro-housing-api/auth/ward/callback`
   - sign-out return URI: `<production origin>/ro-housing/`

## 2. Write the deploy secret

Create `secrets/ro-housing.env` in vps-deploy with these lines, then `chmod 600` it. The second can wait: without it the app runs with no "Fill the gaps":

```
WARD_OIDC_CLIENT_KEY=<the private key from step 1>
WICKET_TOKEN=<ro-housing's token from WICKET_APP_TOKENS in secrets/wicket.env>
```

## 3. Check the container locally

Docker Desktop's WSL integration must be on. From the repo root, with a scratch data directory so
the container doesn't write into your dev database:

```
touch infrastructure/.env
RO_HOUSING_DATA_DIR="$(mktemp -d)" docker compose -f infrastructure/docker-compose.yml up --build -d
curl -s http://127.0.0.1:8809/api/health
```

Expect `{"ok":true}`. `curl -s http://127.0.0.1:8809/api/listings` should answer
`{"error":"unauthorized"}`. To check Chromium inside the container, make an account (step 5's
command against the local container), sign in through a local web build, paste a storia listing
link on Saved and press Fetch details. Stop it with:

```
docker compose -f infrastructure/docker-compose.yml down
```

First built and run on 2026-11-04 under scratch names (health, a seeded sign-in, a Refresh of the
RSS feed, the Saved routes); Chromium wasn't started in it.

## 4. Deploy

Once the vps-deploy stack exists, the same way as brief-board: a dry run first, then the real one,
which builds the web app, ships it, and builds and starts the container. Check:

```
curl -s <production origin>/ro-housing-api/api/health
curl -sI <production origin>/ro-housing/
```

The first prints `{"ok":true}`; the second returns `200`.

## 5. Create your account

There is no sign-up page. Run the seed inside the container on the VPS. It asks for the username
and password and shows neither on screen. The password needs at least 8 characters:

```
docker compose -f infrastructure/docker-compose.yml exec -it ro-housing-api node dist/seed.js
```

To pass them instead, add `-e SEED_USERNAME=<name> -e SEED_PASSWORD=<password>` after `exec`, and
keep the command out of any file. An existing account is left as it is, password included.

After your first sign-in, check that the login lockout sees each visitor's own address:

```
docker compose -f infrastructure/docker-compose.yml logs ro-housing-api | grep -i "X-Forwarded-For ignored"
```

No output is right. If the line shows up, `AUTH_TRUSTED_PROXIES` is missing the range Caddy comes
from.

## 6. Let your Ward account in

In Ward's console, open the `ro-housing` app and grant a role on it to your own Ward account.
Without a grant Ward refuses the sign-in. Every signed-in user can do everything in the app (see
the saved flats and notes, change sources, run Refresh), so grant it to no one else unless they
should.

Link your accounts in this order, or you end up with two users:

1. Sign in at `<production origin>/ro-housing/` with the local account from step 5.
2. Press your name in the header and then "Link Ward".

From then on "Sign in with Ward" on the login page signs you in as that user.

## 7. First use on the fresh database

Sources starts with imobiliare.ro, storia.ro and imobiliare.ro's RSS feed ticked; only the feed has
its URL. Paste a search URL for each site you want, as in [getting-started.md](getting-started.md),
then Refresh. imobiliare.ro's own search answers the VPS with the same 403 as your computer.

## Local development

1. `cp .env.example .env` at the repo root. The defaults need no changes.
2. Make your local account: `cd api && npm run seed`.
3. For "Sign in with Ward" against the local Ward: add this entry to `APPS` in the wzd_auth repo's
   `infrastructure/local/seed.mjs`, then run `node seed.mjs` there. It writes the five
   `WARD_OIDC_*` values into this repo's `.env`.

   ```js
   { slug: "ro-housing", name: "ro-housing", repo: "ro-housing", envFiles: [".env"], dev: "http://127.0.0.1:5173/ro-housing/", api: "/ro-housing-api" },
   ```

4. `cd api && npm run dev` and `cd web && npm run dev`, then open
   <http://127.0.0.1:5173/ro-housing/>.
5. Walk the Ward sign-in once: "Sign in with Ward" on the login page, Ward's page, back signed in;
   then the account dialog's "Link Ward" for a local account. Not done when this was built: Docker
   Desktop, which runs the local Ward, wasn't reachable that day.
