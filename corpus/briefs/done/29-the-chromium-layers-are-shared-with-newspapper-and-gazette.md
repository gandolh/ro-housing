# Brief 29: The Chromium layers are shared with newspapper and gazette, on a pinned base

**Depends on:** newspapper's brief 16, which checks that the shared prefix below gives one copy of the layers on
the box. Build this one after that check passes, or together with it.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-24 from the estate's infra review. Three repos run Playwright's Chromium in their image: this one,
newspapper and gazette. The same change is filed in each (newspapper's brief 16, gazette's brief 16), with the
same prefix, byte for byte.

## Context

- `ro-housing-api:1.0`'s browser layers, from `docker history` on the box (2026-11-24, brief 28):
  `npx playwright install-deps chromium` 325 MB, `COPY /ms-playwright` from `deps` 277 MB. newspapper builds the
  same two layers from the same Playwright (1.60.0, revision 1223), and gazette from 1.63.0.
- The box stores a layer once only when the image's whole chain up to it is identical. In `prod` (line 59) these
  layers come after `LABEL`, `ENV` and `COPY` lines that differ per repo, so they never match: about 580 MB
  stored twice now, about 1.16 GB once gazette deploys (estimates from the measured layers). The box has 38 GB,
  gets no more, and its Docker data reached 26 GB on 2026-11-23.
- **`deps` downloads the full Chromium and deletes it** (lines 37-39): `npm ci --omit=dev` runs `api/package.json`'s
  `postinstall` (`playwright install chromium`), which fetches the full browser (377 MB on disk) besides the shell,
  then the next line removes it. Every cold build pays that download.
- **The base floats.** `FROM node:24-bookworm-slim` (lines 25, 44, 59) follows whatever the tag is on the build
  day. vps-deploy's weekly housekeeping removes a base tag no image uses after two weeks; the next deploy pulls the
  tag's current image and every cache entry keyed on the old one is dead.
- **No `MALLOC_ARENA_MAX`.** glibc gives each allocating thread its own arena and keeps it. Shelfmark measured it
  on 2026-11-23: 13 searches grew the process by 46 MB with the default, 31 MB with 2.

## The shared prefix

The `prod` stage starts with exactly these lines, in all three repos:

```dockerfile
FROM node:24.22.1-bookworm-slim AS prod
RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx -y playwright@1.60.0 install --with-deps --only-shell chromium \
 && rm -rf /var/lib/apt/lists/* /root/.npm
```

Nothing goes between the `FROM` and that `RUN`: no `LABEL`, `ENV`, `ARG`, `WORKDIR` or `COPY`, since any of
them can change the cache key. Everything app-specific comes after, starting with a comment that names the other
two repos and says the three change together.

## Decisions

- Playwright **1.60.0** is the one version for the three, and `api/` is already on it.
- `deps` downloads no browser at all. Try `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on the `npm ci` first; if the
  `postinstall` still downloads, use `npm ci --omit=dev --ignore-scripts` followed by `npm rebuild better-sqlite3`
  (the only production package with an install script in `api/package-lock.json`). The `rm -rf` of the full
  Chromium goes either way.
- `prod` no longer copies `/ms-playwright` or runs `install-deps`. It keeps `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`
  and `CHROMIUM_DISABLE_DEV_SHM=1`, which the app reads at run time.
- **A build-time check** after `node_modules` lands in `/app/api` launches the shell with the app's own
  Playwright and closes it, for example
  `RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"`. A Playwright bump in `api/` that
  leaves the prefix behind then fails the build, not the first scrape.
- All three `FROM node` lines are `node:24.22.1-bookworm-slim`. `MALLOC_ARENA_MAX=2` joins `prod`'s `ENV` block
  with a comment giving the reason.
- **Builders don't edit the prefix.** If a flag in it fails, stop and hand back: the three repos change together.

## Files you OWN

- `infrastructure/Dockerfile`
- The image notes in `docs/` if they name the browser layers; the closeout: the outcome note, `corpus/log.md`,
  `corpus/wiki/status.md`

## Files you must NOT touch

- `api/package.json` (its `postinstall` serves local development too) and `api/package-lock.json`.
- `api/src/lib/playwright.ts` and the scrapers.
- newspapper and gazette: their own briefs change them.

