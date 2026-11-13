# Design system: ro-housing

Direction: **the console, re-ruled.** A retro console in a real mono at reading size: sharp 90 degree corners, one-pixel ink rules, warm paper, one burnt-ochre accent. Each tab is one **island**: the tabs, the head band and the table or list read as a single framed surface. Approved on 2026-11-13 on the estate redesign board (see [decisions.md](decisions.md)).

This is a tool, not a brochure. It stays dense and fast to scan, and it takes its hierarchy from size, weight and position, not from decoration.

## Anti-goals

- No rounded corners, anywhere. The global `* { border-radius: 0 !important; }` rule in `styles.css` enforces it, so a dot or a ring is drawn as an SVG circle.
- No blur. Depth is a hard offset and nothing else (see Borders and depth).
- No gradient text, no glassmorphism, no faux-3D inset borders or bevels.
- No second accent. Burnt ochre only.
- No tracked capitals. Sentence case everywhere; the wordmark alone is uppercase.
- Colour is never the only signal: a failed source says `failed` with an icon, a stale row has a ring, a new row has the word `new`.

## Color

Defined in `web/src/styles.css` under `@theme`, as `light-dark(<light>, <dark>)`. `<html data-theme>` (`light`, `dark` or `system`) sets `color-scheme`, so the page follows without a class. A first visit shows light; the choice lives in `localStorage` (`theme`) and is set in the Account dialog. Use the tokens as Tailwind classes (`bg-panel`, `text-ink-dim`, `border-rule-soft`).

| Token | Light | Dark | Role |
|---|---|---|---|
| `paper` | `#f3f2ee` | `#11110f` | The page ground. |
| `panel` | `#fefdfb` | `#23221e` | The island, its rows, the bars, menus and dialogs. |
| `panel-alt` | `#efede6` | `#2c2b26` | The head band, column heads, the current tab, a row under the pointer. |
| `ink` | `#15140f` | `#edebe4` | Text, the solid button. |
| `ink-dim` | `#58554c` | `#b1ada3` | Secondary text, labels, stale rows. |
| `ink-faint` | `#6f6b62` | `#9a968c` | Placeholders and disabled controls only. |
| `rule` | `#15140f` | `#8a867b` | The island's frame and every control's border. |
| `rule-soft` | `#d6d3c9` | `#3d3b35` | Row lines and quiet dividers. |
| `accent` | `#a35100` | `#eb9a4a` | The current tab's top rule, the `new` mark, a dirty row's `modified`. |
| `accent-soft` | `#f8ecdc` | `#3e2c17` | The chosen menu item, the replace-draft notice. |
| `on-accent` | `#fffdf9` | `#1a1206` | Text on a solid accent. |
| `ok` / `ok-soft` | `#1f6b2a` / `#e3efd8` | `#7fd08a` / `#1e3321` | A source that ran; the toast. |
| `bad` / `bad-soft` | `#a51a1a` / `#f7dcdc` | `#ff8a80` / `#3c1a1a` | A failed source, an error notice. |
| `warn` | `#7f5300` | `#e8b04e` | The source-health line, unsaved changes, `+TVA`. |
| `focus` | `#15140f` | `#edebe4` | The focus ring. |

`scrim` is the dialog backdrop. `web/src/contrast.test.ts` reads these pairs from the stylesheet and fails any text pair under 4.5:1, or any rule or focus pair under 3:1, in either theme. Lowest text pair: light `ink-faint` on `panel-alt` 4.53, dark `ink-faint` on `panel-alt` 4.81; lowest edge: dark `rule` on `panel-alt` 3.9.

## Typography

One family: **Source Code Pro**, self-hosted from `@fontsource-variable/source-code-pro` (imported in `main.tsx`), with the system mono as the fallback. Mono is the identity; there is no second face.

| Token | Size / line | Use |
|---|---|---|
| `xs`, `sm` | 12 / 16 | Chips, column heads, helper text, the foot key. Nothing is smaller. |
| `base` | 14 / 20 | Body, table cells, controls. |
| `lg` | 16 / 24 | The desktop price (bold), the phone body and titles. |
| `xl` | 18 / 24 | The wordmark (bold, uppercase, tight), the phone price. |
| `2xl` | 20 / 28 | Dialog titles. |

Weights are 400, 500, 700. Prices and figures use tabular mono digits, so columns align.

## Spacing and rhythm

- Table rows are about 52 px; controls are 36 px (32 px for table actions), and 48 px on a phone.
- The header is 48 px, the footer 40 px; the content column is at most 1168 px with 24 px of padding (16 px on a phone).
- Gaps and padding step through 4, 8, 12, 16 and 24, with a few 5, 6, 7 and 10 px steps inside chips and rows.
- No two cells' text in one row come closer than 8 px (`e2e/shots.spec.ts` checks it).

## Borders and depth

- The default border is `1px solid rule`. In dark, `rule` is a lighter warm grey that still reads 3.9:1 or better on every surface.
- **The island** carries a 3 px hard offset shadow in `rule`, in light only (`shadow-island` with `dark:shadow-none`). In dark the panel steps up by lightness and keeps its edge.
- **Popups** (the Select list, the Dialog) keep the same hard offset in both themes (`shadow-popup`).
- Backdrops use `bg-scrim`. No backdrop blur.

## Components

All interactive parts come from `web/src/components/ui/`, which wrap **Base UI** primitives. Never use a bare `<button>`, `<input>`, `<select>`, or a hand-built modal.

