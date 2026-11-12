import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { wardClientOptionsFromEnv, type WardClientOptions } from "../vendor/ward/ward-auth.js";

/** The repository's root: `api/src/` and `api/dist/` are both two levels below it. */
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** The repository's git-ignored `.env`, found from this file and never from the working directory. */
export const ENV_FILE = `${REPO_ROOT}.env`;

/** The API's prefix as the browser sees it. Caddy (and the Vite dev proxy)
 *  strip it before the request reaches the server, and the server strips it
 *  too when reached directly, so one build works both ways. It is also the
 *  session cookie's path. */
export const API_PREFIX = "/ro-housing-api";
/** Where the web app is served, with a trailing slash (web/vite.config.ts). */
export const WEB_BASE = "/ro-housing/";
/** Where the sign-in routes sit, Fastify-side. */
export const AUTH_ROUTE_PREFIX = "/auth";
/** Ward's callback as the browser reaches it, under the API prefix. */
export const WARD_CALLBACK_PATH = `${API_PREFIX}${AUTH_ROUTE_PREFIX}/ward/callback`;
/** The session cookie. Unique in the estate: the apps share one origin. */
export const SESSION_COOKIE = "ro_housing_session";
/** The Vite dev server, the address the README opens. */
export const DEFAULT_PUBLIC_ORIGIN = "http://127.0.0.1:5173";
export const DEFAULT_PORT = 3000;

/** The server's settings, read once at start from the environment (and the
 *  repo root's `.env`, see `loadEnvFile`). This file is the only reader of the
 *  environment. The database and the issues folder are read where they are
 *  opened (`databasePath`, `issuesDir`), because the database opens when its
 *  module is imported. */
export interface Config {
  /** `HOST`: the address to listen on. `0.0.0.0` in the container. */
  host: string;
  port: number;
  /** `WEB_ORIGINS` as given (comma-separated), or undefined: the web app's own
   *  origins, which the Origin check lets through besides the public one. */
  webOrigins: string | undefined;
  /** `CHROMIUM_DISABLE_DEV_SHM=1`: the container's Chromium writes the memory
   *  it would put in `/dev/shm` (Docker's 64 MB default) to `/tmp`. */
  chromiumDisableDevShm: boolean;
  /** `PUBLIC_ORIGIN`: the app's origin as the browser sees it, bare. The
   *  sign-in routes refuse a POST whose Origin is not this one; the Host and
   *  Origin guards let it through. */
  publicOrigin: string;
  /** "Sign in with Ward", or undefined when `WARD_OIDC_ISSUER` is unset (local
   *  accounts only). `clientKey` is a secret: never log it. */
  ward: WardClientOptions | undefined;
  /** `AUTH_TRUSTED_PROXIES`, comma-separated: peers besides loopback whose
   *  `X-Forwarded-For` the login lockout believes. Empty locally; in the
   *  container, the range Caddy reaches it from. */
  trustedProxies: string[];
  /** "Fill the gaps" through Wicket, the estate's LLM queue, or undefined when
   *  `WICKET_URL` or `WICKET_TOKEN` is unset (the button is not shown). `token`
   *  is a secret: never log it, never send it to the browser. */
  wicket: { url: string; token: string } | undefined;
}

/** The environment can't run the server. The message names each variable at fault. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const set = (value: string | undefined): string | undefined => {
  const v = value?.trim();
  return v ? v : undefined;
};

/** The settings from `env`, or a `ConfigError` naming every bad variable.
 *  Nothing here talks to Ward, so the API starts while Ward is down. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];

  const portText = set(env.PORT);
  const port = portText === undefined ? DEFAULT_PORT : Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push("PORT must be a port number (1-65535).");
  }

  const publicOrigin = set(env.PUBLIC_ORIGIN) ?? DEFAULT_PUBLIC_ORIGIN;
  if (!URL.canParse(publicOrigin) || new URL(publicOrigin).origin !== publicOrigin) {
    problems.push("PUBLIC_ORIGIN must be a bare origin such as https://example.com: no path and no trailing slash.");
  }

  let ward: WardClientOptions | undefined;
  try {
    ward = wardClientOptionsFromEnv(env);
  } catch (error) {
    problems.push(
      `${error instanceof Error ? error.message : String(error)}. Set all of them, or leave WARD_OIDC_ISSUER empty for local accounts only.`,
    );
  }
  if (ward && (!URL.canParse(ward.redirectUri) || new URL(ward.redirectUri).pathname !== WARD_CALLBACK_PATH)) {
    problems.push(
      `WARD_OIDC_REDIRECT_URI must be the callback as the browser reaches it: the app's origin, then ${WARD_CALLBACK_PATH}.`,
    );
  }

  const wicketUrl = set(env.WICKET_URL);
  const wicketToken = set(env.WICKET_TOKEN);
  if (wicketUrl && !/^https?:$/.test(URL.canParse(wicketUrl) ? new URL(wicketUrl).protocol : "")) {
    problems.push("WICKET_URL must be Wicket's API base, such as https://example.com/wicket-api.");
  }

  if (problems.length > 0) throw new ConfigError(problems.join("\n"));
  return {
    host: set(env.HOST) ?? "127.0.0.1",
    port,
    webOrigins: set(env.WEB_ORIGINS),
    chromiumDisableDevShm: env.CHROMIUM_DISABLE_DEV_SHM === "1",
    publicOrigin,
    ward,
    trustedProxies: (env.AUTH_TRUSTED_PROXIES ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== ""),
    wicket: wicketUrl && wicketToken ? { url: wicketUrl, token: wicketToken } : undefined,
  };
}

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

/** What the seed command was given in the environment; either may be undefined,
 *  and the command then asks on the terminal. The password is taken as typed,
 *  spaces and all. */
export function loadSeedConfig(env: NodeJS.ProcessEnv = process.env): {
  username: string | undefined;
  password: string | undefined;
} {
  return { username: set(env.SEED_USERNAME), password: env.SEED_PASSWORD || undefined };
}

/** Fills in what the environment leaves unset from the repo root's `.env`
 *  (git-ignored), which Ward's local seed writes its `WARD_OIDC_*` values
 *  into. Call it before anything reads the settings, and before the database
 *  module is imported. No `.env` is fine; any other error is thrown. */
export function loadEnvFile(path: string = ENV_FILE): void {
  try {
    process.loadEnvFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
