# User-reported issues

There's a **Report an issue** button in the web UI. Clicking it opens a modal where the user writes feedback. On submit, the API writes a single Markdown file to `issues/` at the repo root.

This is intentionally not a bug tracker. It's a one-way channel: user → Claude. Claude reads the files, builds a plan, implements the fix, then deletes the file directly with `rm`. There is no in-app "resolve" button.

## File format

```
issues/<unix-ms-timestamp>-<short-slug>.md
```

Frontmatter + body:

```markdown
---
id: 1731012345678-improve-refresh
createdAt: 2026-05-22T14:32:25.678Z
---

Refresh sometimes hangs when storia is enabled — would be nice to show
which adapter is currently running.
```

The slug is derived from the first ~6 words of the body, lowercased, non-alphanumerics stripped.

## The 10-issue cap

The API rejects new submissions when `issues/` already contains 10 files. POST returns **409** with body `{ "error": "max 10 open issues; resolve some before adding more" }`. The UI surfaces the error inline.

Reason: this is a personal-use feedback channel, not a queue. If 10 unresolved issues have piled up, the right move is to triage them, not append an 11th.

## Claude's workflow (this is what *I* do when I see issues)

1. `ls issues/` — see what's pending.
2. Read each file, decide whether to implement now, group with others, or skip.
3. For the ones I act on: implement the fix, then `rm issues/<filename>` as part of the same change.
4. If I'm intentionally not acting on an issue (out of scope, won't-fix), I tell the user and they decide whether to delete the file themselves.

I do *not* edit issue files, append "fixed in commit X" notes, or move them to an `archive/` subdirectory. The file existing means it's pending; the file not existing means it's done. Keep it that way.

## What lives outside this file

- API code: `api/src/routes/issues.ts`
- UI button + modal: `web/src/components/ReportIssueButton.tsx`, referenced from `web/src/App.tsx`.
