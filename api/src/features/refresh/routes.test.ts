import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route runs on stand-ins: one source whose scraper waits until the test
// lets it finish, and queries that touch no database. The real connection
// module throws if anything loads it.
const gate = vi.hoisted(() => ({
  release: (_rows: unknown[] = []) => {},
  started: 0,
  failNext: false,
  runs: [] as { id: string; ok: boolean; count: number | null | undefined }[],
}));

vi.mock("../../db/index.ts", () => {
  throw new Error("the real database must not open in tests");
});
vi.mock("../sources/index.ts", () => ({
  listSources: () => {
    if (gate.failNext) {
      gate.failNext = false;
      throw new Error("database is locked");
    }
    return [{ id: "storia", enabled: 1, search_url: "https://www.storia.ro/ro/rezultate" }];
  },
  markSourceRun: (id: string, ok: boolean, count?: number | null) => {
    gate.runs.push({ id, ok, count });
  },
}));
vi.mock("../listings/index.ts", () => ({
  upsertListingWithSnapshot: () => {},
}));
vi.mock("../../adapters/index.ts", () => ({
  ADAPTER_REGISTRY: {
    storia: {
      id: "storia",
      displayName: "storia.ro",
      scrape: () => {
        gate.started++;
        return new Promise((resolve) => {
          gate.release = (rows: unknown[] = []) => resolve(rows);
        });
      },
    },
  },
}));

const { refreshRoutes } = await import("./routes.ts");

describe("POST /api/refresh", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    gate.started = 0;
    gate.runs = [];
    app = Fastify();
    await app.register(refreshRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("answers 409 to a second refresh while one is running", async () => {
    const first = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(1));

    const second = await app.inject({ method: "POST", url: "/api/refresh" });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: "a refresh is already running" });
    expect(gate.started).toBe(1);

    gate.release();
    const done = await first;
    expect(done.statusCode).toBe(200);
    expect(done.json()).toEqual({
      perSource: [{ id: "storia", ok: true, count: 0, warning: "no listings found" }],
    });
  });

  it("records how many listings a run found, and warns only when it found none", async () => {
    const empty = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(1));
    gate.release([]);
    expect((await empty).json().perSource[0]).toMatchObject({ ok: true, count: 0, warning: "no listings found" });

    const two = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(2));
    gate.release([
      { sourceUid: "a", url: "https://www.storia.ro/ro/oferta/a", raw: {} },
      { sourceUid: "b", url: "https://www.storia.ro/ro/oferta/b", raw: {} },
    ]);
    const found = (await two).json().perSource[0];
    expect(found).toEqual({ id: "storia", ok: true, count: 2 });
    expect(gate.runs).toEqual([
      { id: "storia", ok: true, count: 0 },
      { id: "storia", ok: true, count: 2 },
    ]);
  });

  it("takes a new refresh once the last one has finished, or failed", async () => {
    const first = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(1));
    gate.release();
    expect((await first).statusCode).toBe(200);

    gate.failNext = true;
    expect((await app.inject({ method: "POST", url: "/api/refresh" })).statusCode).toBe(500);

    const again = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(2));
    gate.release();
    expect((await again).statusCode).toBe(200);
  });
});
