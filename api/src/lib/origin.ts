import type { FastifyInstance } from 'fastify';

/** The web app's own origins: Vite on its fixed port, under either name the
 *  owner might type. Requests from the app arrive through Vite's proxy, which
 *  rewrites Host but passes the browser's Origin header on unchanged. */
export const DEFAULT_WEB_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

/** The allowed origins: `WEB_ORIGINS` (comma-separated) when set, else the
 *  defaults. A trailing slash is dropped, since browsers never send one. */
export function webOrigins(env: string | undefined = process.env.WEB_ORIGINS): Set<string> {
  const list = env
    ?.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);
  return new Set(list && list.length > 0 ? list : DEFAULT_WEB_ORIGINS);
}

/** A request without an Origin header (curl, a same-origin GET through the
 *  proxy) passes; one that names another origin, including "null", does not. */
export function originAllowed(
  origin: string | undefined,
  allowed: ReadonlySet<string>,
): boolean {
  return origin === undefined || allowed.has(origin);
}

/** Refuses every request whose Origin is another website's, before any route
 *  runs. A form post from another page needs no CORS preflight, so leaving out
 *  the CORS headers alone would not stop it. Call this on the root instance
 *  before the routes are registered, so every route inherits the hook. */
export function refuseOtherOrigins(
  app: FastifyInstance,
  allowed: ReadonlySet<string> = webOrigins(),
): void {
  app.addHook('onRequest', async (req, reply) => {
    if (originAllowed(req.headers.origin, allowed)) return;
    req.log.warn({ origin: req.headers.origin, url: req.url }, 'refused another origin');
    return reply.code(403).send({ error: 'requests from other websites are refused' });
  });
}
