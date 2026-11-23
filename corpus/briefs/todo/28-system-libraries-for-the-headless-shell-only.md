# Brief 28: System libraries for the headless shell only

**Depends on:** newspapper's brief 14, which measures the same swap on the
same Playwright (1.60). If it found that `install-deps chromium-headless-shell`
saves less than 50 MB, close this brief with that finding and no change.

## Context

On 2026-11-24 the box's disk was 90% full after the 2026-11-23 rollout, and
Docker held 26 of its 38 GB. vps-deploy keeps each service's previous image for
a rollback, so every megabyte in an app image is paid about twice, and the box
gets no extra storage (vps-deploy's decisions, 2026-11-06).

`ro-housing-api:1.0`'s layers, from `docker history` on the box (2026-11-24):

| Layer | Size |
|---|---|
| `npx playwright install-deps chromium` | 325 MB |
| `COPY /ms-playwright` from `deps` | 277 MB |
| `COPY /app/api/node_modules` from `deps` | 70 MB |
| node:24-bookworm-slim | about 250 MB |

The browser is already trimmed: the `deps` stage deletes the full Chromium, so
`/ms-playwright` holds only `chromium_headless_shell-1223` (260 MB) and ffmpeg.
The system libraries are not: `install-deps chromium` installs what a headed
Chromium needs. Playwright's `install-deps` also takes
`chromium-headless-shell`, whose list may be shorter. Whether it is, and by how
much, is unknown until measured.

## Decisions

- Keep the change only if the layer shrinks by at least 50 MB and a refresh
  gives the same listings. Otherwise `install-deps chromium` stays and the
  outcome records the numbers.
- Playwright's own list stays the source. No hand-written apt line: it drifts
  with every Playwright upgrade and fails as a browser that won't start.

## Files you OWN

- `infrastructure/Dockerfile`

## Files you must NOT touch

- `api/src/lib/playwright.ts` and the scrapers.
- `api/package.json` (its `postinstall` serves local development too) and
  `api/package-lock.json`.

## What to do

1. Read newspapper's brief 14 outcome. If it closes this brief (see Depends
   on), write the outcome and stop.
2. Build today's image and save `docker history`.
3. Replace the line with `npx playwright install-deps chromium-headless-shell`,
   build on the same machine, and record the layer.
4. Run each image with a scratch data folder, back to back, and refresh once.
   Compare the listings per source. A source that fails on both images is not
   this brief's problem; one that fails only on the new image is.
5. Apply the bar from Decisions.

If your session can't build Docker images, make the Dockerfile change, run the
repo's checks, and hand back with steps 2 to 4 for the controller.

## Acceptance

- Either the image uses the shell's list, the layer is at least 50 MB smaller
  and the refresh matches, or the Dockerfile is unchanged and the outcome
  gives the numbers.
- `npm run check` passes.
- The outcome note has both `docker history` readings, taken on one machine.
- If the Dockerfile changed, the deploy is the owner's step:
  `node cli.ts ro-housing deploy` from vps-deploy.
