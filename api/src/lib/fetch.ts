import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import zlib from "node:zlib";
import { isPrivateAddress } from "./url.ts";

/**
 * Every page the API reads with plain HTTP goes through `createSession()`: the
 * adapters' search pages and a pasted listing link alike. A pasted link is
 * someone else's choice of address, and the server is on the VPS, so a fetch
 * it makes is a fetch from inside that box.
 *
 * So each hop of a redirect chain is followed by hand and checked before it is
 * requested: http(s) only, and every address the host resolves to must be
 * public (`isPrivateAddress`). The check alone is not enough, because a
 * connection resolves the name again, and a short-lived DNS answer can say
 * public to the check and private to the connection (DNS rebinding). The
 * request therefore goes through `node:http` / `node:https` with a `lookup`
 * option (`vettingLookup`) that replaces the connection's own name resolution:
 * it resolves, refuses unless every address is public, and hands the socket
 * only those. TLS still checks the certificate against the host name. A
 * literal IP host never reaches `lookup` (there is nothing to resolve, so
 * nothing to rebind); the check before the hop has judged it.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** The whole redirect chain, body included, gets this long. */
const TIMEOUT_MS = 20_000;
export const MAX_REDIRECTS = 5;
/** Far above any listing or search page (a few MB at most), and a cap on what
 *  a compressed body may grow into. */
export const MAX_BODY_BYTES = 20 * 1024 * 1024;

const REDIRECT = new Set([301, 302, 303, 307, 308]);

export class CookieJar {
  private store = new Map<string, Map<string, string>>();

  setFromResponse(url: string, setCookie: string[] | string | undefined): void {
    if (!setCookie) return;
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    const host = new URL(url).host;
    let jar = this.store.get(host);
    if (!jar) {
      jar = new Map();
      this.store.set(host, jar);
    }
    for (const raw of list) {
      const first = raw.split(";")[0];
      if (!first) continue;
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      jar.set(name, value);
    }
  }

  headerFor(url: string): string | undefined {
    const host = new URL(url).host;
    const jar = this.store.get(host);
    if (!jar || jar.size === 0) return undefined;
    return Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

/** A host that is, or resolves to, a local address. The message is the one
 *  `assertPublicHost` (lib/url.ts) throws, so both read the same. */
export class LocalAddressError extends Error {
  constructor() {
    super("local addresses are not allowed");
    this.name = "LocalAddressError";
  }
}

/** Name resolution: every address a host has. */
export type Resolve = (host: string) => Promise<string[]>;

const systemResolve: Resolve = async (host) =>
  (await dnsLookup(host, { all: true, verbatim: true })).map((entry) => entry.address);

/** The addresses `host` resolves to (a literal IP stands for itself), when
 *  every one of them is public. Otherwise a `LocalAddressError`; a name that
 *  does not resolve throws DNS's own error. */
export async function publicAddresses(host: string, resolve: Resolve = systemResolve): Promise<string[]> {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (bare === "localhost" || bare.endsWith(".localhost")) throw new LocalAddressError();
  const addresses = isIP(bare) ? [bare] : await resolve(bare);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new LocalAddressError();
  }
  return addresses;
}

/** A hop's URL, parsed and checked: http(s), on a host with public addresses
 *  only. */
export async function checkedUrl(raw: string, resolve?: Resolve): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`not an http(s) link: ${url.protocol}`);
  }
  await publicAddresses(url.hostname, resolve);
  return url;
}

/**
 * A `lookup` for `net.connect` (and so for `http.request`): resolves through
 * `resolve`, refuses with a `LocalAddressError` unless every address is
 * public, and hands the socket only those. Both of Node's call shapes are
 * served: one address, and `all: true`, which Node uses when it tries IPv4 and
 * IPv6 addresses in turn.
 */
export function vettingLookup(
  resolve: Resolve = systemResolve,
  connectTo: (address: string) => string = (address) => address,
): LookupFunction {
  return (hostname, options, callback) => {
    const family = options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family;
    publicAddresses(hostname, resolve).then(
      (addresses) => {
        const entries = addresses
          .map((address) => connectTo(address))
          .map((address) => ({ address, family: isIP(address) }))
          .filter((entry) => !family || entry.family === family);
        const first = entries[0];
        if (!first) {
          const err: NodeJS.ErrnoException = new Error(`${hostname} has no IPv${family} address`);
          err.code = "ENOTFOUND";
          callback(err, "");
        } else if (options.all) {
          callback(null, entries);
        } else {
          callback(null, first.address, first.family);
        }
      },
      (err: NodeJS.ErrnoException) => callback(err, ""),
    );
  };
}

/** This module's own connection pools, so every kept-alive socket in them was
 *  opened through `vettingLookup`. */
const AGENTS: Record<string, http.Agent> = {
  "http:": new http.Agent({ keepAlive: true }),
  "https:": new https.Agent({ keepAlive: true }),
};

/** Decoding stops at the end of what arrived instead of failing on a body cut
 *  short, as `fetch` does, and refuses to grow past the body cap. */
