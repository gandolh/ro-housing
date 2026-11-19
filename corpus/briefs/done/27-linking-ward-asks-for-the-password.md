# Brief 27: Linking Ward asks for the password

**Depends on:** Ward's library at the version that adds the look-alike username check (2026-11-19; the dispatch prompt names the wzd_auth commit to vendor from).

**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-19 by the controller. The owner's rule of 2026-11-17: an app links or unlinks a Ward account only after the local password is typed again. Ward's library carries the rule from 1.0.0; this app gets it when it vendors the new copy. The same update refuses a new or changed local username that looks like an existing one (Unicode's confusable skeleton: `AIice` against `alice`, `b0b` against `bob`).

## Context

This app vendors ward-auth 0.7.0 in `api/vendor/ward` and `web/vendor/ward`. Its code calls the link at: `web/src/components/AccountButton.tsx:75` (link).

What the update changes here:

- `POST /ward/link` takes `{ currentPassword }`: 400 `invalid_request` without it, 401 `invalid_credentials` when it is wrong, 429 `too_many_attempts` with `retryAfterSeconds` under the change-password budget.
- The browser calls take the password: `link(currentPassword)` / `startWardLink(currentPassword)`. The old call shape no longer compiles, so the typecheck finds every call site.
- A link start is held in the server's memory for ten minutes; one still waiting for Ward when the server restarts lands as `?ward_error=invalid_callback` (the words for it exist).
- The username key: a migration at start adds a key column and fills it. Two existing accounts with the same key are both kept and logged once. Nothing to do by hand.

## Decisions

- **Both copies in one commit.** The new server copy refuses a link or unlink from an old web copy (400); an old server ignores the new field.
- **The password field sits with its control:** next to the Link control. Labelled as the app labels its other password fields ("Current password" or the app's language), `type="password"`, `autocomplete="current-password"`. A refusal stays on the page: `invalid_credentials` and `too_many_attempts` (with the wait) show beside the field, which keeps focus.

## Files you OWN

- `api/vendor/ward/` and `web/vendor/ward/`: generated, written only by Ward's vendor script.
- The settings code named above, the server's auth plugin options, and their tests.
- Corpus: `corpus/wiki/status.md`, `corpus/log.md`, the wiki page that describes sign-in.

## Files you must NOT touch

- The wzd_auth repo: read only (its vendor script writes only into this repo). Other features.

## What to do

1. Vendor both copies from the wzd_auth checkout at the commit the dispatch prompt names: `npm run vendor -- <this repo>/api/vendor/ward`, then the same for `web/vendor/ward`, in one commit with the call-site changes.
2. Server tests that POST `/ward/link` with a session send `{ currentPassword }`. New: link without it, with a wrong one and with the right one; a linked user still signs in with Ward.
3. The settings UI as decided, with a test that the call carries the password and that a wrong one shows the message.
4. A test that a new local account with a look-alike name (`AIice` when `alice` exists) is refused with the taken-name answer on `/register`, where this app has a route that creates or renames local accounts; skip it and say so where it has none.
5. Start the app on its dev seed once and read the start log: the username-key migration ran; note any shared-key line.
6. Shots of the settings at 1280 light and 390 dark; read them for clipping.

## Acceptance

- [ ] Both vendored copies at the new version; the tests above pass; `npm run check` exit 0; `bash corpus/lint.sh` OK.
- [ ] The outcome note lists each CHANGELOG entry this app crossed and what it needed.
- [ ] End move `ready_for_deploy` with the app's deploy step (server and web both change).

## Outcome (2026-11-19)

Built in commit `e7e18fb` (with `216938e`, a Prettier-only fix of `docs/images/demo-seed.mjs`, which failed `format:check` before this brief and kept `npm run check` from exiting 0). Both vendored copies (`api/vendor/ward`, `web/vendor/ward`) went from ward-auth 0.7.0 to 1.1.0 (six files each, checked against the staged copy's `SHA256SUMS`). `allowRename: false` is unchanged.

**CHANGELOG entries crossed, and what each needed**

- 0.7.1, 0.7.2: no change for apps.
- 1.0.0, password on link and unlink: the account dialog has a "Current password" field with the Link Ward button (`web/src/components/LinkWardForm.tsx`), calling `link(currentPassword)`. A wrong password and `too_many_attempts` (with the wait) show beside the field, which keeps focus; `accountMessage` gained both words. Unlink is not offered by this app.
- 1.1.0, look-alike usernames, migration 5: nothing by hand.

**Tests.** Server (`api/src/ward-link.test.ts`, Ward on a stubbed issuer): link with no session (401), without the password (400), with a wrong one (401 `invalid_credentials`), with the right one (200, the authorize URL); the library refuses `AIice` beside `alice`. Web (`AccountButton.test.tsx`): the call carries the typed password, a wrong one shows its message with focus on the field, `too_many_attempts` shows the wait, an empty field makes no call. `npm run check` exit 0.

**Not done.** The look-alike test on `/register` is skipped: this app has no `/register` and no rename route (the existing "no sign-up and no rename" test covers that), so the test calls the library's `createUser`. "A linked user still signs in with Ward" is not tested: it needs a full OIDC provider; the Ward callback is untouched.

**Start log.** On a fresh dev seed the start log has no username-key line (the library warns only when users share a key); `auth_migrations` shows version 5 `username_skeleton` applied and `owner` keyed `owner`.

**Shots** (account dialog at 1280 light and 390 dark, Ward and session routes stubbed, wrong password showing): read; the dialog fits, no clipping, focus stays on the field. At 390 the page behind scrolls sideways only because the stub made the Report button read "(undefined/undefined)".

**Owner step.** Deploy server and web together: from the vps-deploy checkout, `node cli.ts ro-housing all`. Migration 5 runs on the first boot and cannot be stepped back from without the earlier database.

