import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testApp } from "../../testing/test-app.ts";

// The routes run on the real store, on a throwaway database set before the module loads.
process.env.RO_HOUSING_DB = ":memory:";
const { db } = await import("../../db/index.ts");
const { listingsRoutes, upsertListingWithSnapshot } = await import("./index.ts");

// The keys the web's Listings table has always been sent.
const LISTING_KEYS = [
  "id",
  "sourceId",
  "sourceUid",
  "url",
  "title",
  "priceEur",
  "pricePlusVat",
  "rooms",
  "sqm",
  "location",
  "firstSeen",
  "lastSeen",
  "history",
];

interface Listing {
  sourceUid: string;
  sourceId: string;
  history: { observedAt: number; priceEur: number | null }[];
}

describe("GET /api/listings", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    upsertListingWithSnapshot(
      "storia",
      { sourceUid: "s1", url: "https://example.com/1", title: "One", priceEur: 120000, sqm: 70.5, raw: {} },
      1000,
    );
    upsertListingWithSnapshot(
      "storia",
      { sourceUid: "s1", url: "https://example.com/1", priceEur: 110000, raw: {} },
      2000,
    );
    upsertListingWithSnapshot(
      "imobiliare",
      { sourceUid: "i1", url: "https://example.com/2", priceEur: 90000, pricePlusVat: true, raw: {} },
      1500,
    );
    app = await testApp(async (a) => {
      await a.register(listingsRoutes);
    });
  });
  afterAll(() => app.close());

  const list = async (query = "") => app.inject({ url: `/api/listings${query}` });

  it("lists every listing with exactly the keys the web reads, and its price history", async () => {
    const res = await list();
    expect(res.statusCode).toBe(200);
    const listings = res.json<Record<string, unknown>[]>();
    expect(listings).toHaveLength(2);
    for (const listing of listings) {
      expect(Object.keys(listing)).toEqual(LISTING_KEYS);
    }
    const storia = res.json<Listing[]>().find((l) => l.sourceUid === "s1");
    expect(storia?.history).toEqual([
      { observedAt: 1000, priceEur: 120000 },
      { observedAt: 2000, priceEur: 110000 },
    ]);
    expect(Object.keys(storia?.history[0] ?? {})).toEqual(["observedAt", "priceEur"]);
  });

  it("sorts as asked, and filters by source", async () => {
    expect((await list("?sort=price&order=asc")).json<Listing[]>().map((l) => l.sourceUid)).toEqual(["i1", "s1"]);
    expect((await list("?sort=lastSeen")).json<Listing[]>().map((l) => l.sourceUid)).toEqual(["s1", "i1"]);
    expect((await list("?source=imobiliare")).json<Listing[]>().map((l) => l.sourceId)).toEqual(["imobiliare"]);
    expect((await list("?source=nope")).json()).toEqual([]);
  });

  it("answers 400 for a sort or an order it does not know, in the error body", async () => {
    for (const query of ["?sort=bogus", "?order=sideways", "?sort=price&order="]) {
      const res = await list(query);
      expect(res.statusCode, query).toBe(400);
      expect(Object.keys(res.json())).toEqual(["error"]);
    }
  });

  it("drops a column the table has and the schema does not name, and answers 500 for a stored value it rejects", async () => {
    db.exec("ALTER TABLE listings ADD COLUMN internal_note TEXT");
    db.prepare("UPDATE listings SET internal_note = 'x'").run();
    expect(JSON.stringify((await list()).json())).not.toContain("internal_note");

    db.prepare("UPDATE listings SET first_seen = 'long ago' WHERE source_uid = 's1'").run();
    const broken = await list();
    expect(broken.statusCode).toBe(500);
    expect(broken.json()).toEqual({ error: "Something went wrong on the server." });
    expect(broken.body).not.toContain("long ago");
    db.prepare("UPDATE listings SET first_seen = 1000 WHERE source_uid = 's1'").run();
  });
});
