import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTER_REGISTRY } from '../adapters/index.ts';
import { addMissingColumns } from './migrate.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', '..', 'data', 'ro-housing.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
addMissingColumns(db);

const DEFAULT_ENABLED = new Set(['imobiliare', 'storia']);

const seed = db.prepare(
  `INSERT OR IGNORE INTO sources (id, display_name, search_url, enabled) VALUES (?, ?, NULL, ?)`,
);
for (const a of Object.values(ADAPTER_REGISTRY)) {
  seed.run(a.id, a.displayName, DEFAULT_ENABLED.has(a.id) ? 1 : 0);
}

// One-shot migration: DBs from before the per-source `enabled` flag existed
// were seeded with enabled=0 for every source. Bump PRAGMA user_version and
// apply current defaults to rows that have never been touched (last_run_at IS
// NULL). Rows the user has actually run keep their setting.
const currentVersion = db.pragma('user_version', { simple: true }) as number;
if (currentVersion < 1) {
  const applyDefaults = db.prepare(
    `UPDATE sources SET enabled = 1 WHERE id = ? AND last_run_at IS NULL`,
  );
  for (const id of DEFAULT_ENABLED) {
    applyDefaults.run(id);
  }
  db.pragma('user_version = 1');
}
