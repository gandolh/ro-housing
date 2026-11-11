# ro-housing

A personal Timișoara flat-buying aggregator: nine scrapers, a Saved shortlist and sign-in. Two separate npm
projects, `api/` (Fastify on SQLite) and `web/` (React on Vite). Read [corpus/index.md](corpus/index.md) first.

## Commands

Run them in the repo root unless it says otherwise.

- `npm ci` here, then in `api/` and `web/`: the root holds the house-style tools, each project its own.
- `npm run check`: typecheck, lint, format check, conventions, tests, across both projects. Run it before
  every hand-back.
- `npm run check:fast`: both typechecks, then ESLint on the changed files. The Stop hook runs it from the
  folder of the file you saved, so `api/` or `web/` alone has the same script.
- `npm run format`: Prettier writes every file it covers (Markdown stays out).
- One test file: `npx vitest run <file>` inside `api/` or `web/`.
- Dev, in two terminals: `npm run seed` once, then `npm run dev` in `api/`; `npm run dev` in `web/`.

## Places that mislead

- Two packages and two lockfiles; neither is a workspace of the root. The root `package.json` only holds the
  tools and the scripts that call both.
- `.env` sits at the repo root. The API listens on 3000, Vite on 5173 under `/ro-housing/`.
- `npm install` in `api/` runs `postinstall`, which downloads Chromium (about 300 MB).
- `vendor/house-style/` is a generated copy: never edit it, `npm run house-style:sync` refreshes it.
  `api/vendor/` and `web/vendor/` are Ward's generated library: never edit those either.
- `api/tsconfig.json` writes the house flags out instead of extending the copy, because the Docker build
  stage copies only `api/`. Change it by hand when the house base changes.

## Hard rules

- **No secrets.** Never read, print or commit a `.env` file; name a secret by its variable.
- **No CI.** Don't add GitHub Actions, runners or other GitHub-specific automation.
- **No pushes.** Commit locally; the owner pushes.
- **Deploys are owner steps.** Write the exact commands down and hand them over.
- Fix a finding of the house rules in code; a rule that looks wrong for this app is reported, not patched.

## brief-board

Brief progress goes on brief-board. Run `brief-board guide` before you start or resume a brief, and
follow it.
