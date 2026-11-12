import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createWardClient, wardAuth } from "../../vendor/ward/ward-auth.js";
import { API_PREFIX, AUTH_ROUTE_PREFIX, SESSION_COOKIE, WEB_BASE, type Config } from "../config.ts";
import { db } from "../db/index.ts";
import { openAccounts, USER_ROLE } from "./accounts.ts";

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Open with no session: the deploy's health check. */
const PUBLIC_ROUTES: readonly string[] = ["GET /api/health"];

export type AuthOptions = Pick<Config, "publicOrigin" | "ward" | "trustedProxies">;

/**
 * Sign-in, as the vendored ward-auth plugin: every `/api` route but the health check needs a session.
 * Sign-in is a local account made by `npm run seed`, or "Sign in with Ward" when the `WARD_OIDC_*`
 * settings are set. No sign-up and no rename. A session may write: there is no other client. Wrapped in
 * `fastify-plugin`, so the session check covers every route registered after it.
 */
const authentication: FastifyPluginAsync<AuthOptions> = async (app, options) => {
  const accounts = openAccounts(db);
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
};

export const auth = fp(authentication, { name: "auth" });
