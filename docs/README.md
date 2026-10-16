# ro-housing docs

Start with the [main README](../README.md). This folder holds what it links to, and the notes to read after a pause to get back into the project. The code says *what*, and these files say *why*. Things that drift quickly, such as version numbers, selectors and line numbers, belong next to the code instead.

| File | What it covers |
|---|---|
| [getting-started.md](getting-started.md) | Local setup: prerequisites, the two dev servers, settings, first use, tests, common problems |
| [overview.md](overview.md) | What the app does, who it's for, what is in and out of scope, the known risks |
| [worklog.md](worklog.md) | What each session built, what broke and what's next. Read it after a pause |
| [architecture.md](architecture.md) | Repo layout, the Refresh and the save-by-link flows, the data model, what lives where |
| [adapters.md](adapters.md) | The search-scraper contract, cheerio vs Playwright, per-site notes, and how a single listing page is read |
| [design.md](design.md) | The terminal-style design system: palette, type scale, the shared UI components, anti-goals |
| [testing.md](testing.md) | The Vitest setup in both packages, what each test file covers, how to add one |
| [decisions.md](decisions.md) | Append-only log of design choices and their trade-offs. Read it before changing a rule |
| [issues.md](issues.md) | How the in-app Report button writes files to `issues/`, and how Claude works through them |
| [base-ui.txt](base-ui.txt) | Index of the Base UI component docs, for anyone adding a component to `web/src/components/ui/` |
| [images/](images/shots.md) | The screenshots in the README, how each was made, and the demo seed |
