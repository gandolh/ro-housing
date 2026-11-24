---
title: The issues feature is hidden by .gitignore, so a fresh clone doesn't build
created: 2026-11-24
status: open
tags: [fix, server]
---

`.gitignore` line 152, `issues/` ("User-reported issues (consumed by Claude, deleted after fix)"), is not anchored,
so it also matches `api/src/features/issues/`. Five of its six files are in no commit (`git check-ignore -v`
names that rule for `index.ts`, `schema.ts`, `store.ts` and both tests); only `routes.ts` is tracked.
`api/src/app.ts` imports `./features/issues/index.ts` and registers `issuesRoutes`.

Today's deploys work because vps-deploy rsyncs the owner's checkout. A fresh clone fails to build, and a
vps-deploy rollback (which now rebuilds the old commit from a clone) would fail at its build for this app.

Found 2026-11-24 by vps-deploy's rollback audit (brief 37's rsync-vs-git check).

Fix: anchor the rule to the top-level folder it was meant for (`/issues/`), check nothing else under that name
was meant to stay out, then commit the five files, and confirm a `git clone` of main builds.
