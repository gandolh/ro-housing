import type Database from 'better-sqlite3';

/** Columns added after the first release. schema.sql has them for a new
 *  database, but CREATE TABLE IF NOT EXISTS leaves an existing table as it
 *  was, so each one is added here when it is missing. Safe to run every boot. */
const ADDED_COLUMNS: { table: string; column: string; type: string }[] = [
  // 2026-10-27: the price is before VAT ("+ TVA").
  { table: 'listings', column: 'price_plus_vat', type: 'INTEGER' },
  { table: 'saved', column: 'price_plus_vat', type: 'INTEGER' },
];

export function addMissingColumns(db: Database.Database): void {
  for (const { table, column, type } of ADDED_COLUMNS) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }
}
