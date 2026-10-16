import { db } from './index.ts';
import type { SavedInput } from '../routes/saved-input.ts';

export interface SavedRow {
  id: number;
  url: string;
  site: string;
  title: string | null;
  price_eur: number | null;
  rooms: number | null;
  sqm: number | null;
  floor: number | null;
  floors_total: number | null;
  year_built: number | null;
  location: string | null;
  partitioning: string | null;
  image_url: string | null;
  notes: string | null;
  raw_json: string | null;
  fetched_at: number | null;
  saved_at: number;
  updated_at: number;
}

function columns(input: SavedInput, site: string) {
  return {
    url: input.url,
    site,
    title: input.title,
    price_eur: input.priceEur,
    rooms: input.rooms,
    sqm: input.sqm,
    floor: input.floor,
    floors_total: input.floorsTotal,
    year_built: input.yearBuilt,
    location: input.location,
    partitioning: input.partitioning,
    image_url: input.imageUrl,
    notes: input.notes,
  };
}

export function listSaved(): SavedRow[] {
  return db.prepare(`SELECT * FROM saved ORDER BY saved_at DESC`).all() as SavedRow[];
}

export function getSaved(id: number): SavedRow | undefined {
  return db.prepare(`SELECT * FROM saved WHERE id = ?`).get(id) as SavedRow | undefined;
}

export function getSavedByUrl(url: string): SavedRow | undefined {
  return db.prepare(`SELECT * FROM saved WHERE url = ?`).get(url) as SavedRow | undefined;
}

const insertStmt = db.prepare(`
  INSERT INTO saved (url, site, title, price_eur, rooms, sqm, floor, floors_total, year_built,
                     location, partitioning, image_url, notes, raw_json, fetched_at, saved_at, updated_at)
  VALUES (@url, @site, @title, @price_eur, @rooms, @sqm, @floor, @floors_total, @year_built,
          @location, @partitioning, @image_url, @notes, @raw_json, @fetched_at, @now, @now)
  RETURNING *
`);

/** Throws better-sqlite3's SQLITE_CONSTRAINT_UNIQUE when the URL is saved. */
export function insertSaved(
  input: SavedInput,
  site: string,
  scrape: { rawJson: string; fetchedAt: number } | undefined,
  now: number,
): SavedRow {
  return insertStmt.get({
    ...columns(input, site),
    raw_json: scrape?.rawJson ?? null,
    fetched_at: scrape?.fetchedAt ?? null,
    now,
  }) as SavedRow;
}

const updateStmt = db.prepare(`
  UPDATE saved SET url = @url, site = @site, title = @title, price_eur = @price_eur,
    rooms = @rooms, sqm = @sqm, floor = @floor, floors_total = @floors_total,
    year_built = @year_built, location = @location, partitioning = @partitioning,
    image_url = @image_url, notes = @notes, updated_at = @now
  WHERE id = @id
  RETURNING *
`);

export function updateSaved(
  id: number,
  input: SavedInput,
  site: string,
  now: number,
): SavedRow | undefined {
  return updateStmt.get({ ...columns(input, site), id, now }) as SavedRow | undefined;
}

export function deleteSaved(id: number): boolean {
  return db.prepare(`DELETE FROM saved WHERE id = ?`).run(id).changes > 0;
}
