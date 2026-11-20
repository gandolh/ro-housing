# ro-housing tokens: board role to app token

Mechanism: the app's own `light-dark()` inside `@theme`; no second colour block, only the shadows have `[data-theme]` blocks. The board used the app's role names, so almost nothing is renamed; the values change.

## Renamed or remapped (board role to app token)
- paper, panel, panel-alt, ink, ink-dim, ink-faint, rule, rule-soft, accent, accent-soft, ok, ok-soft, bad, bad-soft, warn: same names, new values (warm paper; `panel` is `#fefdfb` and `#23221e`, not pure white; `ink-faint` is now 5.3:1, placeholders and disabled only)
- `on-accent` (board) is a new token in the app (see below); `focus` -> `--color-focus`
- `--font-mono` and `--font-sans`: both now start with Source Code Pro (loaded from Google Fonts with the latin-ext subset), the system mono is the fallback
- type: `text-xs` 10 -> 12, `text-sm` 12 (line 18 -> 16), `text-base` 13 -> 14, `text-lg` 14 -> 16, `text-xl` 18 unchanged, `text-mark` 11 -> 12; the table and controls use `text-base`, the phone body and desktop price `text-lg`
- `--color-scrim` takes a warm ink base
- the dark ground `#121212` (Material's baseline) is replaced by `#11110f`

## New tokens (component that needs them)
- `color-focus`: every `:focus-visible` ring (ink, 2px, offset 2px); the app had none named
- `color-on-accent`: the Badge and any solid accent fill (not drawn on these screens)
- `text-2xl` (20/28): dialog titles
- `shadow-island`: the table island in light (3px hard offset in `rule`), none in dark
- `shadow-popup`: the source menu, Select popup and Dialog (hard offset in ink-rule in both themes)
- `z-index-bar`: the phone bottom tab bar (components: a new `BottomBar`/Tabs variant for ListingsPage, SavedPage, SourcesPage navigation)
- Component needs with no new token: the source menu (a Select/Popover listing each site with its last run and a `failed` mark in `bad`), the `new` mark (`accent` dot + word), the Save toggle (ghost button; filled `bookmark` icon in `accent` when saved)

## App tokens the design no longer uses (keep or drop is the code brief's call)
- `shadow-knob`, `shadow-knob-pressed`, `color-bevel`: Refresh is now a flat secondary button and the primary is flat ink
- `--tracking-wide`: column heads and labels are sentence case, no tracked capitals (the wordmark keeps `tracking-tight`)
- `text-mark` stays only for the checkbox glyph
- `ok-soft`, `bad-soft`, `accent-soft`: kept (toast, error notice, chosen menu item)
