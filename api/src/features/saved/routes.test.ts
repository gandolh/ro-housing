import type { FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testApp } from "../../testing/test-app.ts";

// The routes run on the real store, on a throwaway database set before the module loads. The page fetch
// and the DNS check are stand-ins: nothing here touches the network.
process.env.RO_HOUSING_DB = ":memory:";

const page = vi.hoisted(() => ({
  next: undefined as { html: string; via: "fetch" | "browser" } | { problem: [string, string] } | undefined,
  hostError: undefined as string | undefined,
}));
vi.mock("./details/fetchPage.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("./details/fetchPage.ts")>();
  return {
    ...real,
    fetchListingPage: async () => {
      if (!page.next) throw new Error("no page set");
      if ("problem" in page.next) {
        throw new real.PageProblem(page.next.problem[0] as "not_found", page.next.problem[1]);
      }
      return page.next;
    },
  };
});
vi.mock("../../lib/url.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/url.ts")>();
  return {
    ...real,
    assertPublicHost: async (url: string) => {
      if (page.hostError) throw new Error(page.hostError);
      if (new URL(url).hostname === "localhost") throw new Error("local addresses are not allowed");
    },
  };
});

const { db } = await import("../../db/index.ts");
const { savedRoutes } = await import("./index.ts");

const storia = readFileSync(new URL("./details/fixtures/storia.html", import.meta.url), "utf8");

// The keys the web's Saved page has always been sent.
const SAVED_KEYS = [
  "id",
  "url",
  "site",
  "title",
  "priceEur",
  "pricePlusVat",
  "rooms",
  "sqm",
  "floor",
  "floorsTotal",
  "yearBuilt",
  "location",
  "partitioning",
  "imageUrl",
  "notes",
  "fetchedAt",
  "savedAt",
  "updatedAt",
];
const DRAFT_KEYS = [
  "title",
  "priceEur",
  "rooms",
  "sqm",
  "floor",
  "floorsTotal",
  "yearBuilt",
  "location",
  "partitioning",
  "imageUrl",
  "pricePlusVat",
];
const SCRAPE_KEYS = ["url", "site", "existing", "fillable", "draft", "found", "via", "problem"];

const FULL = {
  url: "https://www.storia.ro/ro/oferta/garsoniera-ID1",
  title: "  Garsoniera  ",
  priceEur: 99000,
  pricePlusVat: true,
  rooms: 1,
  sqm: 30.5,
  floor: 2,
  floorsTotal: 4,
  yearBuilt: 1990,
  location: "Fabric",
  partitioning: "decomandat",
  imageUrl: "https://i.example.com/a.jpg",
  notes: "nice",
};

