# corpus: briefs and work log for ro-housing

This folder tracks work as numbered briefs, the way the owner's other repos do (the corpus-flow
skill). It was started on 2026-10-21 to hold the briefs from the 2026-10-20 improvement sweep,
and is deliberately small: the project's knowledge (decisions, architecture, adapters, testing)
stays in [docs/](../docs/README.md), which plays the wiki's part here.

## Layout

```
corpus/
  CLAUDE.md       this file
  index.md        the front door
  log.md          chronological record, newest last, absolute dates
  briefs/         numbered work specs: todo/ done/ superseded/
  wiki/status.md  one line per brief
```

## Rules

- A brief is `briefs/todo/<NN>-<slug>.md`: Context, Files you OWN, What to do, Acceptance. NN is
  the highest number across `todo/`, `done/` and `superseded/` plus one, two digits.
- Numbers never change. Finished work moves to `briefs/done/` with the same number and a short
  outcome note added at move time; after that the file is not edited. Work undone later moves to
  `briefs/superseded/` with a one-line note on top.
- Each finished brief gets a `log.md` entry, and anything durable it taught goes into `docs/`
  (decisions in [docs/decisions.md](../docs/decisions.md)).
- `wiki/status.md` holds one line per brief; read it instead of opening every brief.
- The issues/ folder (see [docs/issues.md](../docs/issues.md)) stays the owner's feedback channel;
  briefs are the specs work is built from.
- Absolute dates only. Commit corpus changes only when the owner asks.

The rest of a full corpus (a routing table, a lint script, wiki pages) can be added later if the
project grows into it.
