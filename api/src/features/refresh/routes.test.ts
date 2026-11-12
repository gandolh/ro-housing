import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testApp } from "../../testing/test-app.ts";

// The route runs on stand-ins: one source whose scraper waits until the test
// lets it finish, and queries that touch no database. The real connection
// module throws if anything loads it.
const gate = vi.hoisted(() => ({
  release: (_rows: unknown[] = []) => {},
  fail: (_err: Error) => {},
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
        return new Promise((resolve, reject) => {
          gate.release = (rows: unknown[] = []) => resolve(rows);
          gate.fail = (err: Error) => reject(err);
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
    app = await testApp(async (a) => {
      await a.register(refreshRoutes);
    });
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
    const broken = await app.inject({ method: "POST", url: "/api/refresh" });
    expect(broken.statusCode).toBe(500);
    // The thrown message goes to the log, never to the client.
    expect(broken.json()).toEqual({ error: "Something went wrong on the server." });
    expect(broken.body).not.toContain("database is locked");

    const again = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(2));
    gate.release();
    expect((await again).statusCode).toBe(200);
  });

  it("answers with the keys the web reads: a failed source carries errorMsg, one that found nothing a warning", async () => {
    const failed = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(1));
    gate.fail(new Error("storia exploded"));
    const res = await failed;
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ perSource: [{ id: "storia", ok: false, count: 0, errorMsg: "storia exploded" }] });
    expect(Object.keys(res.json<{ perSource: object[] }>().perSource[0] ?? {})).toEqual([
      "id",
      "ok",
      "count",
      "errorMsg",
    ]);
    expect(gate.runs).toEqual([{ id: "storia", ok: false, count: undefined }]);

    const empty = app.inject({ method: "POST", url: "/api/refresh" });
    await vi.waitFor(() => expect(gate.started).toBe(2));
    gate.release([]);
    const warned = (await empty).json<{ perSource: object[] }>().perSource[0] ?? {};
    expect(Object.keys(warned)).toEqual(["id", "ok", "count", "warning"]);
  });

  it("takes no input: a stray body or query string is ignored", async () => {
    const run = app.inject({ method: "POST", url: "/api/refresh?x=1" });
    await vi.waitFor(() => expect(gate.started).toBe(1));
    gate.release();
    expect((await run).statusCode).toBe(200);
  });
});
