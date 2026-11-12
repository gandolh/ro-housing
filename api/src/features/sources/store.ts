import { db } from "../../db/index.ts";

export interface SourceRow {
  id: string;
  display_name: string;
  search_url: string | null;
  enabled: number;
  last_run_at: number | null;
  last_run_ok: number | null;
  /** Listings the last successful run returned; null after a failed run, and
   *  on rows from before the column. */
  last_run_count: number | null;
}

export function listSources(): SourceRow[] {
  return db.prepare(`SELECT * FROM sources ORDER BY id`).all() as SourceRow[];
}

export function getSource(id: string): SourceRow | undefined {
  return db.prepare(`SELECT * FROM sources WHERE id = ?`).get(id) as SourceRow | undefined;
}

export function updateSource(id: string, patch: { searchUrl?: string | null; enabled?: boolean }): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if ("searchUrl" in patch) {
    fields.push("search_url = ?");
    values.push(patch.searchUrl ?? null);
  }
  if ("enabled" in patch) {
    fields.push("enabled = ?");
    values.push(patch.enabled ? 1 : 0);
  }
  if (fields.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE sources SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

/** Records a run: when, whether it worked and, for one that worked, how many
 *  listings it returned. */
export function markSourceRun(id: string, ok: boolean, count: number | null = null): void {
  db.prepare(`UPDATE sources SET last_run_at = ?, last_run_ok = ?, last_run_count = ? WHERE id = ?`).run(
    Date.now(),
    ok ? 1 : 0,
    ok ? count : null,
    id,
  );
}
