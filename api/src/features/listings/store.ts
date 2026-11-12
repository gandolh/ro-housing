import type { ScrapedListing } from "../../adapters/types.ts";
import { db } from "../../db/index.ts";

export interface ListingRow {
  id: number;
  source_id: string;
  source_uid: string;
  url: string;
  title: string | null;
  price_eur: number | null;
  price_plus_vat: number | null;
  rooms: number | null;
  sqm: number | null;
  location: string | null;
  first_seen: number;
  last_seen: number;
  raw_json: string | null;
}

const upsertListingStmt = db.prepare(`
  INSERT INTO listings (source_id, source_uid, url, title, price_eur, price_plus_vat, rooms, sqm, location, first_seen, last_seen, raw_json)
  VALUES (@source_id, @source_uid, @url, @title, @price_eur, @price_plus_vat, @rooms, @sqm, @location, @now, @now, @raw_json)
  ON CONFLICT(source_id, source_uid) DO UPDATE SET
    url = excluded.url,
    title = excluded.title,
    price_eur = excluded.price_eur,
    price_plus_vat = excluded.price_plus_vat,
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

export function upsertListingWithSnapshot(sourceId: string, scraped: ScrapedListing, now: number): void {
  const row = upsertListingStmt.get({
    source_id: sourceId,
    source_uid: scraped.sourceUid,
    url: scraped.url,
    title: scraped.title ?? null,
    price_eur: scraped.priceEur ?? null,
    price_plus_vat: scraped.pricePlusVat === undefined ? null : Number(scraped.pricePlusVat),
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
  sort: "price" | "sqm" | "firstSeen" | "lastSeen";
  order: "asc" | "desc";
  source?: string;
}): ListingWithHistory[] {
  const sortCol = {
    price: "price_eur",
    sqm: "sqm",
    firstSeen: "first_seen",
    lastSeen: "last_seen",
  }[opts.sort];
  const where = opts.source ? `WHERE source_id = ?` : "";
  const params = opts.source ? [opts.source] : [];
  const rows = db
    .prepare(`SELECT * FROM listings ${where} ORDER BY ${sortCol} ${opts.order === "asc" ? "ASC" : "DESC"} NULLS LAST`)
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
