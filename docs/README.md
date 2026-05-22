# ro-housing — docs

Living notes about *what this project is* and *why it looks the way it does*. The point of this folder is "after a two-week pause, what do I need to read to get my head back in?" — not API reference, not exhaustive code docs. Code is the source of truth for *what*; these docs cover *why*.

Avoid putting things here that drift quickly (npm version numbers, exact selectors, line numbers). Those belong next to the code.

## Files

**Start here**
- [overview.md](overview.md) — what the app does, who it's for, what's in/out of scope.
- [worklog.md](worklog.md) — chronological "what got built / what's next" log. Read after a pause to catch up.

**How it's built**
- [architecture.md](architecture.md) — repo layout, request flow, data model, the moving parts.
- [adapters.md](adapters.md) — the contract every site adapter follows, the two scraping strategies (cheerio vs Playwright), per-site quirks.
- [design.md](design.md) — the terminal/retro frontend design system. Palette, type scale, primitive components, anti-goals.
- [testing.md](testing.md) — Vitest setup, what's tested, how to add tests in each package.

**Why it's built that way**
- [decisions.md](decisions.md) — append-only log of deliberate design choices and the tradeoffs behind them. Update when you make a call you might second-guess later.

**Operational**
- [issues.md](issues.md) — how the in-app "Report an issue" channel works. Read before processing files in `issues/`.
