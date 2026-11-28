# Brief 33: The Report button is hidden on the VPS

**Depends on:** nothing.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-28 from the owner's answer in that day's grill of open questions.

## Context

The Report button writes one Markdown file per report for Claude to read in the repo ([docs/issues.md](../../../docs/issues.md)).
In the container that folder is `/data/issues` on the data volume, so a report made on the VPS stays on the box, where
Claude never reads it, and after 10 of them the button refuses new ones. The open question since 2026-11-04 was what to
do about it. The owner chose to hide the button on the VPS: reports work on a local run only.

Where it is today:

- `api/src/app.ts`, line 68: registers `issuesRoutes` with `issuesDir()`
- `api/src/config.ts`: `issuesDir()`, and `CHROMIUM_DISABLE_DEV_SHM`, the style for an on/off setting (`=== "1"`)
- `api/src/features/issues/`: the routes, the store and their tests
- `web/src/components/ReportIssueButton.tsx`: loads `GET /api/issues` on mount and shows the counter
- `web/src/App.tsx`, line 26: renders the button
- `infrastructure/docker-compose.yml`: the container's environment (`RO_HOUSING_ISSUES_DIR: /data/issues`)

## Decisions

All settled. None of them is open.

- **The owner's call:** the button is hidden on the VPS, not fetched into the repo and not kept as it is.
- **The switch is the server's:** `RO_HOUSING_DISABLE_ISSUES=1` stops `buildApp` from registering the issues routes, so
  `GET /api/issues` and `POST /api/issues` answer 404. The compose file sets it. No build flag in the web app: one image
  and one web build serve both cases.
- **The web app hides the button when `GET /api/issues` answers 404**, and only then. Any other failure keeps today's
  behaviour (the button shows with `—/—`), so a slow or broken API still lets a local run report.
- `RO_HOUSING_ISSUES_DIR` stays in the compose file, unused while the switch is on, so turning the switch off brings the
  old folder back.

## Files you OWN

- `api/src/config.ts`, `api/src/config.test.ts`, `api/src/app.ts`, `api/src/app.test.ts`
- `web/src/components/ReportIssueButton.tsx` and its test (new if none exists), `web/src/App.test.tsx`
- `infrastructure/docker-compose.yml`
- `docs/issues.md`, `corpus/wiki/open-questions.md`, `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- `api/src/features/issues/` beyond what a test needs, any other source file, other repos (vps-deploy's stack text
  still names `issues/` in the backup; it may hold old reports, so it stays).

## Steps

1. `issuesDisabled(env)` in `config.ts`, true when `RO_HOUSING_DISABLE_ISSUES === "1"`, with tests for unset, `1`, `0`
   and `true` (only `1` turns it on, as for `CHROMIUM_DISABLE_DEV_SHM`).
2. `buildApp` skips `issuesRoutes` when it is on. An app test: with it on, both issue routes answer 404; with it off, they
   work as before.
3. The button renders nothing once `GET /api/issues` has answered 404. A test for the 404, one for a 500 (the button stays),
   and one for a normal answer.
4. `RO_HOUSING_DISABLE_ISSUES: "1"` in the compose file's environment, with a one-line comment pointing at docs/issues.md.
5. docs/issues.md says the button is a local-run feature and how the switch works. Close the "Report button on the VPS"
   entry on `corpus/wiki/open-questions.md`.

## Acceptance

- [ ] `npm run check` exits 0.
- [ ] On the dev server with `RO_HOUSING_DISABLE_ISSUES=1`: no Report button, and `curl` on `/api/issues` gives 404.
      Without it: the button, the counter and a submitted report work as before (use a scratch `RO_HOUSING_ISSUES_DIR`).
- [ ] `bash corpus/lint.sh` passes.

## Owner steps

- `node cli.ts ro-housing all` from vps-deploy (the API reads the new setting, the web build hides the button).
- Optional, once: if the box's `/data/issues` holds reports from before, copy them into the repo's `issues/`.

## Owner decisions

- Settled 2026-11-28 (owner): hide the Report button on the VPS. The switch's name, its place in the server and the
  404 rule are the controller's calls.
