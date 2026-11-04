# Task 18: "Fill the gaps" on the Saved draft, through Wicket

Filed 2026-11-04 from the owner's grill. **Write only: not built yet.** It waits for Wicket, the
estate's LLM queue service, which another agent is building as this is written. Build it after
brief 17 (the app on the VPS, where Wicket runs).

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
> `?wait=25` long-polls) → `{ id, ticket, nowServing, position, status: "queued"|"running"|"done"|"failed"|"cancelled", result?: { text, model, backup }, error? }`.
> `DELETE {WICKET_URL}/v1/jobs/:id` cancels the caller's own job. Wicket picks the model (Ollama
> Cloud, falling back to gemma3:1b on the VPS) and runs one job at a time, first come first
> served.

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
   browser talks to ro-housing's API, never to Wicket.
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
   values, posts to Wicket, and answers with the job's `id`, `ticket`, `nowServing`, `position`
   and `status`. Only the fields the draft still has empty are asked for.
4. **Waiting.** `GET /api/saved/fill/:id` passes Wicket's long poll through (`?wait=25`); the form
   polls it and shows "You're number N, now serving M" while queued and "Reading the page…"
   while running. `DELETE /api/saved/fill/:id` cancels. ro-housing only lets a caller see and
   cancel jobs it started (it remembers the ids it created).
5. **Merging.** On `done`, the server parses `result.text` as JSON, drops anything outside the
   requested fields, runs the values through the same sanity ranges as the extractor (`sane()`),
   and returns them. The form fills a field only if it is still empty at that moment (the owner
   may have typed meanwhile) and marks it "from AI"; editing it turns the mark to "edited", as
   for "from page". Nothing is saved until Save. `raw_json` records which fields came from the
   model and its name (`result.model`, and `backup` when Wicket fell back).
6. **Where the button is.** On the draft, beside the "N of 10 fields read" line, shown only when
   at least one field is empty and the draft was read from a page. Disabled on a blocked draft
   (a bot-check page has no listing on it, and the research saw a model invent a flat there).
   `failed` and `cancelled` show a one-line notice and leave the form as it was.
7. **Never automatic.** Refresh, Fetch details and the search adapters never call Wicket.
8. **Tests:** the merge (only empty fields, sanity ranges, unknown keys dropped), the cache
   expiry, the routes with Wicket stubbed (queued, running, done, failed, cancelled, 404 when
   off), and the form (the ticket line, Cancel, "from AI" marks, a typed value not overwritten).
9. **Docs:** a decision ("A model only on request, through Wicket"), the flow in
   `architecture.md`, the two settings in `owner-setup.md` and `.env.example`.

## Acceptance

- With Wicket off, the app and its tests behave exactly as before.
- With Wicket stubbed, a draft with empty fields shows the button; pressing it shows the queue
  line, then fills only the empty fields, each marked "from AI", and Save stores them.
- No Wicket call from Refresh or Fetch details.
- `npx tsc --noEmit`/`npx tsc -b` and `npx vitest run` pass in both packages.
