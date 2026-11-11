// First: fills the environment from the repo root's .env before the database
// module reads RO_HOUSING_DB.
import "./env.ts";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { openAccounts, seedUser } from "./accounts.ts";
import { DB_PATH, db } from "./db/index.ts";

/**
 * Creates one local account. There is no sign-up page: this is how the owner
 * gets in. Anyone else gets in through "Sign in with Ward" once the owner
 * grants them ro-housing there, or by running this again with their name.
 *
 *     cd api && npm run seed                                     (development)
 *     docker compose -f infrastructure/docker-compose.yml exec -it ro-housing-api node dist/seed.js
 *
 * The name and password come from `SEED_USERNAME` and `SEED_PASSWORD` or, for
 * what is missing, a prompt on the terminal (the password is not echoed). An
 * account that already exists under that name is left exactly as it is,
 * password included, so it is safe to run again. The database is the
 * server's: `RO_HOUSING_DB`, else `data/ro-housing.db`.
 */

/** The answer to `question`, hidden when `secret`. Empty with no terminal. */
async function ask(question: string, secret = false): Promise<string> {
  if (!process.stdin.isTTY) return "";
  let muted = false;
  const output = new Writable({
    write(chunk: Buffer | string, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  try {
    const answer = rl.question(question);
    muted = secret;
    // A password is taken as typed, spaces and all, as SEED_PASSWORD is.
    return secret ? await answer : (await answer).trim();
  } finally {
    rl.close();
    if (secret) process.stdout.write("\n");
  }
}

async function main(): Promise<void> {
  const username = process.env.SEED_USERNAME?.trim() || (await ask("Username: "));
  const password = process.env.SEED_PASSWORD || (await ask("Password: ", true));
  if (username === "" || password === "") {
    throw new Error("Set SEED_USERNAME and SEED_PASSWORD in the environment, or run this in a terminal to be asked.");
  }
  try {
    const created = await seedUser(openAccounts(db), { username, password });
    console.log(created ? `Created ${username} in ${DB_PATH}.` : `${username} already exists; left as it was.`);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  // The library's policy errors say what is wrong; nothing here echoes the password.
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
