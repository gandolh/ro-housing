import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { issuesDir, type Config } from "./config.ts";
import { stripApiPrefix } from "./lib/api-prefix.ts";
import type { WicketClient } from "./lib/wicket.ts";
import { auth } from "./plugins/auth.ts";
import { errors } from "./plugins/errors.ts";
import { allowedHostnames, hostGuard } from "./plugins/host-guard.ts";
import { originGuard, webOrigins } from "./plugins/origin-guard.ts";
import { healthRoutes } from "./features/health/index.ts";
import { issuesRoutes } from "./features/issues/index.ts";
import { listingsRoutes } from "./features/listings/index.ts";
import { refreshRoutes } from "./features/refresh/index.ts";
import { fillRoutes, savedRoutes } from "./features/saved/index.ts";
import { sourcesRoutes } from "./features/sources/index.ts";

/** Fastify's options that belong to the process: server.ts sets them, a test leaves them out. */
type ServerOptions = Pick<FastifyServerOptions, "logger" | "keepAliveTimeout">;

export interface BuildAppOptions {
  server?: ServerOptions;
  /** Wicket, for "Fill the gaps"; without it those routes are 404s and the
   *  draft has no button. server.ts builds it from `WICKET_URL` and `WICKET_TOKEN`;
   *  a test passes a stand-in. */
  wicket?: WicketClient;
}

/**
 * The API, ready and not listening. It registers in a fixed order: the error handler, then three guards
 * before any route runs, then the routes.
 *
 * 1. the error handler (plugins/errors.ts), first, so every plugin below answers through it;
 * 2. the `Host` check (plugins/host-guard.ts): this machine's names, `HOST` and the public origin's
 *    host; anything else is a rebound name and gets 403;
 * 3. the `Origin` check (plugins/origin-guard.ts): no `Origin`, the Vite dev origins (or `WEB_ORIGINS`)
 *    and the public origin; another website gets 403;
 * 4. sign-in (plugins/auth.ts): every `/api` route but the health check needs a session.
 *
 * Paths: the API is `/api/*` and sign-in `/auth/*`; the browser reaches both under `/ro-housing-api`,
 * which is stripped (see lib/api-prefix.ts).
 */
export async function buildApp(config: Config, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    ...options.server,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/"),
  });

  await app.register(errors);
  await app.register(hostGuard, { allowed: allowedHostnames(config.host, config.publicOrigin) });
  await app.register(originGuard, { allowed: webOrigins(config.webOrigins, config.publicOrigin) });
  await app.register(auth, {
    publicOrigin: config.publicOrigin,
    ward: config.ward,
    trustedProxies: config.trustedProxies,
  });

  await app.register(healthRoutes);
  await app.register(sourcesRoutes);
  await app.register(listingsRoutes);
  await app.register(refreshRoutes);
  await app.register(issuesRoutes, { dir: issuesDir() });
  await app.register(savedRoutes, { fillable: options.wicket !== undefined });
  if (options.wicket) await app.register(fillRoutes, { wicket: options.wicket });
  return app;
}
