import type { FastifyInstance } from 'fastify';

/** The names this machine answers to. A page that rebinds its own name to
 *  127.0.0.1 still sends that name in Host, so it is not among them. */
export const DEFAULT_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

/** Lowercases a hostname and puts an IPv6 address in brackets, the way it
 *  appears in a Host header (`::1` in `HOST` is `[::1]` in Host). */
function normalizeHostname(name: string): string {
  const lower = name.trim().toLowerCase();
  return lower.includes(':') && !lower.startsWith('[') ? `[${lower}]` : lower;
}

/** The allowed hostnames: the defaults, plus `HOST` when it binds the API to
 *  another address (one on the LAN), so that address keeps working. */
export function allowedHostnames(
  bindHost: string | undefined = process.env.HOST,
): Set<string> {
  const names = new Set(DEFAULT_HOSTNAMES);
  if (bindHost && bindHost.trim().length > 0) names.add(normalizeHostname(bindHost));
  return names;
}

/** The hostname in a Host header, without the port: `[::1]:3000` gives
 *  `[::1]`, `localhost:3000` gives `localhost`. Undefined when the header is
 *  missing, empty or not shaped like `name[:port]`. */
export function hostnameOf(host: string | undefined): string | undefined {
  if (host === undefined) return undefined;
  const m = /^(\[[0-9a-f:.]+\]|[^\s:[\]/@]+)(?::\d*)?$/i.exec(host.trim());
  return m?.[1]?.toLowerCase();
}

/** Only the hostname is compared, so moving the API or Vite to another port
 *  needs no change here. */
export function hostAllowed(host: string | undefined, allowed: ReadonlySet<string>): boolean {
  const name = hostnameOf(host);
  return name !== undefined && allowed.has(name);
}

/** Refuses every request whose Host is not this machine, before any route
 *  runs. This closes DNS rebinding: a hostile page that points its own name at
 *  127.0.0.1 makes same-origin requests, which carry no Origin header and pass
 *  `refuseOtherOrigins`, but its Host header still names the hostile site.
 *  Call this on the root instance before the routes are registered. */
export function refuseOtherHosts(
  app: FastifyInstance,
  allowed: ReadonlySet<string> = allowedHostnames(),
): void {
  app.addHook('onRequest', async (req, reply) => {
    if (hostAllowed(req.headers.host, allowed)) return;
    req.log.warn({ host: req.headers.host, url: req.url }, 'refused another host');
    return reply.code(403).send({ error: 'requests for other host names are refused' });
  });
}
