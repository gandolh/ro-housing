# Task 23: Base UI by the conventions, and the theme switch

**Depends on:**

- In ro-housing: brief 21 (Base UI 1.9.0) and brief 22 (the gate, the formatter and `.claude/rules/web.md`).
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 1-13, the references and `check-base-ui.mjs`;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: the checker runs `--warn-only` until the repo's Base UI brief is done.
- The owner's grilling of 2026-11-10: the owner's answers (Q18, Q19, Q58) and the technical calls (Q15-Q17, Q41, Q44, Q57, Q59-Q62) are all decided and written below as decisions.

**Runs before:** 25, the redesign.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

ro-housing is **already on Tailwind v4**, so there is no Tailwind migration brief. The audit below found no CSS Modules, no inline `style` props, and one stylesheet, `web/src/styles.css` (123 lines), with an `@theme` block, a few unlayered rules and the `.knob` class. It is also already close to the Base UI conventions: seven wrappers in `web/src/components/ui/`, subpath imports, `render` on every trigger. This brief closes the gaps and adds the theme switch.

### The audit against rules 1-13 (2026-11-10)

| Rule | Violations | Where |
|---|---|---|
| 1. Exact pin | 0 after brief 21 | `web/package.json:14` |
| 2. Subpath imports | 0 | all 7 imports are subpaths (`grep -rn "@base-ui" web/src`) |
| 3. Base UI only under `ui/` | 0 | all 7 are in `web/src/components/ui/` |
| 4. Tailwind on the parts, no class selector aimed at a part | **1** | `.knob` in `web/src/styles.css:98-104` styles a button and a select trigger through `[data-pressed]` and `[data-popup-open]`; used at `web/src/components/ui/Button.tsx:17` and `Select.tsx:17` |
| 5. One stylesheet, no inline `style` | 0 | `grep -rn "style={{" web/src` prints nothing. Unlayered rules sit in `styles.css` (`a`, `table`, `body`, `.knob`, `*{border-radius:0 !important}`): they beat every utility, and the file's own comment records the lesson. They move to `@layer base` or `@layer components` |
| 6. Semantic tokens, no arbitrary colours | 1 | no `bg-[#...]`; `rgba(255, 255, 255, 0.65)` at `web/src/styles.css:100, 105` is a raw colour |
| 7. Motion on the state attributes, in `motion-safe:` | **2** | `web/src/components/ui/Dialog.tsx:17, 24` use `transition-opacity` with no `motion-safe:` |
| 8. Portalled, z-index from tokens | **3** | every popup is portalled; but `z-30`, `z-40`, `z-50` are raw numbers (`web/src/App.tsx:22`, `Dialog.tsx:17, 22`) and there is no `--z-*` scale in `@theme` |
| 9. Triggers use `render` | 0 | `AccountButton.tsx:39`, `ReportIssueButton.tsx:82, 125` |
| 10. `Select.Root` with `items` | **5** | each select shows its label through the home-made `SelectValueLabel` (`web/src/components/ui/Select.tsx:36-52`) instead of `items`: `web/src/pages/ListingsPage.tsx:110, 127, 138`, `web/src/pages/SavedPage.tsx:468`, `web/src/components/ApartmentForm.tsx:139` |
| 11. No native dialogs | 0 | |
| 12. Dialogs | **3 dialogs, same gaps** | all have a `Title`, are controlled, and icon-only buttons have an `aria-label` (`SavedTable.tsx:123`, `ListingsTable.tsx:135`). None has the Escape guard or `initialFocus` (`web/src/components/ui/Dialog.tsx` passes neither). The two that hold a form lack `disablePointerDismissal`: `web/src/components/ReportIssueButton.tsx:81` and `web/src/pages/SavedPage.tsx:498`. The edit dialog holds a `Select`, so an Esc that closes the select's popup also closes the dialog unless guarded |
| 13. Base UI over hand-built widgets | 0 | there is no toast, switch or menu; tabs, selects, checkboxes and dialogs are Base UI |

