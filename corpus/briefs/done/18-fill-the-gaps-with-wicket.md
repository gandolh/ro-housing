# Task 18: "Fill the gaps" on the Saved draft, through Wicket

Filed 2026-11-04 from the owner's grill. **Write only: not built yet.** It waits for Wicket, the
estate's LLM queue service: built on 2026-11-04 (in the wicket repo, `corpus/wiki/api.md` has its
full API), not deployed yet. Build this after brief 17 (the app on the VPS, where Wicket runs) and
once Wicket is deployed.

## Context

The Firecrawl and Ollama research ([docs/research-firecrawl-ollama.md](../../../docs/research-firecrawl-ollama.md))
scored a small model reading a listing page directly: `qwen2.5:3b` got 67 of 70 fields right and
invented none, and behind the extractor it filled the price and the floor count the rules missed
on a site they had never seen (69 of 70 together). It was also slow on a CPU: 10 seconds to over
5 minutes a page. Through Firecrawl the same model invented a whole flat on a CAPTCHA page. So the
research's proposal D: a model only on request, never automatic, only for fields still empty, and
the user checks every value it gives.

The owner settled it on 2026-11-04: on the Saved draft form, a button starts an async Wicket job
that sends the listing page to the model and fills **only the fields still empty**, each marked
"from AI" beside the existing "from page", "edited" and "not on page" labels, so the owner checks
them. While queued, the form shows Wicket's ticket line ("you're number N, now serving M").
Cancel is possible. The model never runs in the automatic Refresh path.

Wicket's API contract, as given:

> Callers set `WICKET_URL` (the API base) and `WICKET_TOKEN` (a per-app bearer token that names
> the app). `POST {WICKET_URL}/v1/jobs` with `{ messages: [{role, content}], format?: "json" | <JSON schema> }`
> → `202 { id, ticket, nowServing, position, status }`. `GET {WICKET_URL}/v1/jobs/:id` (optional
> `?wait=25` long-polls) → `{ id, ticket, nowServing, position, status: "queued"|"running"|"done"|"failed"|"cancelled", result?: { text, model }, error? }`.
> `DELETE {WICKET_URL}/v1/jobs/:id` cancels the caller's own job. Wicket picks the model and runs
> one job at a time, first come first served.

Wicket calls **Ollama Cloud only**: on 2026-11-04 the owner dropped the small backup model on the
VPS it first planned (the contract above loses `result.backup`), so when the cloud fails the job
ends `failed` with the reason in `error`.

What Wicket's API page adds to that (the wicket repo, `corpus/wiki/api.md`, 2026-11-04):

- **The body is strict.** Send only `messages` and `format`; any other field (a `model`, a
  `stream`) is a 400 `invalid_request`. The body is at most 1 MB.
- **`?wait` is held to 25 seconds**; a higher value waits 25. It returns as soon as the status, the
  position or `nowServing` changes, and at once for a finished job.
- **503 `queue_full`** when 200 jobs are already waiting.
- **A 404 for a job means treat it as cancelled.** Wicket forgets every job on a restart, and
  another app's job is a 404 too.
- **Answers are kept 10 minutes** after a job finishes, in memory only; after that `GET` is a 404.
  Fetch the result promptly.
- **A cancelled job carries an `error` reason:** cancelled by the caller, force closed, cleared,
  or the server restarted. A failed job's `error` never repeats the prompt.
- Errors have the shape `{ code, message }`: 400 `invalid_request`, 401 `unauthorized`, 404
  `not_found`, 503 `queue_full`.
- **On the VPS, `WICKET_URL` is the public address**, `<production origin>/wicket-api`, not
  `127.0.0.1:8808`: under the box's rootless Docker a container can't reach the host's loopback.

## Files you OWN

- `api/src/details/` (a page-text cache, the prompt and schema, the field merge),
  `api/src/routes/saved.ts` (or a new `api/src/routes/fill.ts`), `api/src/lib/wicket.ts` (new),
  `api/src/config.ts` (the two settings)
- `web/src/components/ApartmentForm.tsx`, `web/src/pages/SavedPage.tsx`, `web/src/api.ts`, their
  tests
- `docs/architecture.md`, `docs/decisions.md`, `docs/owner-setup.md` (the two settings),
  `.env.example`
- `corpus/briefs/`, `corpus/log.md`, `corpus/wiki/status.md`

## What to do

1. **Settings.** `WICKET_URL` and `WICKET_TOKEN` (a secret). Without both, the button is not
   shown and the routes answer 404; the app works as before. The token stays on the server: the
   browser talks to ro-housing's API, never to Wicket. In `docs/owner-setup.md`: on the VPS
   `WICKET_URL` is `<production origin>/wicket-api` (the container can't reach the box's
   loopback), and the token goes in vps-deploy's `secrets/ro-housing.env` beside the Ward key.
