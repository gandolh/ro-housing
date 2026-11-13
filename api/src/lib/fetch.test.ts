import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { brotliCompressSync, deflateRawSync, deflateSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, LocalAddressError, MAX_REDIRECTS, publicAddresses, vettingLookup } from "./fetch.ts";

const PUBLIC = "93.184.216.34";
const PUBLIC_V6 = "2606:4700::1111";

describe("publicAddresses", () => {
  const dns: Record<string, string[]> = {
    "news.example": [PUBLIC, PUBLIC_V6],
    "inside.example": ["10.0.0.5"],
    "mixed.example": [PUBLIC, "127.0.0.1"],
    "nat64.example": ["64:ff9b::7f00:1"],
  };
  const resolve = async (host: string) => dns[host] ?? [];

  it("passes a host whose every address is public", async () => {
    expect(await publicAddresses("news.example", resolve)).toEqual([PUBLIC, PUBLIC_V6]);
    expect(await publicAddresses("89.36.0.1", resolve)).toEqual(["89.36.0.1"]);
  });

  it.each([
    "inside.example",
    "mixed.example",
    "nat64.example",
    "unknown.example",
    "localhost",
    "app.localhost",
    "127.0.0.1",
    "[::1]",
    "[::ffff:192.168.0.1]",
  ])("refuses %s", async (host) => {
    await expect(publicAddresses(host, resolve)).rejects.toBeInstanceOf(LocalAddressError);
  });

  it("judges a literal IP without resolving it", async () => {
    const spy = vi.fn(resolve);
    await expect(publicAddresses("169.254.169.254", spy)).rejects.toThrow("local addresses are not allowed");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("vettingLookup", () => {
  const answer = (addresses: string[]) => async () => addresses;
  type Result = { err: NodeJS.ErrnoException | null; address: unknown; family?: number };
  const call = (lookup: ReturnType<typeof vettingLookup>, options: object, host = "host.example") =>
    new Promise<Result>((resolve) =>
      lookup(host, options, (err, address, family) => resolve({ err, address, family })),
    );

  it("serves one address to a single-address lookup", async () => {
    const lookup = vettingLookup(answer([PUBLIC, PUBLIC_V6]));
    expect(await call(lookup, {})).toEqual({ err: null, address: PUBLIC, family: 4 });
    expect(await call(lookup, { family: 6 })).toEqual({
      err: null,
      address: PUBLIC_V6,
      family: 6,
    });
  });

  it("serves every address to an all: true lookup", async () => {
    const lookup = vettingLookup(answer([PUBLIC, PUBLIC_V6]));
    expect((await call(lookup, { all: true })).address).toEqual([
      { address: PUBLIC, family: 4 },
      { address: PUBLIC_V6, family: 6 },
    ]);
  });

  it.each([{}, { all: true }])("refuses when any address is private (%o)", async (options) => {
    for (const addresses of [["127.0.0.1"], [PUBLIC, "10.0.0.5"], ["::ffff:127.0.0.1"], []]) {
      const { err } = await call(vettingLookup(answer(addresses)), options);
      expect(err).toBeInstanceOf(LocalAddressError);
    }
  });

  it("says ENOTFOUND when no vetted address has the family asked for", async () => {
    const { err } = await call(vettingLookup(answer([PUBLIC])), { family: 6 });
    expect(err?.code).toBe("ENOTFOUND");
  });

  it("passes a DNS failure on", async () => {
    const failing = async () => {
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    };
    expect((await call(vettingLookup(failing), {})).err?.code).toBe("ENOTFOUND");
  });
});

/**
 * The real requests, against a server on loopback. The session refuses
 * loopback, so a test that must reach the server answers a public address and
 * maps it to 127.0.0.1 through `connectTo`, which runs only after the check.
 */
describe("createSession", () => {
  let server: Server;
  let port: number;
  let hits: Array<{ url: string; host: string; headers: IncomingMessage["headers"] }>;
  let handle: (req: IncomingMessage, res: ServerResponse) => void;

  beforeEach(async () => {
    hits = [];
    handle = (_req, res) => res.end("ok");
    server = createServer((req, res) => {
      hits.push({ url: req.url ?? "", host: req.headers.host ?? "", headers: req.headers });
      handle(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const toLoopback = () => "127.0.0.1";
  const publicDeps = { resolve: async () => [PUBLIC], connectTo: toLoopback };

  it("fetches a public answer, with the browser headers", async () => {
    const connectTo = vi.fn(toLoopback);
    handle = (_req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<p>hello</p>");
    };
    const session = createSession({ resolve: async () => [PUBLIC], connectTo });
    expect(await session.get(`http://news.example:${port}/a`)).toBe("<p>hello</p>");
    expect(connectTo).toHaveBeenCalledWith(PUBLIC);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.headers["user-agent"]).toMatch(/Chrome\//);
    expect(hits[0]?.headers["accept-language"]).toMatch(/^ro-RO/);
    expect(hits[0]?.headers["accept-encoding"]).toBe("gzip, deflate");
  });

  it("refuses a name that rebinds to loopback after the check, and nothing reaches the server", async () => {
    let calls = 0;
    const resolve = async () => (calls++ === 0 ? [PUBLIC] : ["127.0.0.1"]);
    await expect(createSession({ resolve }).get(`http://rebind.example:${port}/secret`)).rejects.toBeInstanceOf(
      LocalAddressError,
    );
    expect(calls).toBe(2); // the check, then the connection: both went through it
    expect(hits).toEqual([]);
  });

  it("runs the vetting lookup on the https path too, before any socket opens", async () => {
    let calls = 0;
    const resolve = async () => {
      if (calls++ === 0) return [PUBLIC];
      throw new Error("the connection asked the vetting lookup");
    };
    await expect(createSession({ resolve }).get("https://news.example/")).rejects.toThrow(
      "the connection asked the vetting lookup",
    );
    expect(calls).toBe(2);
  });

  it("refuses a name that answers loopback before any connection", async () => {
    const resolve = vi.fn(async () => ["127.0.0.1"]);
    await expect(createSession({ resolve }).get(`http://inside.example:${port}/`)).rejects.toThrow(
      "local addresses are not allowed",
    );
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(hits).toEqual([]);
  });

  it("refuses a redirect to a loopback address before requesting it", async () => {
    handle = (_req, res) => {
      res.writeHead(302, { location: `http://127.0.0.1:${port}/secret` });
      res.end();
    };
    await expect(createSession(publicDeps).get(`http://public.example:${port}/start`)).rejects.toBeInstanceOf(
      LocalAddressError,
    );
    expect(hits.map((hit) => hit.url)).toEqual(["/start"]);
  });

  it("refuses a redirect to a name that answers a private address", async () => {
    const dns: Record<string, string[]> = {
      "public.example": [PUBLIC],
      "inner.example": ["192.168.1.10"],
    };
    handle = (_req, res) => {
      res.writeHead(301, { location: `http://inner.example:${port}/admin` });
      res.end();
    };
    const session = createSession({ resolve: async (host) => dns[host] ?? [], connectTo: toLoopback });
    await expect(session.get(`http://public.example:${port}/start`)).rejects.toBeInstanceOf(LocalAddressError);
    expect(hits.map((hit) => hit.url)).toEqual(["/start"]);
  });

  it("follows a redirect between public hosts, and cookies set on the way go with the next hop", async () => {
    handle = (req, res) => {
      if (req.url === "/start") {
        res.writeHead(302, {
          location: "/listing",
          "set-cookie": ["consent=yes; Path=/", "sid=abc; HttpOnly"],
        });
        res.end();
      } else {
        res.end("the listing");
      }
    };
    const session = createSession(publicDeps);
    expect(await session.get(`http://agency.example:${port}/start`)).toBe("the listing");
    expect(hits.map((hit) => hit.url)).toEqual(["/start", "/listing"]);
    expect(hits[0]?.headers.cookie).toBeUndefined();
    expect(hits[1]?.headers.cookie).toBe("consent=yes; sid=abc");
    // And the session keeps them for its next call.
    await session.get(`http://agency.example:${port}/listing`);
    expect(hits[2]?.headers.cookie).toBe("consent=yes; sid=abc");
  });

  it(`stops after ${MAX_REDIRECTS} redirects`, async () => {
    handle = (req, res) => {
      const n = Number(req.url?.slice(1)) || 0;
      res.writeHead(302, { location: `/${n + 1}` });
      res.end();
    };
    await expect(createSession(publicDeps).get(`http://loop.example:${port}/0`)).rejects.toThrow(
      /more than 5 redirects/,
    );
    expect(hits).toHaveLength(MAX_REDIRECTS + 1);
  });

  it("refuses a redirect to another scheme", async () => {
    handle = (_req, res) => {
      res.writeHead(302, { location: "file:///etc/passwd" });
      res.end();
    };
    await expect(createSession(publicDeps).get(`http://x.example:${port}/`)).rejects.toThrow(/not an http\(s\) link/);
  });

  it("stops a request the server never answers when the caller's signal aborts, with the caller's reason", async () => {
    handle = () => {}; // never answers
    const controller = new AbortController();
    const pending = createSession(publicDeps).get(`http://slow.example:${port}/`, controller.signal);
    await vi.waitFor(() => expect(hits).toHaveLength(1));
    const reason = new Error("shutting down");
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
  });

  it("throws HTTP <status> for a non-2xx answer", async () => {
    handle = (_req, res) => {
      res.writeHead(404);
      res.end("gone");
    };
    const url = `http://x.example:${port}/gone`;
    await expect(createSession(publicDeps).get(url)).rejects.toThrow(`HTTP 404 for ${url}`);
  });

  it.each([
    ["gzip", gzipSync],
    ["deflate", deflateSync],
    ["deflate", deflateRawSync],
    ["br", brotliCompressSync],
  ] as const)("a %s body arrives decompressed", async (coding, compress) => {
    handle = (_req, res) => {
      res.writeHead(200, { "content-encoding": coding, "content-type": "text/html" });
      res.end(compress(Buffer.from("<p>Apartament 2 camere, Timișoara</p>")));
    };
    expect(await createSession(publicDeps).get(`http://x.example:${port}/z`)).toBe(
      "<p>Apartament 2 camere, Timișoara</p>",
    );
  });

  it("refuses a compressed body that would grow past the cap", async () => {
    handle = (_req, res) => {
      res.writeHead(200, { "content-encoding": "gzip" });
      res.end(gzipSync(Buffer.alloc(30 * 1024 * 1024, "a"))); // about 30 KB on the wire
    };
    await expect(createSession(publicDeps).get(`http://x.example:${port}/bomb`)).rejects.toThrow(
      "the page is larger than 20 MB",
    );
  });
});
