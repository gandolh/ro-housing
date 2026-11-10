# Task 21: Base UI 1.9.0

**Depends on:** nothing. This brief runs first, so a visual or behavioural change in the later briefs is never blamed on the bump.

**Runs before:** 22, 23, 24 and 25.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

On 2026-11-09 the owner decided that every web app they own runs `@base-ui/react` at the latest stable release, **1.9.0**, pinned exactly. `npm view @base-ui/react dist-tags --json` printed `{"latest": "1.9.0"}` on 2026-11-10. ro-housing is on 1.5.0.

### The pin today (read 2026-11-10)

- `web/package.json:14` has `"@base-ui/react": "1.5.0"`: already exact, only old. `web/.npmrc` has `save-exact=true`.
- `web/package-lock.json:11` and `:75-77` resolve 1.5.0, with `@base-ui/utils` 0.2.9 (`:113-115`).
- `api/` has no Base UI. Command: `grep -rn "base-ui" --include=package.json --include=package-lock.json . | grep -v node_modules`.

### The two breaking changes do not touch this repo

1.9.0 renamed `OTPFieldPreview` to `OTPField` and `sanitizeValue()` to `normalizeValue()`. `grep -rnE "OTPFieldPreview|otp-field|sanitizeValue" web/src docs` found only `docs/base-ui.txt:71`, a link in a docs index.

### Measured on a scratch copy, 2026-11-10

`npm ci --ignore-scripts` in `web/`, then `npm install @base-ui/react@1.9.0 --save-exact --ignore-scripts`, npm 11.19.1:

- `web/package.json` became `"@base-ui/react": "1.9.0"`. Nothing else in it changed.
- **Ten lockfile entries changed.** Versions after:

  | Package | Before | After |
  |---|---|---|
  | `@base-ui/react` | 1.5.0 | 1.9.0 |
  | `@base-ui/utils` | 0.2.9 | 0.5.0 |
  | `@floating-ui/core`, `@floating-ui/dom` | 1.7.5, 1.7.6 | 1.8.0, 1.8.0 |
  | `@floating-ui/react-dom` | 2.1.8 | 2.1.9 |
  | `@floating-ui/utils` | 0.2.11 | 0.2.12 |
  | `reselect` | 5.2.0 | 5.3.0 |
  | `use-sync-external-store` | 1.6.0 | 1.7.0 |
  | `@babel/runtime` | none | 8.1.0, nested under `@base-ui/react` and under `@base-ui/utils` (two new entries) |

- `tsc -b` in `web/`: 0 errors before and after.
- `vitest run` in `web/`: 12 files, 79 tests passed before and after.

**Not measured, so step 1 measures it:** the 1.5.0 to 1.9.0 changelog (not read), behaviour in a browser, and `vite build`.

### What ro-housing uses

Seven wrappers in `web/src/components/ui/`, the only importers (`grep -rn "@base-ui" web/src`):

| Wrapper | Import | Used for |
|---|---|---|
| `Button.tsx:1` | `button` | all buttons |
| `Checkbox.tsx:1` | `checkbox` | the forms and the Sources tab's tick boxes |
| `Dialog.tsx:1` | `dialog` | Account, Report an issue, Edit saved apartment |
| `Field.tsx:1` | `field` | labels and errors |
| `Input.tsx:1` | `input` | text inputs |
| `Select.tsx:1` | `select` | five selects (sort, order, source, partitioning) |
| `Tabs.tsx:1` | `tabs` | Listings, Saved, Sources, with `keepMounted` (`web/src/App.tsx:41-50`) |

`Tabs.tsx:34-36` styles the selected tab with `data-active`. The changelog check must say whether 1.9.0 still sets that attribute.

## Owner decisions (defaults this brief builds)

1. **Pin 1.9.0 exactly**, through `npm install ... --save-exact`. No range.
2. **Nothing else moves.** No `npm update`, no other dependency. The lockfile diff is Base UI's own tree.
3. **A visual change the bump causes** goes in the outcome note and is left. Briefs 23 and 25 own the markup and styling.

## Files you OWN

- `web/package.json` (one line) and `web/package-lock.json`.
- A source file only if a breaking change forces it. Expect none.
- `docs/decisions.md`, only if the changelog check finds something to record.
- `corpus/wiki/status.md` and `corpus/log.md`.

## Files you must NOT touch

- `api/`, `web/src` styling, every other dependency.
- The wrappers' props. A forced fix keeps each wrapper's public API.

## What to do

One commit for the bump: `chore(deps): @base-ui/react 1.9.0`.

1. **Baseline and changelog.**
   - In `web/`, run `npm ci`, `npx tsc -b` and `npx vitest run`. Record 79/79.
   - Read the release notes from 1.5.0 to 1.9.0. Write one line per wrapper: "nothing in these notes touches what the wrapper uses", or the note and what you checked. Look at focus, dismissal, animation and positioning in `Dialog`, `Select`, `Tabs`, and at the `Tabs` active attribute.
2. **Re-run the grep** for the two renamed names. Expect only `docs/base-ui.txt`.
3. **Install:** `npm install @base-ui/react@1.9.0 --save-exact --ignore-scripts` in `web/`. Check the lockfile:

   ```
   node -e "const p=require('./package-lock.json').packages;console.log(Object.entries(p).filter(([k])=>/\/@base-ui\/react$/.test(k)).map(([k,v])=>k+' '+v.version))"
   ```

4. **Checks:** `npx tsc -b`, `npx vitest run`, `npm run build`. Fix only what the bump broke.
5. **Behaviour in a browser.** Run `npm run dev` in `web/` and `npm run dev` in `api/`, signed in. Check at 1280 and 390 px, with keyboard and pointer:

   | Component | Where | Check |
   |---|---|---|
   | `Tabs` | `web/src/App.tsx:33` | arrows move between tabs, the selected tab is bold with its underline, a hidden tab keeps its draft |
   | `Dialog` | Account (`web/src/components/AccountButton.tsx:35`), Report (`ReportIssueButton.tsx:81`), Edit (`web/src/pages/SavedPage.tsx:498`) | opens, Esc closes, focus returns to the opener, scroll locked behind it |
   | `Select` | `web/src/pages/ListingsPage.tsx:110,127,138`, `SavedPage.tsx:468`, `ApartmentForm.tsx:139` | the trigger shows the label, arrows and typeahead, the popup sits above a dialog |
   | `Checkbox`, `Input`, `Field`, `Button` | the Saved form | Space toggles, error text is announced, a disabled button takes no press |

   Write down any difference from 1.5.0.
6. **Commit**, then one corpus commit with the outcome note, `status.md` and `log.md`. Run `bash corpus/lint.sh`.

## Acceptance

- [ ] `node -p "require('./web/package.json').dependencies['@base-ui/react']"` prints `1.9.0`.
- [ ] The step 3 command prints one line ending `1.9.0` per copy and no other version.
- [ ] `git diff --stat HEAD~1` for the bump commit lists only `web/package.json` and `web/package-lock.json`, unless a forced fix is named in the outcome note.
- [ ] In `web/`: `npx tsc -b` exits 0, `npx vitest run` passes with at least 79 tests, `npm run build` exits 0.
- [ ] The outcome note has one changelog line per wrapper and the behaviour table's result.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- The lockfile of `web/` is rewritten here. Run briefs 22 and 23 only after this one is committed.
- Nothing in the image changes: `infrastructure/Dockerfile` copies only `api/`.
