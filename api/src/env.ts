import { REPO_ROOT } from "./paths.ts";

/** Fills in what the environment leaves unset from the repo root's `.env`
 *  (git-ignored), which Ward's local seed writes its `WARD_OIDC_*` values
 *  into. Imported first by the server and the seed, before the database
 *  module reads `RO_HOUSING_DB`. No `.env` is fine. */
try {
  process.loadEnvFile(`${REPO_ROOT}.env`);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}