2. **The page text.** The draft response carries no HTML, and the owner wants the sites asked
   gently, so Fetch details keeps the extracted page text (the research's input: URL, `<title>`,
   Open Graph and description tags, JSON-LD and storia's `__NEXT_DATA__` up to 6,000 characters
   each, then the visible text one node per line, up to 12,000 characters) in a small in-memory
   cache keyed by the normalized URL, for about an hour. "Fill the gaps" reads it from there and
   never fetches the page again; when it has expired, the form says to press Fetch details
   first.
3. **Starting a job.** `POST /api/saved/fill { url, missing: [fields] }` builds the messages (a
   system message naming the fields with their Romanian words and conventions, as in the
   research, and "when the page does not give a field, return null. Never guess") with
   `format` a JSON schema where every field is nullable and partitioning is limited to its four
   values, posts to Wicket with exactly `{ messages, format }` and nothing else, and answers with
   the job's `id`, `ticket`, `nowServing`, `position` and `status`. Only the fields the draft
   still has empty are asked for. A 503 `queue_full` reaches the form as "Wicket's queue is full;
   try again in a while"; any other refusal as a one-line notice, and the form is left as it was.
4. **Waiting.** `GET /api/saved/fill/:id` passes Wicket's long poll through (`?wait=25`, never
   more); the form polls it again as soon as each answer comes back and shows "You're number N,
   now serving M" while queued and "Reading the page…" while running. It keeps polling until the
   job finishes, so the answer is read well inside Wicket's 10 minutes (the tabs stay mounted, so
   switching tabs doesn't stop it). A 404 from Wicket is passed on as `cancelled` with "Wicket lost
   the job; press Fill the gaps again". `DELETE /api/saved/fill/:id` cancels. ro-housing only
   lets a caller see and cancel jobs it started (it remembers the ids it created).
5. **Merging.** On `done`, the server parses `result.text` as JSON, drops anything outside the
   requested fields, runs the values through the same sanity ranges as the extractor (`sane()`),
   and returns them. The form fills a field only if it is still empty at that moment (the owner
   may have typed meanwhile) and marks it "from AI"; editing it turns the mark to "edited", as
   for "from page". Nothing is saved until Save. `raw_json` records which fields came from the
   model and its name (`result.model`).
6. **Where the button is.** On the draft, beside the "N of 10 fields read" line, shown only when
   at least one field is empty and the draft was read from a page. Disabled on a blocked draft
   (a bot-check page has no listing on it, and the research saw a model invent a flat there).
   `failed` and `cancelled` show a one-line notice and leave the form as it was; a cancelled
   job's notice says why, from its `error` (cancelled here, force closed or cleared on Wicket's
   page, or Wicket restarted).
7. **Never automatic.** Refresh, Fetch details and the search adapters never call Wicket.
8. **Tests:** the merge (only empty fields, sanity ranges, unknown keys dropped), the cache
   expiry, the routes with Wicket stubbed (queued, running, done, failed, cancelled with its
   reason, Wicket's 404 read as cancelled, 503 `queue_full`, the request body holding only
   `messages` and `format`, `wait` never above 25, 404 when off), and the form (the ticket line,
   Cancel, "from AI" marks, a typed value not overwritten).
9. **Docs:** a decision ("A model only on request, through Wicket"), the flow in
   `architecture.md`, the two settings in `owner-setup.md` and `.env.example`.

## Acceptance

- With Wicket off, the app and its tests behave exactly as before.
- With Wicket stubbed, a draft with empty fields shows the button; pressing it shows the queue
  line, then fills only the empty fields, each marked "from AI", and Save stores them.
- No Wicket call from Refresh or Fetch details.
- `npx tsc --noEmit`/`npx tsc -b` and `npx vitest run` pass in both packages.

## Outcome (2026-11-05)

Built as specified, against stubs: Wicket's API page matched the contract. Server:
`api/src/lib/wicket.ts`, `api/src/details/pageText.ts`, `api/src/details/fill.ts`,
`api/src/routes/fill.ts` (registered only with both settings); `sane()` and `textLines()` are now
exported from `extract.ts`. Web: `web/src/components/FillGaps.tsx` beside the "N of 10 fields
read" line, the "from AI" mark in `ApartmentForm.tsx`. The blocked case shows the button
disabled rather than hiding it. Not deployed: the owner adds `WICKET_TOKEN` to vps-deploy's
`secrets/ro-housing.env` (vps-deploy's stack already passes it and `WICKET_URL`), then
`node cli.ts ro-housing all`.
