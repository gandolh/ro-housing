import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testApp } from "../../testing/test-app.ts";

// The routes run on the real store, on a throwaway database set before the module loads.
process.env.RO_HOUSING_DB = ":memory:";
const { db } = await import("../../db/index.ts");
const { sourcesRoutes } = await import("./index.ts");

// The keys the web's Sources panel has always been sent (docs/testing.md, "Reply keys").
const SOURCE_KEYS = ["id", "displayName", "searchUrl", "enabled", "lastRunAt", "lastRunOk", "lastRunCount"];

describe("the sources routes", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await testApp(async (a) => {
      await a.register(sourcesRoutes);
    });
  });
  afterAll(() => app.close());

  it("lists every source with exactly the keys the web reads", async () => {
    const res = await app.inject({ url: "/api/sources" });
    expect(res.statusCode).toBe(200);
    const sources = res.json<Record<string, unknown>[]>();
    expect(sources.map((s) => s.id)).toContain("imobiliare-feed");
    for (const source of sources) expect(Object.keys(source)).toEqual(SOURCE_KEYS);
    expect(sources.find((s) => s.id === "storia")).toMatchObject({ enabled: true, lastRunAt: null, lastRunOk: null });
  });

  it("saves a change to a source, and leaves a key that was left out as it was", async () => {
    const put = (payload: Record<string, unknown>) =>
      app.inject({ method: "PUT", url: "/api/sources/storia", payload });
    const first = await put({ enabled: false });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ ok: true });
    await put({ searchUrl: "https://example.com/q" });
    const read = async () =>
      (await app.inject({ url: "/api/sources" })).json<{ id: string; enabled: boolean; searchUrl: string | null }[]>();
    expect((await read()).find((s) => s.id === "storia")).toMatchObject({
      enabled: false,
      searchUrl: "https://example.com/q",
    });
    await put({ searchUrl: null, enabled: true });
    expect((await read()).find((s) => s.id === "storia")).toMatchObject({ enabled: true, searchUrl: null });
  });

  it("answers 404 for a source that does not exist", async () => {
    const res = await app.inject({ method: "PUT", url: "/api/sources/nope", payload: { enabled: true } });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "unknown source" });
  });

  it("answers 400 for a body that fails its schema, before it looks for the source", async () => {
    for (const payload of [{ enabled: "yes" }, { searchUrl: 5 }, [], { searchUrl: ["a"] }]) {
      const res = await app.inject({ method: "PUT", url: "/api/sources/storia", payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(Object.keys(res.json())).toEqual(["error"]);
    }
    const noBody = await app.inject({ method: "PUT", url: "/api/sources/storia" });
    expect(noBody.statusCode).toBe(400);
    const unknownAndBad = await app.inject({ method: "PUT", url: "/api/sources/nope", payload: { enabled: "x" } });
    expect(unknownAndBad.statusCode).toBe(400);
  });

  it("drops a column the table has and the schema does not name, and answers 500 for a stored value it rejects", async () => {
    db.exec("ALTER TABLE sources ADD COLUMN internal_note TEXT");
    db.prepare("UPDATE sources SET internal_note = 'x' WHERE id = 'storia'").run();
    const res = await app.inject({ url: "/api/sources" });
    expect(JSON.stringify(res.json())).not.toContain("internal_note");

    db.prepare("UPDATE sources SET last_run_at = 'yesterday' WHERE id = 'storia'").run();
    const broken = await app.inject({ url: "/api/sources" });
    expect(broken.statusCode).toBe(500);
    expect(broken.json()).toEqual({ error: "Something went wrong on the server." });
    expect(broken.body).not.toContain("yesterday");
    db.prepare("UPDATE sources SET last_run_at = NULL WHERE id = 'storia'").run();
  });
});
