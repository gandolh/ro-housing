import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { z } from "zod";
import { errorSchema } from "../../lib/error-body.ts";
import { deleteSaved, getSavedByUrl, insertSaved, listSaved, updateSaved, type SavedRow } from "./store.ts";
import { DETAIL_FIELDS, extractDetails, type DetailFields } from "./details/extract.ts";
import { fetchListingPage, PageProblem } from "./details/fetchPage.ts";
import { pageText, pageTexts } from "./details/pageText.ts";
import { assertPublicHost, normalizeListingUrl, siteOf } from "../../lib/url.ts";
import {
  savedInputSchema,
  savedListSchema,
  savedParamsSchema,
  savedSchema,
  SCRAPE_LINK,
  scrapeInputSchema,
  scrapeResultSchema,
} from "./schema.ts";

function toApi(r: SavedRow) {
  return {
    id: r.id,
    url: r.url,
    site: r.site,
    title: r.title,
    priceEur: r.price_eur,
    pricePlusVat: r.price_plus_vat === 1,
    rooms: r.rooms,
    sqm: r.sqm,
    floor: r.floor,
    floorsTotal: r.floors_total,
    yearBuilt: r.year_built,
    location: r.location,
    partitioning: r.partitioning,
    imageUrl: r.image_url,
    notes: r.notes,
    fetchedAt: r.fetched_at,
    savedAt: r.saved_at,
    updatedAt: r.updated_at,
  };
}

const EMPTY_DRAFT = {
  ...Object.fromEntries(DETAIL_FIELDS.map((k) => [k, null])),
  pricePlusVat: null,
} as unknown as DetailFields;

// What the page said, keyed by normalized URL, held until the user saves the
// draft so raw_json records the scrape and not the user's edits. Small and
// in-memory: a restart between Fetch and Save only loses the debugging copy.
const recentScrapes = new Map<string, { rawJson: string; fetchedAt: number }>();
const MAX_RECENT = 50;

function remember(url: string, raw: unknown, fetchedAt: number): void {
  recentScrapes.delete(url);
  recentScrapes.set(url, { rawJson: JSON.stringify(raw), fetchedAt });
  while (recentScrapes.size > MAX_RECENT) {
    const oldest = recentScrapes.keys().next().value;
    if (oldest === undefined) break;
    recentScrapes.delete(oldest);
  }
}

/** What "Fill the gaps" gave for a draft, added to its scrape so raw_json
 *  says which fields came from the model and which model it was. */
export function recordAiFill(url: string, model: string, values: Record<string, unknown>): void {
  const scrape = recentScrapes.get(url);
  if (!scrape || Object.keys(values).length === 0) return;
  const raw = JSON.parse(scrape.rawJson) as Record<string, unknown>;
  const earlier = (raw.ai as { values?: Record<string, unknown> } | undefined)?.values ?? {};
  raw.ai = { model, values: { ...earlier, ...values } };
  scrape.rawJson = JSON.stringify(raw);
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "SQLITE_CONSTRAINT_UNIQUE";
}

/** What this feature takes from `buildApp`. */
export interface SavedOptions {
  /** Whether "Fill the gaps" is on: the draft's button shows only then. */
  fillable?: boolean;
}

export const savedRoutes: FastifyPluginAsyncZod<SavedOptions> = async (app, { fillable = false }) => {
  // Reads one listing page into a draft. Saves nothing: the user confirms or
  // edits the draft and POSTs it to /api/saved.
  app.post(
    "/api/saved/scrape",
    { schema: { body: scrapeInputSchema, response: { 200: scrapeResultSchema, 400: errorSchema } } },
    async (req, reply) => {
      const url = normalizeListingUrl(req.body?.url ?? "");
      if (!url) {
        return reply.code(400).send({ error: SCRAPE_LINK });
      }
      const site = siteOf(url);
      const existing = getSavedByUrl(url);
      const base = { url, site, existing: existing ? toApi(existing) : null, fillable };
      if (existing) {
        return { ...base, draft: null, found: [], via: null, problem: null };
      }

      try {
        await assertPublicHost(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("local addresses")) {
          return reply.code(400).send({ error: "That link points to a local address." });
        }
        return {
          ...base,
          draft: EMPTY_DRAFT,
          found: [],
          via: null,
          problem: { kind: "unreachable", message: `Could not find the site (${msg}).` },
        };
      }

      try {
        const page = await fetchListingPage(url);
        const ex = extractDetails(page.html, url);
        const fetchedAt = Date.now();
        // Kept for "Fill the gaps", which never fetches the page again.
        if (fillable) pageTexts.set(url, pageText(page.html, url));
        remember(
          url,
          { via: page.via, fields: ex.fields, sources: ex.sources, description: ex.description },
          fetchedAt,
        );
        return { ...base, draft: ex.fields, found: ex.found, via: page.via, problem: null };
      } catch (err) {
        if (!(err instanceof PageProblem)) throw err;
        req.log.warn({ url, kind: err.kind, msg: err.message }, "listing page not read");
        return {
          ...base,
          draft: EMPTY_DRAFT,
          found: [],
          via: null,
          problem: { kind: err.kind, message: err.message },
        };
      }
    },
  );

  app.get("/api/saved", { schema: { response: { 200: savedListSchema } } }, async () => listSaved().map(toApi));

  app.post(
    "/api/saved",
    { schema: { body: savedInputSchema, response: { 201: savedSchema, 400: errorSchema, 409: errorSchema } } },
    async (req, reply) => {
      const input = req.body;
      try {
        const row = insertSaved(input, siteOf(input.url), recentScrapes.get(input.url), Date.now());
        recentScrapes.delete(input.url);
        return reply.code(201).send(toApi(row));
      } catch (err) {
        if (isUniqueViolation(err)) {
          return reply.code(409).send({ error: "This link is already saved." });
        }
        throw err;
      }
    },
  );

  app.put(
    "/api/saved/:id",
    {
      schema: {
        params: savedParamsSchema,
        body: savedInputSchema,
        response: { 200: savedSchema, 400: errorSchema, 404: errorSchema, 409: errorSchema },
      },
    },
    async (req, reply) => {
      try {
        const row = updateSaved(req.params.id, req.body, siteOf(req.body.url), Date.now());
        if (!row) return reply.code(404).send({ error: "not found" });
        return toApi(row);
      } catch (err) {
        if (isUniqueViolation(err)) {
          return reply.code(409).send({ error: "Another saved apartment has this link." });
        }
        throw err;
      }
    },
  );

  app.delete(
    "/api/saved/:id",
    { schema: { params: savedParamsSchema, response: { 204: z.null(), 400: errorSchema, 404: errorSchema } } },
    async (req, reply) => {
      if (!deleteSaved(req.params.id)) return reply.code(404).send({ error: "not found" });
      return reply.code(204).send(null);
    },
  );
};
