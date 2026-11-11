import Fastify, { type FastifyInstance } from "fastify";
import { createWardClient, wardAuth, type Accounts } from "../vendor/ward/ward-auth.js";
import { openAccounts, USER_ROLE } from "./accounts.ts";
import { API_PREFIX, AUTH_ROUTE_PREFIX, SESSION_COOKIE, WEB_BASE, type Config } from "./config.ts";
import { db } from "./db/index.ts";
import { allowedHostnames, refuseOtherHosts } from "./lib/host.ts";
import { refuseOtherOrigins, webOrigins } from "./lib/origin.ts";
import { issuesRoutes } from "./routes/issues.ts";
import { listingsRoutes } from "./routes/listings.ts";
import { refreshRoutes } from "./routes/refresh.ts";
import { savedRoutes } from "./routes/saved.ts";
import { fillRoutes } from "./routes/fill.ts";
import type { WicketClient } from "./lib/wicket.ts";
import { sourcesRoutes } from "./routes/sources.ts";

declare module "fastify" {
  interface FastifyInstance {
    /** The local accounts, for the seed's tests. */
    accounts: Accounts;
  }
}

/** A URL without a leading API prefix, when `/`, `?` or the end follows it;
 *  any other URL as it is. Caddy strips the prefix on the VPS and Vite's proxy
 *  in development; this covers a request that reaches the API directly. */
export function stripApiPrefix(url: string, prefix: string = API_PREFIX): string {
  if (!url.startsWith(prefix)) return url;
  const rest = url.slice(prefix.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Open with no session: the deploy's health check. */
const PUBLIC_ROUTES: readonly string[] = ["GET /api/health"];

export interface AppOptions extends Pick<Config, "publicOrigin" | "ward" | "trustedProxies"> {
  /** `HOST`, which the Host check also answers to. */
  bindHost?: string;
  /** `WEB_ORIGINS`, as given. */
  webOriginsEnv?: string;
  /** Wicket, for "Fill the gaps"; without it those routes are 404s and the
   *  draft has no button. server.ts builds it from `WICKET_URL` and `WICKET_TOKEN`. */
  wicket?: WicketClient;
  logger?: boolean;
}

/**
 * The API, behind three guards, in this order, before any route runs:
 *
 * 1. the `Host` check (lib/host.ts): this machine's names, `HOST` and the
 *    public origin's host; anything else is a rebound name and gets 403;
 * 2. the `Origin` check (lib/origin.ts): no `Origin`, the Vite dev origins
 *    (or `WEB_ORIGINS`) and the public origin; another website gets 403;
 * 3. the vendored ward-auth plugin: every `/api` route but the health check
 *    needs a session. Sign-in is a local account made by `npm run seed`, or
 *    "Sign in with Ward" when the `WARD_OIDC_*` settings are set. No sign-up
 *    and no rename. A session may write: there is no other client.
 *
 * Paths: the API is `/api/*` and sign-in `/auth/*`; the browser reaches both
 * under `/ro-housing-api`, which is stripped (see stripApiPrefix).
 */
export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/"),
  });

  refuseOtherHosts(app, allowedHostnames(options.bindHost, options.publicOrigin));
  refuseOtherOrigins(app, webOrigins(options.webOriginsEnv, options.publicOrigin));

  const accounts = openAccounts(db);
  app.decorate("accounts", accounts);
  // Checks the settings and imports the key now; talks to Ward only on first
  // use, so the API starts while Ward is down.
  const ward = options.ward && (await createWardClient(options.ward));
  await app.register(wardAuth, {
    accounts,
    cookieName: SESSION_COOKIE,
    // Every request that needs the session is under the API prefix.
    cookiePath: API_PREFIX,
    publicOrigin: options.publicOrigin,
    routePrefix: AUTH_ROUTE_PREFIX,
    publicRoutes: PUBLIC_ROUTES,
    // The owner names accounts with the seed; nothing offers a rename.
    allowRename: false,
    isPublic: (request) => {
      const [path = ""] = request.url.split("?");
      // Under /api a session is needed; under /auth the plugin's own list decides.
      if (isUnder(path, "/api") || isUnder(path, AUTH_ROUTE_PREFIX)) return false;
      // Anything else is a 404, not a 401.
      return true;
    },
    trustedProxies: options.trustedProxies,
    ...(ward && {
      ward: {
        client: ward,
        loginPath: `${WEB_BASE}login`,
        settingsPath: `${WEB_BASE}account`,
        afterSignInPath: WEB_BASE,
        roleFor: () => USER_ROLE,
      },
    }),
  });

  app.get("/api/health", async () => ({ ok: true }));
  await app.register(sourcesRoutes);
  await app.register(listingsRoutes);
  await app.register(refreshRoutes);
  await app.register(issuesRoutes);
  await app.register(savedRoutes, { fillable: options.wicket !== undefined });
  if (options.wicket) await app.register(fillRoutes, { wicket: options.wicket });
  return app;
}
