import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addMissingColumns } from './migrate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = readFileSync(join(here, 'schema.sql'), 'utf8');

// schema.sql without the column: the shape of a database made before
// 2026-10-27, with a row in each table.
const OLD_SCHEMA = SCHEMA.split('\n')
  .filter((line) => !line.includes('price_plus_vat'))
  .join('\n');
const OLD_TABLES = `${OLD_SCHEMA}
  INSERT INTO sources (id, display_name) VALUES ('storia', 'storia.ro');
  INSERT INTO listings (source_id, source_uid, url, price_eur, first_seen, last_seen)
    VALUES ('storia', 'x', 'https://www.storia.ro/ro/oferta/x', 92033, 1, 1);
  INSERT INTO saved (url, site, price_eur, saved_at, updated_at)
    VALUES ('https://www.storia.ro/ro/oferta/x', 'storia.ro', 72000, 1, 1);
`;

const columns = (db: Database.Database, table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);

describe('addMissingColumns', () => {
  it('adds price_plus_vat to an old database and keeps its rows', () => {
    const db = new Database(':memory:');
    db.exec(OLD_TABLES);
    // What boot does: the schema (a no-op on existing tables), then this.
    db.exec(SCHEMA);
    addMissingColumns(db);

    expect(columns(db, 'listings')).toContain('price_plus_vat');
    expect(columns(db, 'saved')).toContain('price_plus_vat');
    expect(db.prepare('SELECT price_eur, price_plus_vat FROM listings').get()).toEqual({
      price_eur: 92033,
      price_plus_vat: null,
    });
    expect(db.prepare('SELECT price_eur, price_plus_vat FROM saved').get()).toEqual({
      price_eur: 72000,
      price_plus_vat: null,
    });
  });

  it('is a no-op on the next boot and on a new database', () => {
    const old = new Database(':memory:');
    old.exec(OLD_TABLES);
    addMissingColumns(old);
    expect(() => addMissingColumns(old)).not.toThrow();

    const fresh = new Database(':memory:');
    fresh.exec(SCHEMA);
    expect(() => addMissingColumns(fresh)).not.toThrow();
    expect(columns(fresh, 'listings').filter((c) => c === 'price_plus_vat')).toHaveLength(1);
    expect(columns(fresh, 'saved').filter((c) => c === 'price_plus_vat')).toHaveLength(1);
  });
});
