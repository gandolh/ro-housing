import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  deleteSaved,
  getSavedByUrl,
  insertSaved,
  listSaved,
  updateSaved,
  type SavedRow,
} from '../db/saved.ts';
import {
  DETAIL_FIELDS,
  extractDetails,
  type DetailFields,
} from '../details/extract.ts';
import { fetchListingPage, PageProblem } from '../details/fetchPage.ts';
import { assertPublicHost, normalizeListingUrl, siteOf } from '../details/url.ts';
import { parseSavedInput } from './saved-input.ts';

function toApi(r: SavedRow) {
  return {
    id: r.id,
    url: r.url,
    site: r.site,
    title: r.title,
    priceEur: r.price_eur,
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

const EMPTY_DRAFT = Object.fromEntries(
  DETAIL_FIELDS.map((k) => [k, null]),
) as unknown as DetailFields;

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

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'SQLITE_CONSTRAINT_UNIQUE';
}

function parseId(raw: string, reply: FastifyReply): number | undefined {
  const id = Number(raw);
  if (Number.isInteger(id) && id > 0) return id;
  void reply.code(400).send({ error: 'bad id' });
  return undefined;
}

export async function savedRoutes(app: FastifyInstance): Promise<void> {
  // Reads one listing page into a draft. Saves nothing: the user confirms or
  // edits the draft and POSTs it to /api/saved.
  app.post<{ Body: { url?: string } }>('/api/saved/scrape', async (req, reply) => {
    const url = normalizeListingUrl(req.body?.url ?? '');
    if (!url) {
      return reply
        .code(400)
        .send({ error: 'Paste a full link, starting with http:// or https://' });
    }
    const site = siteOf(url);
    const existing = getSavedByUrl(url);
    const base = { url, site, existing: existing ? toApi(existing) : null };
    if (existing) {
      return { ...base, draft: null, found: [], via: null, problem: null };
    }

    try {
      await assertPublicHost(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('local addresses')) {
        return reply.code(400).send({ error: 'That link points to a local address.' });
      }
      return {
        ...base,
        draft: EMPTY_DRAFT,
        found: [],
        via: null,
        problem: { kind: 'unreachable', message: `Could not find the site (${msg}).` },
      };
    }

    try {
      const page = await fetchListingPage(url);
      const ex = extractDetails(page.html, url);
      const fetchedAt = Date.now();
      remember(
        url,
        { via: page.via, fields: ex.fields, sources: ex.sources, description: ex.description },
        fetchedAt,
      );
      return { ...base, draft: ex.fields, found: ex.found, via: page.via, problem: null };
    } catch (err) {
      if (!(err instanceof PageProblem)) throw err;
      req.log.warn({ url, kind: err.kind, msg: err.message }, 'listing page not read');
      return {
        ...base,
        draft: EMPTY_DRAFT,
        found: [],
        via: null,
        problem: { kind: err.kind, message: err.message },
      };
    }
  });

  app.get('/api/saved', async () => listSaved().map(toApi));

  app.post('/api/saved', async (req, reply) => {
    const parsed = parseSavedInput(req.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const input = parsed.value;
    try {
      const row = insertSaved(input, siteOf(input.url), recentScrapes.get(input.url), Date.now());
      recentScrapes.delete(input.url);
      return reply.code(201).send(toApi(row));
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ error: 'This link is already saved.' });
      }
      throw err;
    }
  });

  app.put<{ Params: { id: string } }>('/api/saved/:id', async (req, reply) => {
    const id = parseId(req.params.id, reply);
    if (id === undefined) return reply;
    const parsed = parseSavedInput(req.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    try {
      const row = updateSaved(id, parsed.value, siteOf(parsed.value.url), Date.now());
      if (!row) return reply.code(404).send({ error: 'not found' });
      return toApi(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ error: 'Another saved apartment has this link.' });
      }
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/api/saved/:id', async (req, reply) => {
    const id = parseId(req.params.id, reply);
    if (id === undefined) return reply;
    if (!deleteSaved(id)) return reply.code(404).send({ error: 'not found' });
    return reply.code(204).send();
  });
}