Also found:

- `Select.tsx:25` writes `data-[popup-open]:` while the rest of the file writes `data-popup-open:`. Pick the bare form.
- The `▾` in `Select.tsx:25-27` is a text glyph that a screen reader may read out. Mark it `aria-hidden`.
- There is **no phone navigation panel**, so Q40 (the swipeable `Drawer`) doesn't apply. Tabs fit at 390 px.
- The app is light only: no `dark:` variant, no `data-theme`, no `localStorage` (`grep -rn "localStorage\|dark:\|data-theme" web/src` prints nothing). The tokens are `@theme` colours at `web/src/styles.css:5-22`.

## Owner decisions

Decided on 2026-11-10, owner answers 1-3 and technical calls from 4:

1. **A Light / Dark / System choice, light by default** (Q18, owner). A first visit shows the light theme, not the system's. `dark:` keys off a `data-theme` attribute through `@custom-variant dark`, not `prefers-color-scheme`. ro-housing keeps no per-user settings, so the choice is kept on the device, in `localStorage`.
2. **Close enough** (Q19, owner). Before and after screenshots at 1280 and 390 px show no visible change to layout or colour in the light theme. A few pixels of drift are neither fixed nor listed.
3. **Form dialogs stay open on an outside tap** (Q58, owner). The Report and Edit dialogs set `disablePointerDismissal`. They close with Cancel, the X or Esc.

4. **Where the control lives** (Q41, Q57, technical call). The Account dialog (`web/src/components/AccountButton.tsx`), as a guarded `ToggleGroup` wrapper, because the picker **saves** on each choice: arrow keys move focus without saving, a press chooses, and one item always stays pressed. The inline script applies the saved choice before first paint, so the login page also follows it.
5. **`items` replaces `SelectValueLabel`** (Q57, Q59, technical call). The wrapper is deleted once nothing uses it. Wrappers stay in `web/src/components/ui/` (Q59).
6. **The dark values** are derived by inverting the paper and ink roles, and kept honest by a contrast test (step 7). Brief 25 may replace them (default, no question covers it).
7. **Native controls and imports** (Q15, Q16, technical call). Base UI is imported only under `ui/` folders (it already is: all 7 imports). The app's text and search inputs stay native.
8. **The type scale and tests** (Q62, Q60, technical call). The two arbitrary text sizes (`text-[11px]`, `text-[10px]`) become named scale entries in `@theme` at the same pixels. There is no `phone` variant: `max-sm:` is used. Tests select by role, and the repo has no `data-testid` (0 found). The web tests already run in happy-dom, so no jsdom is added; a wrapper gets its own test only if it holds logic (`Dialog`'s Escape guard and the new `ToggleGroup`'s guard).
9. **The root font size** (Q44, technical call). No change: the 13px size is already on `body` (`web/src/styles.css:63`), with a comment that a size on `html` would shrink every `rem`.

## Files you OWN

- `web/src/components/ui/**` (the wrappers and their tests), plus a new `ToggleGroup.tsx`.
- `web/src/styles.css`, `web/index.html` (the pre-paint script), `web/src/main.tsx` (only if the theme module needs mounting).
- The call sites of the five selects, and `AccountButton.tsx`, `ReportIssueButton.tsx`, `SavedPage.tsx` (only the dialog props).
- A new `web/src/theme.ts` and its test, and a test for the `Dialog` and `ToggleGroup` guards (decision 8).
- `.claude/rules/web.md` (add the Base UI and Tailwind lines), `scripts/conventions.json` if an exception is needed.
- `docs/design.md` (the dark tokens), `docs/decisions.md`, `corpus/wiki/status.md`, `corpus/log.md`.

## Files you must NOT touch

- `api/`, `web/package.json`: every part needed ships in 1.9.0.
- The look in the light theme beyond Q19's tolerance. The retro direction in [docs/design.md](../../../docs/design.md) (sharp corners, ink borders, no shadows on standard elements) stays.

## What to do