## What to do

1. Read newspapper's brief 16 outcome for the mechanism check. If it found that the prefix doesn't share, stop
   and hand back.
2. **Check the `deps` change without Docker.** In a scratch copy of `api/` outside the repo, run the `npm ci`
   you chose and confirm `/ms-playwright` (point `PLAYWRIGHT_BROWSERS_PATH` at a scratch folder) stays empty and
   `node -e "require('better-sqlite3')(':memory:')"` works.
3. Edit the Dockerfile as decided.
4. Build today's image and the new one on the laptop; save `docker history` of each. Compare the new image's
   `docker inspect --format '{{json .RootFS.Layers}}'` with newspapper's new image: the base and prefix layers
   match when both are built from the same cache.
5. Run the new image with a scratch data folder, refresh once, and compare the listings per source with today's
   image, as brief 28 describes. A source that fails on both is not this brief's problem.

If your session can't build Docker images, do steps 1 to 3, run the checks, and hand back with steps 4 and 5 for
the controller.

## Acceptance

- [ ] The prefix in the Dockerfile is byte-identical to the block above (`diff` the three lines).
- [ ] Step 2's result is in the outcome; `deps` downloads no browser.
- [ ] The image builds; the build-time launch check runs and passes; `docker history` before and after, from one
      machine, in the outcome; step 4's layer comparison too.
- [ ] Step 5's refresh matches today's image.
- [ ] `npm run check` exits 0; `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_deploy`.

## Owner steps

- `node cli.ts ro-housing server` from vps-deploy, after or with `node cli.ts newspapper server`, so both images
  come from the same build cache.

## Outcome (2026-11-24)

Built. `infrastructure/Dockerfile`: all three `FROM node` lines are `node:24.22.1-bookworm-slim`; `prod` starts with the
shared prefix (the three lines diff identical to newspapper's `prod` stage), then a comment naming the other repos, the
`LABEL`, `ENV PLAYWRIGHT_BROWSERS_PATH`, the app's `node_modules`, and the build-time launch check
(`RUN node -e "require('playwright').chromium.launch().then((b) => b.close())"`), which passes. `prod` no longer copies
`/ms-playwright` or runs `install-deps`. `MALLOC_ARENA_MAX=2` joins the `ENV` block with its reason.

- **Step 2, `deps` downloads no browser.** `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` did NOT stop the `postinstall` (the
  scratch `PLAYWRIGHT_BROWSERS_PATH` filled with `chromium`, the shell and `ffmpeg`), so `deps` uses the fallback:
  `npm ci --omit=dev --ignore-scripts && npm rebuild better-sqlite3`. The scratch folder stayed empty and
  `require('better-sqlite3')(':memory:')` works. The `rm -rf` of the full Chromium is gone.
- **`docker history`, one machine**: before, `install-deps` 318 MB +
  `COPY /ms-playwright` 276 MB + `COPY node_modules` 53.1 MB; after, one prefix layer of 594 MB + `COPY node_modules` 53.1 MB
  + a 186 kB launch-check layer. Whole image 879 MB both ways: the change is sharing, not size. The "before" image was
  built from the working tree, since `git archive` omits the gitignored issues feature the build needs (an open todo).
- **Step 4, sharing.** A throwaway image with newspapper's two prefix lines plus `COPY a.txt` has the same six layers
  (five base, one prefix) as this image, built on this machine from the same cache. Caveat seen on the way: the first
  build of this image reused an older cache record of the prefix (made by newspapper's `--no-cache` check), and a
  throwaway then got a different digest; the builder picks one record, and once rebuilt both gave one digest. So the
  sharing depends on one cache record being in use, which a deploy of newspapper then ro-housing from the same cache gives.
- **Step 5, refresh.** Both images ran on scratch data with `storia` (the browser source) enabled: the same
  `imobiliare-feed` 53 listings and `storia` ok on both (40 on today's image, 41 on the new; the stored listings overlap
  91 of 93 and 94 on the live site's own churn). Chromium launched and scraped in the new image.
- `npm run check` exit 0; `bash corpus/lint.sh` ok. Ships with `node cli.ts ro-housing server`, after or with
  `node cli.ts newspapper server`.
