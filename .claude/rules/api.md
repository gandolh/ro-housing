---
paths:
  - "api/src/**"
---

# The API (`api/src`)

- Relative imports carry the real `.ts` suffix (`./app.ts`): Node's type stripping and tsx resolve it, and
  the build rewrites it to `.js` in `dist/`.
- Read the environment only in `config.ts` (`n/no-process-env` is an error everywhere else, tests apart). The
  entries call `loadEnvFile()` first and import the app after it, because the database opens when its module
  loads.
- Every fetch of a page goes through `createSession()` in `lib/fetch.ts`: it follows redirects by hand and
  checks each hop ([docs/decisions.md](../../docs/decisions.md), "Every hop of a fetch is checked").
- Parameter properties and enums are out (`erasableSyntaxOnly`): declare the field, use a string union.
- `api/vendor/` is Ward's generated library. Never edit it.
- The structure (code-structure skill): `server.ts` alone listens and `app.ts` builds; `plugins/` holds what every route
  inherits, each in `fastify-plugin`; `features/<name>/` holds `routes.ts`, `schema.ts` and `store.ts`, and is used
  through its `index.ts` only; `lib/` imports no Fastify. Every route declares its zod schemas and a response schema
  for each status its handler sends; a handler never parses `request.body`, `.query` or `.params`.
- Errors answer `{ error: string }` through the one handler in `plugins/errors.ts`; a thrown message is logged, never sent.
- A feature is tested alone with `testApp()` (`src/testing/test-app.ts`) and `inject()`.
- `npm run check:conventions` runs `check-structure` (strict) and dependency-cruiser over this folder.