One commit per step. After each, `npm run check` passes with `check-base-ui` in `--warn-only`.

1. **Before.** Run `check-base-ui` strict and record the counts by rule. Take Playwright screenshots, kept out of git, at 1280 and 390 px of: Listings, Saved with a draft, the Edit dialog, Sources, the Account dialog, the Report dialog, the login page, an open select.
2. **Select `items`.** Give each of the five `Select.Root`s an `items` map, drop `SelectValueLabel`, add `aria-hidden` to the `▾`, and use the bare `data-popup-open:` form. The empty "All sources" value keeps working.
3. **The dialog wrapper.** `Dialog.tsx` takes the Escape guard (`details.reason === "escape-key" && details.event.defaultPrevented` keeps it open), `initialFocus` in the house order (the first `[data-autofocus]`, else the first field, else the footer's first button) and a `disablePointerDismissal` prop. Set the prop on the Report and Edit dialogs. Replace `autoFocus` at `ReportIssueButton.tsx:102` with `data-autofocus`. Add tests: Esc in the edit dialog's open select closes only the select; an outside press leaves the Report dialog open.
4. **Layers and tokens.** Add a `--z-*` scale to `@theme` (header, backdrop, dialog) and use it. Turn the two arbitrary text sizes into named `--text-*` entries (decision 8). Wrap `a`, `table`, `body` and `::selection` in `@layer base`, move `.knob` into the parts as Tailwind variants (`data-pressed:`, `data-popup-open:`, `active:`) with a `--color-bevel` token, add `motion-safe:` to the two transitions. The `*{border-radius:0 !important}` rule stays, in `@layer base`. Compare screenshots (Q19).
5. **The theme module.** `web/src/theme.ts` exports the choice type, `readTheme()`, `saveTheme()` and `applyTheme()`. Every read and write of `localStorage` is in a `try`. `system` resolves through `matchMedia`, and listens for changes only while it is chosen.
6. **The control.** A guarded `ToggleGroup` wrapper on Base UI's `toggle-group` (arrow keys move focus without saving, one item always pressed; decision 4), used in the Account dialog for Light, Dark and System. The inline script in `web/index.html` sets `data-theme` before first paint, with light when nothing is saved.
7. **Dark tokens.** `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`, and a `[data-theme="dark"]` block that redefines the colour tokens, plus a `--color-scrim` token for the dialog backdrop (today `bg-ink/30` at `Dialog.tsx:17` would turn light). Add a test that computes the contrast ratio of each text token on each surface in both themes and fails under 4.5:1 for body text.
8. **After.** Screenshots again, both themes. Run `check-base-ui` strict: rules 1-3 and 8-12 report 0 and rule 4's `.knob` is gone. Update the docs and `log.md`.

## Acceptance

- [ ] `grep -rn "SelectValueLabel" web/src` prints nothing, and each `Select.Root` call site passes `items`.
- [ ] `grep -n "\.knob" web/src/styles.css` prints nothing, and `grep -rnE "\bz-[0-9]" web/src` prints nothing.
- [ ] `grep -rn "@base-ui/react" web/src --include=*.tsx --include=*.ts | grep -v "components/ui/" | grep -v "vi.mock"` prints nothing.
- [ ] A test shows Esc in the open select leaves the edit dialog open, and an outside press leaves the Report and Edit dialogs open.
- [ ] A test shows the theme control's arrow keys move focus without changing the saved choice, and one choice always stays pressed. A test shows a first visit (empty `localStorage`) has `data-theme="light"` on `html`, that choosing Dark sets `dark` and survives a reload, and that `system` follows `matchMedia`.
- [ ] The contrast test passes in both themes.
- [ ] Before and after screenshots of the light theme at 1280 and 390 px show no visible change (Q19).
- [ ] `check-base-ui` strict reports 0 for rules 1-3 and 8-12.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 25 redesigns on top of the tokens and wrappers built here, in both themes.
- Brief 22's `better-tailwindcss` rules can turn to errors once this brief is done.
