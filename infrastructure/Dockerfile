# ro-housing's API: Fastify on SQLite, the scrapers, and Playwright's headless
# Chromium (storia's search page and the Saved tab's fallback need a browser).
#
# Build context is the REPO ROOT; only api/ goes into the image. The web app is
# a static site that vps-deploy builds and Caddy serves at /ro-housing/; it is
# not in this image.
#
#   docker compose -f infrastructure/docker-compose.yml up --build -d ro-housing-api
#
# Debian, not Alpine: Playwright's Chromium needs glibc. The API runs as built
# JavaScript (`node dist/server.js`), compiled in the build stage: no TypeScript
# and no tsx at run time, which keeps the idle process smaller.
#
# ── Why this container runs as root ──────────────────────────────────────────
# On the VPS it runs under a ROOTLESS Docker daemon owned by an unprivileged
# account, where the container's uid 0 maps to that account on the host. /data
# is a bind mount of the host's data directory; under rootless Docker only
# container-root maps back to the owning account, so a non-root user in here
# could not write the database. Playwright already launches Chromium without
# its sandbox, which a root user needs.

# ---------------------------------------------------------------------------
# deps: the API's runtime dependencies, and Playwright's Chromium
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS deps
# better-sqlite3 downloads a prebuilt binary for linux-x64; the toolchain is
# the fallback when that download fails.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app/api
COPY api/package.json api/package-lock.json api/.npmrc ./
# --omit=dev leaves out TypeScript, tsx and the test runner. The postinstall
# downloads Chromium into /ms-playwright. A headless launch only uses the
# headless shell, so the full browser (about 390 MB) goes.
RUN npm ci --omit=dev \
 && npm cache clean --force \
 && rm -rf /ms-playwright/chromium-[0-9]*

# ---------------------------------------------------------------------------
# build: the API's TypeScript compiled to dist/ (npm run build)
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app/api
COPY api/package.json api/package-lock.json api/.npmrc ./
# --ignore-scripts: tsc needs only the type packages, so no Chromium download
# and no native build here.
RUN npm ci --ignore-scripts
COPY api/tsconfig.json api/tsconfig.build.json ./
# The vendored ward-auth library's types: src/ imports it by relative path.
COPY api/vendor ./vendor
COPY api/src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# prod: Node, Chromium's system libraries, the built API
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS prod
LABEL org.opencontainers.image.title="ro-housing" \
      org.opencontainers.image.description="ro-housing API: listings from nine sites and a feed, a shortlist, sign-in"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app/api
COPY --from=deps /ms-playwright /ms-playwright
COPY --from=deps /app/api/node_modules ./node_modules
# package.json's "type": "module" makes dist/*.js load as ES modules.
COPY api/package.json ./
# Chromium's libraries and fonts, from Playwright's own list for this version.
RUN npx playwright install-deps chromium \
 && rm -rf /var/lib/apt/lists/*
# The vendored ward-auth library: dist/ imports it by relative path, as
# ../vendor/ward/ward-auth.js.
COPY api/vendor ./vendor
# The compiled API, with db/schema.sql beside db/index.js (the build copies it).
# No TypeScript source and no tests.
COPY --from=build /app/api/dist ./dist
# CHROMIUM_DISABLE_DEV_SHM: Docker's /dev/shm is 64 MB; Chromium uses /tmp
# instead (lib/playwright.ts).
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8809 \
    RO_HOUSING_DB=/data/ro-housing.db \
    RO_HOUSING_ISSUES_DIR=/data/issues \
    CHROMIUM_DISABLE_DEV_SHM=1
# The database (listings, saved flats, accounts, sessions) and the Report
# button's files. A bind mount on the VPS, so it survives every deploy.
VOLUME /data
EXPOSE 8809
# No wget or curl in the slim image; Node's fetch does it. Shell form, so it
# follows the runtime PORT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# node itself, not `npm start`: npm would stay running above it as one more
# process with its own memory.
CMD ["node", "dist/server.js"]