const ZLIB_OPTIONS = {
  finishFlush: zlib.constants.Z_SYNC_FLUSH,
  maxOutputLength: MAX_BODY_BYTES,
};
const BROTLI_OPTIONS = {
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH,
  maxOutputLength: MAX_BODY_BYTES,
};

/** The body with its `Content-Encoding` undone, last coding first, as `fetch`
 *  did: gzip, deflate (zlib-wrapped or raw, as servers send both) and br. An
 *  unknown coding leaves the bytes as they came. */
function decode(body: Buffer, contentEncoding: string | undefined): Buffer {
  const codings = (contentEncoding ?? "")
    .toLowerCase()
    .split(",")
    .map((coding) => coding.trim())
    .filter((coding) => coding && coding !== "identity")
    .reverse();
  let out = body;
  for (const coding of codings) {
    if (out.length === 0) break;
    if (coding === "gzip" || coding === "x-gzip") out = zlib.gunzipSync(out, ZLIB_OPTIONS);
    else if (coding === "deflate") {
      out =
        ((out[0] ?? 0) & 0x0f) === 0x08 ? zlib.inflateSync(out, ZLIB_OPTIONS) : zlib.inflateRawSync(out, ZLIB_OPTIONS);
    } else if (coding === "br") out = zlib.brotliDecompressSync(out, BROTLI_OPTIONS);
    else return body;
  }
  return out;
}

/** What the session reads of an answer: the status, the headers, and the body
 *  as text (or thrown away, for a redirect). */
interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  text(): Promise<string>;
  discard(): void;
}

function toReply(res: http.IncomingMessage): Reply {
  return {
    status: res.statusCode ?? 0,
    headers: res.headers,
    async text() {
      const tooLarge = () => new Error(`the page is larger than ${MAX_BODY_BYTES / 1024 / 1024} MB`);
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of res as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          res.destroy();
          throw tooLarge();
        }
        chunks.push(chunk);
      }
      let body: Buffer;
      try {
        body = decode(Buffer.concat(chunks), res.headers["content-encoding"]);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") throw tooLarge();
        throw err;
      }
      // TextDecoder, as `fetch`'s text() did: UTF-8, a byte-order mark dropped.
      return new TextDecoder().decode(body);
    },
    discard() {
      res.resume();
    },
  };
}

/** One GET, no redirects followed, connecting through `lookup`. Resolves when
 *  the status and headers arrive; a refused address, a network error and the
 *  timeout reject. */
function request(
  url: URL,
  headers: Record<string, string>,
  lookup: LookupFunction,
  signal: AbortSignal,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === "https:" ? https.request : http.request;
    const req = send(url, { method: "GET", headers, agent: AGENTS[url.protocol], lookup, signal }, (res) =>
      resolve(toReply(res)),
    );
    req.on("error", reject);
    req.end();
  });
}

export interface FetchSession {
  get(url: string): Promise<string>;
}

export interface SessionDeps {
  /** Replaces DNS, for the check before each hop and for the connection. */
  resolve?: Resolve;
  /**
   * Tests only: where the socket goes for an address that passed the check,
   * so a test can point a public answer at a server on loopback. It runs after
   * the check, which still judges exactly what `resolve` answered.
   */
  connectTo?: (address: string) => string;
}

/** A browser-like HTTP client that keeps cookies across calls and across a
 *  redirect's hops. `get` resolves to the final page's text, and throws on a
 *  non-2xx answer (`HTTP <status> for <url>`), on a hop to a local address
 *  (`LocalAddressError`), on more than `MAX_REDIRECTS` redirects, and after
 *  20 s for the whole chain. */
export function createSession(deps: SessionDeps = {}): FetchSession {
  const jar = new CookieJar();
  const lookup = vettingLookup(deps.resolve, deps.connectTo);
  return {
    async get(url: string): Promise<string> {
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      try {
        let next = url;
        for (let hop = 0; ; hop += 1) {
          const target = await checkedUrl(next, deps.resolve);
          signal.throwIfAborted();
          const cookie = jar.headerFor(target.href);
          const reply = await request(
            target,
            {
              "User-Agent": UA,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
              // What `fetch` asked for; `decode` undoes each.
              "Accept-Encoding": target.protocol === "https:" ? "br, gzip, deflate" : "gzip, deflate",
              ...(cookie ? { Cookie: cookie } : {}),
            },
            lookup,
            signal,
          );
          // Stored before the next hop, so a consent cookie set by a redirect
          // goes with the request it redirects to.
          jar.setFromResponse(target.href, reply.headers["set-cookie"]);
          const location = reply.headers.location;
          if (REDIRECT.has(reply.status) && location) {
            reply.discard();
            if (hop >= MAX_REDIRECTS) {
              throw new Error(`more than ${MAX_REDIRECTS} redirects from ${url}`);
            }
            next = new URL(location, target).href;
            continue;
          }
          if (reply.status < 200 || reply.status > 299) {
            reply.discard();
            throw new Error(`HTTP ${reply.status} for ${url}`);
          }
          return await reply.text();
        }
      } catch (err) {
        // The timeout reads as `fetch`'s did, not as a reset socket.
        if (signal.aborted) throw signal.reason;
        throw err;
      }
    },
  };
}
