import type Database from "better-sqlite3";
import { createAccounts, createSqliteStore, seedUsers, type Accounts } from "../vendor/ward/ward-auth.js";

/** Every signed-in user can do everything in the app, so there is one role and
 *  nothing checks it; a user made by a first "Sign in with Ward" gets it too. */
export const USER_ROLE = "user";

/** The accounts, on the app's own SQLite file. The library keeps its own
 *  tables (`auth_users`, `auth_sessions`, `auth_ward_links`, tracked in
 *  `auth_migrations`) and never touches `PRAGMA user_version`, which is the
 *  app's (db/index.ts). */
export function openAccounts(db: Database.Database): Accounts {
  return createAccounts({ store: createSqliteStore(db) });
}

/** Creates a user unless one of that name (case-folded) exists, which is then
 *  left as it is, password included. True when it was created. Throws the
 *  library's policy errors (a password under 8 characters, say). */
export async function seedUser(accounts: Accounts, user: { username: string; password: string }): Promise<boolean> {
  const result = await seedUsers(accounts, [{ ...user, role: USER_ROLE }]);
  return result.created.length > 0;
}
