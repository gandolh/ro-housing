---
paths:
  - "web/src/**"
---

# The web app (`web/src`)

- Read the `base-ui` skill before you add or change a component.
- Base UI is imported only by the wrappers in `web/src/components/ui/`. Pages import the wrapper, never
  `@base-ui/react`.
- Colours and sizes come from the tokens in `web/src/styles.css`; no bare-element rules outside
  `@layer base`.
- Colours are `light-dark()` tokens (Light, Dark, System on `<html data-theme>`); a new token gets both values and
  passes `web/src/contrast.test.ts`.
- A `Select` always passes `items`. A dialog that holds a form sets `disablePointerDismissal`.
- Stacking is `z-header`, `z-overlay`, `z-dialog`: no bare `z-` numbers, no arbitrary text sizes.
- The look is the retro terminal one in [docs/design.md](../../docs/design.md): sharp corners, one-pixel
  ink borders, no soft shadows.
- Relative imports carry the real suffix (`./App.tsx`). A type-only import is `import type { X }`.
- A handler that returns a promise goes on an attribute as `() => void handler()`.
- `web/vendor/` is Ward's generated library. Never edit it.
- `npm run check:conventions` runs `check-base-ui` over this folder, strict: it reports nothing today.