describe("the saved routes", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await testApp(async (a) => {
      await a.register(savedRoutes, { fillable: true });
    });
  });
  afterAll(() => app.close());
  beforeEach(() => {
    db.exec("DELETE FROM saved");
    page.next = undefined;
    page.hostError = undefined;
  });

  const post = (payload?: Record<string, unknown>) => app.inject({ method: "POST", url: "/api/saved", payload });
  const put = (id: string | number, payload?: Record<string, unknown>) =>
    app.inject({ method: "PUT", url: `/api/saved/${id}`, payload });
  const scrape = (payload?: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/saved/scrape", payload });

  describe("POST, GET, PUT and DELETE /api/saved", () => {
    it("saves an apartment, trimmed, and answers 201 with the keys the web reads", async () => {
      const res = await post(FULL);
      expect(res.statusCode).toBe(201);
      expect(Object.keys(res.json())).toEqual(SAVED_KEYS);
      expect(res.json()).toMatchObject({
        id: 1,
        title: "Garsoniera",
        site: "storia.ro",
        pricePlusVat: true,
        sqm: 30.5,
        notes: "nice",
        fetchedAt: null,
      });
    });

    it("lists what is saved, newest first, with the same keys", async () => {
      await post(FULL);
      await post({ url: "https://other.example/b" });
      const res = await app.inject({ url: "/api/saved" });
      expect(res.statusCode).toBe(200);
      const saved = res.json<Record<string, unknown>[]>();
      expect(saved).toHaveLength(2);
      for (const row of saved) expect(Object.keys(row)).toEqual(SAVED_KEYS);
      expect(saved.map((s) => s.url)).toEqual(["https://other.example/b", FULL.url]);
    });

    it("answers 409 for a link that is saved already, on save and on edit", async () => {
      await post(FULL);
      const dup = await post(FULL);
      expect(dup.statusCode).toBe(409);
      expect(dup.json()).toEqual({ error: "This link is already saved." });
      const other = await post({ url: "https://other.example/b" });
      const clash = await put(other.json<{ id: number }>().id, { url: FULL.url });
      expect(clash.statusCode).toBe(409);
      expect(clash.json()).toEqual({ error: "Another saved apartment has this link." });
    });

    it("edits a saved apartment, and answers 404 for one that is not there", async () => {
      const id = (await post(FULL)).json<{ id: number }>().id;
      const res = await put(id, { ...FULL, title: "Renamed", notes: null });
      expect(res.statusCode).toBe(200);
      expect(Object.keys(res.json())).toEqual(SAVED_KEYS);
      expect(res.json()).toMatchObject({ title: "Renamed", notes: null });
      const gone = await put(99, FULL);
      expect(gone.statusCode).toBe(404);
      expect(gone.json()).toEqual({ error: "not found" });
    });

    it("deletes with 204 and no body, and answers 404 the second time", async () => {
      const id = (await post(FULL)).json<{ id: number }>().id;
      const res = await app.inject({ method: "DELETE", url: `/api/saved/${id}` });
      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");
      const again = await app.inject({ method: "DELETE", url: `/api/saved/${id}` });
      expect(again.statusCode).toBe(404);
      expect(again.json()).toEqual({ error: "not found" });
    });

    it("answers 400 with the form's sentence for each body the schema refuses", async () => {
      const url = "https://other.example/c";
      const cases: [Record<string, unknown> | undefined, string][] = [
        [undefined, "expected a JSON object"],
        [{}, "url must be an http(s) link"],
        [{ url: "ftp://x" }, "url must be an http(s) link"],
        [{ url, title: 5 }, "title must be text"],
        [{ url, title: "t".repeat(301) }, "title is too long (max 300 characters)"],
        [{ url, priceEur: "5" }, "priceEur must be a number"],
        [{ url, priceEur: 5.5 }, "priceEur must be a whole number"],
        [{ url, rooms: 0 }, "rooms must be between 1 and 20"],
        [{ url, floor: 5, floorsTotal: 3 }, "floor is above the number of floors in the building"],
        [
          { url, partitioning: "open" },
          "partitioning must be one of decomandat, semidecomandat, nedecomandat, circular",
        ],
        [{ url, imageUrl: "javascript:x" }, "imageUrl must be an http(s) link"],
        [{ url, pricePlusVat: "yes" }, "pricePlusVat must be true or false"],
        [{ url, notes: "n".repeat(5001) }, "notes is too long (max 5000 characters)"],
      ];
      for (const [payload, error] of cases) {
        const res = await post(payload);
        expect(res.statusCode, JSON.stringify(payload)?.slice(0, 50)).toBe(400);
        expect(res.json()).toEqual({ error });
      }
      expect(db.prepare("SELECT COUNT(*) AS n FROM saved").get()).toEqual({ n: 0 });
      const id = (await post(FULL)).json<{ id: number }>().id;
      expect((await put(id, { url: "nope" })).statusCode).toBe(400);
      expect((await put(id)).statusCode).toBe(400);
    });

    it("answers 400 bad id for an id that is not a positive whole number, before it reads the body", async () => {
      for (const id of ["abc", "0", "1.5"]) {
        const bad = await put(id, {});
        expect(bad.statusCode, id).toBe(400);
        expect(bad.json()).toEqual({ error: "bad id" });
        const del = await app.inject({ method: "DELETE", url: `/api/saved/${id}` });
        expect(del.statusCode, id).toBe(400);
        expect(del.json()).toEqual({ error: "bad id" });
      }
    });

    it("drops a column the table has and the schema does not name, and answers 500 for a stored value it rejects", async () => {
      db.exec("ALTER TABLE saved ADD COLUMN internal_note TEXT");
      await post(FULL);
      db.prepare("UPDATE saved SET internal_note = 'x', raw_json = 'x'").run();
      const res = await app.inject({ url: "/api/saved" });
      expect(JSON.stringify(res.json())).not.toMatch(/internal_note|raw_json/);

      db.prepare("UPDATE saved SET saved_at = 'earlier'").run();
      const broken = await app.inject({ url: "/api/saved" });
      expect(broken.statusCode).toBe(500);
      expect(broken.json()).toEqual({ error: "Something went wrong on the server." });
      expect(broken.body).not.toContain("earlier");
    });
  });

  describe("POST /api/saved/scrape", () => {
    it("reads a page into a draft with the keys the form reads", async () => {
      page.next = { html: storia, via: "fetch" };
      const res = await scrape({ url: "https://www.storia.ro/ro/oferta/a-ID9?utm_source=x" });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ draft: Record<string, unknown>; found: string[]; via: string }>();
      expect(Object.keys(body)).toEqual(SCRAPE_KEYS);
      expect(Object.keys(body.draft)).toEqual(DRAFT_KEYS);
      expect(body).toMatchObject({
        url: "https://www.storia.ro/ro/oferta/a-ID9",
        existing: null,
        fillable: true,
        via: "fetch",
      });
      expect(body.found.length).toBeGreaterThan(0);
    });

    it("answers a link that is saved already with the saved row, and no draft", async () => {
      await post(FULL);
      const res = await scrape({ url: FULL.url });
      const body = res.json<{ existing: Record<string, unknown>; draft: null }>();
      expect(Object.keys(body)).toEqual(SCRAPE_KEYS);
      expect(Object.keys(body.existing)).toEqual(SAVED_KEYS);
      expect(body).toMatchObject({ draft: null, found: [], via: null, problem: null });
    });

    it("answers 200 with an empty draft and the problem when the page cannot be read", async () => {
      page.next = { problem: ["not_found", "The site says this page does not exist."] };
      const res = await scrape({ url: "https://www.storia.ro/ro/oferta/gone" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        found: [],
        via: null,
        problem: { kind: "not_found", message: "The site says this page does not exist." },
      });
      expect(Object.keys(res.json<{ draft: object }>().draft)).toEqual(DRAFT_KEYS);

      page.hostError = "getaddrinfo ENOTFOUND";
      const unreachable = await scrape({ url: "https://no-such-site.example/a" });
      expect(unreachable.json()).toMatchObject({ problem: { kind: "unreachable" } });
    });

    it("answers 400 with the form's sentence for a link it cannot take, or one that points to this machine", async () => {
      for (const payload of [undefined, {}, { url: "" }, { url: 5 }, { url: "ftp://x.example/a" }]) {
        const res = await scrape(payload);
        expect(res.statusCode, JSON.stringify(payload)).toBe(400);
        expect(res.json()).toEqual({ error: "Paste a full link, starting with http:// or https://" });
      }
      const local = await scrape({ url: "http://localhost/a" });
      expect(local.statusCode).toBe(400);
      expect(local.json()).toEqual({ error: "That link points to a local address." });
      expect((await scrape({ url: 5 })).statusCode).toBe(400);
    });
  });
});
