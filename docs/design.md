# Design system — ro-housing

Direction: **terminal-retro, simplistic, monospace-driven.** Sharp 90° corners, single-pixel ink-black borders, paper-white ground, no shadows on standard elements. Think TUI rendered in a browser, or an 80s admin console.

This is a tool, not a brochure. It should feel like a TUI rendered in a browser — dense, fast to scan, no decorative bloat.

## Anti-goals

- No rounded corners. Anywhere. The global `* { border-radius: 0 !important; }` rule in `styles.css` enforces this.
- No drop-shadows on standard elements. Reserved for **only** floating overlays (Dialog popup, Select popup).
- No gradient text, no glassmorphism, no faux-3D inset borders.
- No "secondary" or "tertiary" accent. One muted accent (burnt ochre) and that's it.
- No expressive serif "for warmth." This UI does not need warmth.

## Color

Defined in `web/src/styles.css` under `@theme`. Use these Tailwind color tokens via classes like `bg-ink`, `text-ink-dim`, `border-rule-soft`.

| Token             | Hex       | Role                                                  |
|-------------------|-----------|-------------------------------------------------------|
| `paper`           | `#f9f9f9` | App background. Off-white, never pure white.          |
| `panel`           | `#ffffff` | Surface for tables, dialogs, source rows.             |
| `panel-alt`       | `#f3f3f1` | Zebra row, table header background.                   |
| `ink`             | `#0a0a0a` | All text, all 1px borders. Never pure black (#000).   |
| `ink-dim`         | `#5c5c5c` | Secondary text, labels, meta.                         |
| `ink-faint`       | `#9a9a9a` | Placeholder text, disabled state.                     |
| `rule`            | `#0a0a0a` | Hard divider (same as ink).                           |
| `rule-soft`       | `#d8d8d4` | Soft divider inside panels.                           |
| `accent`          | `#b25a00` | Burnt ochre. CTA hover, dirty-row indicator.          |
| `accent-soft`     | `#f5e6d3` | Accent badge background.                              |
| `ok` / `ok-soft`  | `#1f6b2a` / `#e3efd8` | Success badge, ok status dot.                  |
| `bad` / `bad-soft`| `#a51a1a` / `#f7dcdc` | Error banner, failed status, "full" cap state. |
| `warn`            | `#8a5a00` | Dirty-changes counter.                                |

**Rules**
- Body text is `ink` on `paper` or `panel`. Anything else needs justification.
- Use `ink-dim` for labels, captions, meta. Not lighter than that on white — it stops being readable.
- The accent appears at most once per screen — it earns its impact by being rare.

## Typography

One family: **monospace**. Stack:

```
ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace
```

Mono is the whole identity. Headings, body, labels, data — all mono. We get hierarchy from **size + weight + uppercase + tracking**, not from a second face.

Scale (defined as Tailwind tokens):

| Token  | Size / line-height | Use                                                |
|--------|--------------------|----------------------------------------------------|
| `xs`   | 10px / 16px        | Footer text, source IDs, tiny meta. Often uppercase + tracked. |
| `sm`   | 12px / 18px        | Tab labels, badges, helper text.                   |
| `base` | 13px / 18px        | Body text, table cells. Default everywhere.        |
| `lg`   | 14px / 20px        | Button text in toolbar emphasis.                   |
| `xl`   | 18px / 24px        | App title only. Bold + tight tracking.             |

**Conventions**
- Headings, tab labels, table headers, badges → **UPPERCASE** + `tracking-wide` (5% letter-spacing).
- App title → bold + `tracking-tight` (-2% letter-spacing) for that compressed-terminal feel.
- Body text and data → normal weight, no tracking adjustments.
- Numbers in the listings table use the mono font naturally, so columns align without `tabular-nums`.

## Spacing & rhythm

4pt base. Touch points: 4, 8, 12, 16, 24, 32, 48.

- **Row height = 28px (`h-7`)** for buttons, inputs, selects, table rows. Single rhythm unit; everything else is multiples.
- App padding: `20px` on the y-axis, `24px` on the x-axis (`px-6 py-5`).
- Sticky header: 36px tall (`h-9`), 1px ink border on bottom.
- Table cell padding: `8px` x, `8px` y.

## Borders, shadows, depth

- **Default border**: `1px solid ink`. That's the depth language.
- **No box-shadows on standard elements.** Cards, inputs, buttons — all flat, all bordered.
- **Floating overlays** (Dialog popup, Select popup) get a single offset shadow that simulates a printed sticker:
  - Select popup: `shadow-[2px_2px_0_0_var(--color-ink)]`
  - Dialog popup: `shadow-[4px_4px_0_0_var(--color-ink)]`
  Hard-edge ink shadow, not blurry. It reinforces the retro feel.
- **Backdrops** behind a Dialog use `bg-ink/30`. No backdrop-blur.

## Components

All interactive elements come from `web/src/components/ui/`, which wrap **Base UI** primitives with `cn()` styling. Never use a bare `<button>`, `<input>`, `<select>`, or hand-roll a modal.

| Primitive | File | Base UI source |
|-----------|------|----------------|
| `Button` (variants: default / primary / ghost) | `ui/Button.tsx` | `@base-ui/react/button` |
| `Input` | `ui/Input.tsx` | `@base-ui/react/input` |
| `Textarea` | `ui/Textarea.tsx` | native (no Base UI textarea exists) |
| `Checkbox` | `ui/Checkbox.tsx` | `@base-ui/react/checkbox` |
| `Field`, `FieldLabel`, `FieldDescription`, `FieldError` | `ui/Field.tsx` | `@base-ui/react/field` |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectPopup`, `SelectItem` | `ui/Select.tsx` | `@base-ui/react/select` |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogClose` | `ui/Dialog.tsx` | `@base-ui/react/dialog` |
| `Tabs`, `TabsList`, `TabsTab`, `TabsPanel` | `ui/Tabs.tsx` | `@base-ui/react/tabs` |
| `Panel` (1px ink-bordered surface) | `ui/Panel.tsx` | none — semantic div |
| `Badge` (tones: default / ok / bad / accent) | `ui/Badge.tsx` | none |
| `StatusDot` (ok / bad / unknown) | `ui/StatusDot.tsx` | none |

### Button variants

- **default** — 1px ink border on white. Inverts to ink/paper on hover. The everyday button.
- **primary** — Solid ink, paper text. Inverts on hover. Reserved for the dominant action on a screen (Save, Refresh, Submit).
- **ghost** — Inline, no chrome, underline on hover. Used inside tabs or table actions.

### Tab strip

Underline-driven, not pill-driven. Active tab gets bold + ink color + a 2px ink line under it, flush with the list's bottom border. Inactive tabs are `ink-dim`.

### Dirty-state styling

On the Sources page, when a row has unsaved changes, its border switches from `ink` to `accent` and a small "modified" caret appears. No glow, no shadow — the color change is the only signal.

### Modal (Dialog)

- Centered, 1px ink border, 4px offset ink shadow.
- Backdrop: `bg-ink/30`.
- Title: uppercase, bold, tracked tight.
- Footer buttons right-aligned: ghost Cancel + primary Submit.

## Layout

Max width `960px` content column, centered. Sticky header with the app title left + Report-issue button right, 1px ink bottom border. Tabs sit immediately below the header on a separate row.

The whole app is one column. No sidebar. No grid system more elaborate than `flex` and `grid-cols-N`.

## What this design system is **not**

- Material-style. No FABs, no elevation layers, no ripples.
- Bootstrap-style. No utility helpers like "muted text-3" or "card with header/footer slots."
- Brand-system style. There is no logo, no brand voice document, no marketing surface.

It is a project-local set of opinions about how this specific app should look and which Base UI components to compose. That's the entire scope.
