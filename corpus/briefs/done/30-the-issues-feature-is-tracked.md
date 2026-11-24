# Brief 30: The issues feature is tracked, so a fresh clone builds

**Depends on:** nothing.

## Context

`.gitignore` line 152, `issues/` ("User-reported issues (consumed by Claude, deleted after fix)"), is not anchored.
It was meant for the repo's top-level `issues/` folder, the owner's feedback channel
([docs/issues.md](../../../docs/issues.md)), but it also matches `api/src/features/issues/`. Five of that folder's six
files are in no commit: `git check-ignore -v` names that rule for `index.ts`, `schema.ts`, `store.ts`, `routes.test.ts`
and `store.test.ts`. Only `routes.ts` is tracked. `api/src/app.ts` imports `./features/issues/index.ts` and registers
`issuesRoutes`.

Today's deploys work because vps-deploy rsyncs the owner's checkout, which has the files. A fresh clone fails to build,
and a vps-deploy rollback, which now rebuilds the old commit from a clone, would fail at its build for this app.
Found 2026-11-24 by vps-deploy's rollback audit (its brief 37, the rsync-versus-git check).

`.dockerignore` line 6, `issues`, is already a root-only pattern (Docker anchors its patterns at the context root, and
the context is the repo), so the image build is not affected.

## Decisions

- Anchor the rule to `/issues/` rather than delete it: the top-level folder still must stay out of git.
- The five files are committed as they are on the owner's disk. Their content is not reviewed or changed here; if a
  test in them fails, report it, do not patch the feature.

## Files you OWN

- `.gitignore`
- `api/src/features/issues/` (only to commit the five untracked files, unchanged)
- `corpus/log.md`, and `docs/issues.md` only if it names the ignore rule

## Files you must NOT touch

- `.dockerignore` (already correct), `infrastructure/`, every other source file.
- Any `.env` file.

## What to do

1. Read the list of ignore rules that match anything tracked or wanted: `git ls-files -ci --exclude-standard` (tracked
   but ignored) and `git status --short --ignored` (ignored on disk). Check no other path besides
   `api/src/features/issues/` is caught by `issues/`, and look at every other unanchored folder rule in `.gitignore`
   the same way (`git check-ignore -v` on the source folders under `api/src` and `web/src`). Report any other
   ignored source file you find; fix them in the same commit only if they are plainly source.
2. Change `issues/` to `/issues/` and keep its comment.
3. `git status` now shows the five files. `git add` them with the `.gitignore` change.
4. Prove a clean clone builds: `git clone` the repo to a scratch folder (inside the session's scratchpad, never inside
   the repo), run `npm ci` in `api/`, then `npx tsc --noEmit -p api` (or the api package's own typecheck script) there.
   The clone's `npm ci` runs `postinstall`, which downloads Chromium (about 300 MB); skip it with
   `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` since the typecheck does not need the browser. Delete the scratch clone after.
5. Log the change in `corpus/log.md`.

## Acceptance

- [ ] `git check-ignore -v api/src/features/issues/index.ts` prints nothing, and `git check-ignore -v issues/x` still
      matches `/issues/`.
- [ ] `git ls-files api/src/features/issues` lists all six files.
- [ ] A fresh clone of the working tree's HEAD typechecks the api package (step 4); the command and its result are in
      the outcome note.
- [ ] `npm run check` passes (it runs the five newly tracked tests too); `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_deploy` (no deploy is needed: the next vps-deploy run behaves the same; the fix only matters
      to a clone).

## Owner steps

None. The next deploy and any rollback now work from a clone.

## Owner decisions

- Settled 2026-11-25 (owner): promote it.
- Mine (technical): anchor the rule instead of removing it; commit the files unchanged; verify with a scratch clone's
  typecheck rather than a Docker build.

## Outcome (2026-11-25)

`.gitignore` now ignores `/issues/` (comment kept), and the five untracked files of `api/src/features/issues/` are
committed unchanged (six tracked). No other ignored source file turned up: the ignored paths on disk are `.env`,
build output, `node_modules` and `test-results/`. `git check-ignore -v api/src/features/issues/index.ts` prints
nothing; `issues/x` still matches `/issues/`. Fresh clone of HEAD: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci` in
`api/`, then `npx tsc -p tsconfig.json --noEmit` there, exit 0. `npm run check` passed (it runs the five newly tracked
tests); `bash corpus/lint.sh` passed. No deploy needed.
