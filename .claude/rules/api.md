---
paths:
  - "api/src/**"
---

# The API (`api/src`)

- Relative imports carry the real `.ts` suffix (`./app.ts`): Node's type stripping and tsx resolve it, and
  the build rewrites it to `.js` in `dist/`.
- Read the environment only in `config.ts`. Several files still read it themselves (an ESLint warning for
  now); add no new reader.
- Every fetch of a page goes through `createSession()` in `lib/fetch.ts`: it follows redirects by hand and
  checks each hop ([docs/decisions.md](../../docs/decisions.md), "Every hop of a fetch is checked").
- Parameter properties and enums are out (`erasableSyntaxOnly`): declare the field, use a string union.
- `api/vendor/` is Ward's generated library. Never edit it.
- `npm run check:conventions` runs `check-structure` over this folder, `--warn-only` for now.