| Primitive | File | Base UI source |
|---|---|---|
| `Button` (default / primary / ghost) | `ui/Button.tsx` | `@base-ui/react/button` |
| `Input`, `Textarea` | `ui/Input.tsx`, `ui/Textarea.tsx` | `@base-ui/react/input`; native |
| `Checkbox` | `ui/Checkbox.tsx` | `@base-ui/react/checkbox` |
| `Field`, `FieldLabel`, `FieldDescription`, `FieldError` | `ui/Field.tsx` | `@base-ui/react/field` |
| `Select` (takes `items`), `SelectTrigger`, `SelectValue`, `SelectPopup`, `SelectItem` (with a `detail` line) | `ui/Select.tsx` | `@base-ui/react/select` |
| `Dialog` and its parts | `ui/Dialog.tsx` | `@base-ui/react/dialog` |
| `RadioGroup` (the theme switch) | `ui/RadioGroup.tsx` | `@base-ui/react/radio-group` |
| `Tabs`, `TabsList`, `TabsTab`, `TabsPanel` | `ui/Tabs.tsx` | `@base-ui/react/tabs` |
| `Panel`, `Island`, `IslandHead` | `ui/Panel.tsx` | none |
| `Badge` (a square chip) | `ui/Badge.tsx` | none |

Beside them: `Icon` (a few 24-unit line icons, drawn here, no icon package), `RunStatus` (the last-run line and the `failed` chip) and `lib/useLayout.ts` (which of the table or the cards to draw).

### Buttons

- **default**: the quiet secondary button, a 1 px rule on the panel. Refresh, Discard, Cancel.
- **primary**: solid ink, flat, bold. One per screen where there is an action: Fetch details on Saved, Save on Sources. Refresh is never the loudest control.
- **ghost**: no chrome until the pointer is over it. Save on a listing (with a bookmark icon; it opens a draft, it is not a toggle), Edit and Delete (icons, 48 px icon buttons on a phone).
- A disabled button drops to `ink-faint` on a soft rule.

### Tabs

Listings, Saved and Sources stay Base UI `Tabs` with every panel `keepMounted`. On a desktop they are folder tabs: the current one takes the head band's ground, a rule on three sides and an ochre top rule, and covers the island's top edge. On a phone the same `TabsList` is the **bottom bar** (icon over label, three equal cells, an ochre top rule on the current one, 48 px or more to hit), sticky at the foot of the screen.

### Head band

Each island starts with a head band on `panel-alt`, ruled below. Listings: Refresh, the source control, sort, order, the source-health line and the count. Saved: the link field and Fetch details, then the hint, the sort and the count. Sources: Save, Discard, the health line and `7 of 10 enabled`. On a phone the bands stack (Listings takes two rows; Sources one 48 px row of Save, Discard and the count).

### Source health

The source control lists each site with its last run. A source that failed shows a square `failed` chip (an icon and the word, a `bad` border on `bad-soft`, no side stripe). When any enabled source failed, the line `<site> failed on its last run` sits in the head band, in `warn`.

### Listings table

- Columns: Title, Source, Rooms, m², **Price** (16 px bold, right-aligned, the first stop), €/m², Location, Age, History, Save. Titles take two lines at most, set by the column's width, never a clamp. Prices keep the app's format (`89.000 €`, `1.712 €/m²`) and the `+TVA` marker.
- Widths: the full table from 1200 px; from 960 to 1199 the table with Location under the title, History narrower and Save icon-only; two-column cards from 640 to 959; one column below 640. Saved draws its table from 1200 and cards below.
- `new`: an ochre dot and the word, on a row first seen two days ago or less (the day count the Age column shows, `isNew` in `lib/format.ts`).
- Stale rows (not found by their source's last refresh) are dimmed to `ink-dim`, 4.5:1 or better, and carry a hollow ring before the Age. The foot key says so: `Dimmed: not found by its source’s last refresh.` and `new: first seen 2 days ago or less. A row can be both new and dimmed.`
- Phone cards lead with the price (18 px bold), then the title, then fixed rows (rooms, m², age; location and source), with a 48 px Save.

### Saved and Sources

Saved: the price leads the data columns; the title, source chip, layout and note stay together; an empty photo shows an image glyph; Edit and Delete are ghost buttons with icons. Phone cards put the photo beside the price and the two actions as 48 px icon buttons. Sources: the site key sits under the name, the last run takes 220 px with its check or `failed` chip, and the search URL takes the rest. On a phone each row is the checkbox (a 48 px target), the name, a full-width field, then the last run with the key at the right; keys and run lines wrap by whole words. A row with unsaved changes says `modified` in `accent`.

### Dialog

Centered, 1 px rule, the hard offset shadow. Title in `2xl` bold, sentence case. A dialog that holds a form (Report, Edit) ignores an outside press. Footer buttons right-aligned: Cancel then the primary.

### Dirty, error and empty states

An error notice is `bad` text on `bad-soft` with a `bad` border and a Retry button. An empty list is one centered line in the island. A notice or a toast uses the same square border.

## Layout

One column, no sidebar. A sticky 48 px header (the wordmark left; Report and the account at the right), the tabs, the island, a 40 px footer. Phone (820 px and below): the tabs become the bottom bar and the island sits in 16 px of page padding.

## What this design system is not

Material (no elevation layers, ripples or FABs), Bootstrap, or a brand system. It is a project-local set of opinions about how this app looks and which Base UI parts it composes.
