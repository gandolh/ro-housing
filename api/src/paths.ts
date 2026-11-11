import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository's root: `api/src/` is two levels below it. */
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** A path from the environment, resolved against the repo root when relative;
 *  the default when unset or empty. `:memory:` passes through for tests. */
function pathFrom(value: string | undefined, fallback: string): string {
  const v = value?.trim();
  if (!v) return fallback;
  if (v === ":memory:" || isAbsolute(v)) return v;
  return resolve(REPO_ROOT, v);
}

/** The SQLite file: `RO_HOUSING_DB`, else `data/ro-housing.db` at the repo
 *  root. In the container it is `/data/ro-housing.db`, on the volume. */
export function databasePath(env: NodeJS.ProcessEnv = process.env): string {
  return pathFrom(env.RO_HOUSING_DB, join(REPO_ROOT, "data", "ro-housing.db"));
}

/** Where the Report button writes its files: `RO_HOUSING_ISSUES_DIR`, else
 *  `issues/` at the repo root (docs/issues.md). In the container it is
 *  `/data/issues`, on the volume. */
export function issuesDir(env: NodeJS.ProcessEnv = process.env): string {
  return pathFrom(env.RO_HOUSING_ISSUES_DIR, join(REPO_ROOT, "issues"));
}
