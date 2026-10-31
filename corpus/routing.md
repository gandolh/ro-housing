# Routing: how work routes in this project
<!-- Read by the orchestrate skill. Tune freely; keep it short. -->

**Implement skill:** plan-split-dispatch, or inline for a one- or two-file brief
**Review skill:** a general-purpose agent over the diff, plus `npm test` in `api/` and `web/`
**PR skill:** propose git commands
**Issue tracker:** none. The owner's feedback channel is `issues/`, see [docs/issues.md](../docs/issues.md)
**Code host:** GitHub, gandolh/ro-housing

## Intent routing
| Signal | Intent | Route to |
|--------|--------|----------|
| New idea or task to capture | capture | corpus-flow: add a todo |
| Ready to build | build | a brief in `briefs/todo/`, then implement |
| A scraper reads a site wrong | build | a brief; read [docs/adapters.md](../docs/adapters.md) first |
| Research a tool or a site | research | web search, then a `docs/research-*.md` page |
| A call worth keeping | domain | [docs/decisions.md](../docs/decisions.md) |
| README or docs refresh | docs | readme-docs |
| UI polish | design | impeccable, with [docs/design.md](../docs/design.md) |

## Knowledge routing: which file answers which question
This corpus is small on purpose: `docs/` plays the wiki's part.

| Question shape | Route to |
|---|---|
| "Why is it built this way?" | [docs/decisions.md](../docs/decisions.md) |
| "How is it put together?" | [docs/architecture.md](../docs/architecture.md) |
| "How does the scraper for site X work?" | [docs/adapters.md](../docs/adapters.md) |
| "Where does brief N stand?" | [wiki/status.md](wiki/status.md) |
| "Did I get every usage?" | `grep -rnw` |
| Does a change break behaviour | `npm test` in `api/` and `web/`, see [docs/testing.md](../docs/testing.md) |

## READ / SKIP / SKILLS
| Task type | READ | SKIP | SKILLS |
|-----------|------|------|--------|
| scraper | docs/adapters.md, the brief | web/ | plan-split-dispatch |
| web UI | docs/design.md, the brief | api/src/adapters | impeccable |
