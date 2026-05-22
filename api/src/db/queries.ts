import { db } from './index.ts';
import type { ScrapedListing } from '../adapters/types.ts';

export interface SourceRow {
  id: string;
  display_name: string;
  search_url: string | null;
  enabled: number;
  last_run_at: number | null;
  last_run_ok: number | null;
}

export interface ListingRow {
  id: number;
  source_id: string;
  source_uid: string;
  url: string;
  title: string | null;
  price_eur: number | null;
  rooms: number | null;
  sqm: number | null;
  location: string | null;
  first_seen: number;
  last_seen: number;
  raw_json: string | null;
}

export function listSources(): SourceRow[] {
  return db.prepare(`SELECT * FROM sources ORDER BY id`).all() as SourceRow[];
}

export function getSource(id: string): SourceRow | undefined {
  return db.prepare(`SELECT * FROM sources WHERE id = ?`).get(id) as
    | SourceRow
    | undefined;
}

export function updateSource(
  id: string,
  patch: { searchUrl?: string | null; enabled?: boolean },
): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if ('searchUrl' in patch) {
    fields.push('search_url = ?');
    values.push(patch.searchUrl ?? null);
  }
  if ('enabled' in patch) {
    fields.push('enabled = ?');
    values.push(patch.enabled ? 1 : 0);
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE sources SET ${fields.join(', ')} WHERE id = ?`).run(
    ...values,
  );
}

export function markSourceRun(id: string, ok: boolean): void {
  db.prepare(
    `UPDATE sources SET last_run_at = ?, last_run_ok = ? WHERE id = ?`,
  ).run(Date.now(), ok ? 1 : 0, id);
}

const upsertListingStmt = db.prepare(`
  INSERT INTO listings (source_id, source_uid, url, title, price_eur, rooms, sqm, location, first_seen, last_seen, raw_json)
  VALUES (@source_id, @source_uid, @url, @title, @price_eur, @rooms, @sqm, @location, @now, @now, @raw_json)
  ON CONFLICT(source_id, source_uid) DO UPDATE SET
    url = excluded.url,
    title = excluded.title,
    price_eur = excluded.price_eur,
    rooms = excluded.rooms,
    sqm = excluded.sqm,
    location = excluded.location,
    last_seen = excluded.last_seen,
    raw_json = excluded.raw_json
  RETURNING id, price_eur
`);

const insertPriceHistoryStmt = db.prepare(`
  INSERT OR IGNORE INTO price_history (listing_id, observed_at, price_eur)
  VALUES (?, ?, ?)
`);

export function upsertListingWithSnapshot(
  sourceId: string,
  scraped: ScrapedListing,
  now: number,
): void {
  const row = upsertListingStmt.get({
    source_id: sourceId,
    source_uid: scraped.sourceUid,
    url: scraped.url,
    title: scraped.title ?? null,
    price_eur: scraped.priceEur ?? null,
    rooms: scraped.rooms ?? null,
    sqm: scraped.sqm ?? null,
    location: scraped.location ?? null,
    now,
    raw_json: JSON.stringify(scraped.raw),
  }) as { id: number; price_eur: number | null };
  insertPriceHistoryStmt.run(row.id, now, scraped.priceEur ?? null);
}

export interface ListingWithHistory extends ListingRow {
  history: { observed_at: number; price_eur: number | null }[];
}

export function listListings(opts: {
  sort: 'price' | 'sqm' | 'firstSeen' | 'lastSeen';
  order: 'asc' | 'desc';
  source?: string;
}): ListingWithHistory[] {
  const sortCol = {
    price: 'price_eur',
    sqm: 'sqm',
    firstSeen: 'first_seen',
    lastSeen: 'last_seen',
  }[opts.sort];
  const where = opts.source ? `WHERE source_id = ?` : '';
  const params = opts.source ? [opts.source] : [];
  const rows = db
    .prepare(
      `SELECT * FROM listings ${where} ORDER BY ${sortCol} ${opts.order === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`,
    )
    .all(...params) as ListingRow[];
  const historyStmt = db.prepare(
    `SELECT observed_at, price_eur FROM price_history WHERE listing_id = ? ORDER BY observed_at ASC`,
  );
  return rows.map((r) => ({
    ...r,
    history: historyStmt.all(r.id) as {
      observed_at: number;
      price_eur: number | null;
    }[],
  }));
}
