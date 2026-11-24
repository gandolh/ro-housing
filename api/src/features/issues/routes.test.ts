import type { FastifyInstance } from "fastify";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../../testing/test-app.ts";
import { issuesRoutes } from "./index.ts";

describe("the issues routes", () => {
  let app: FastifyInstance;
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "ro-housing-issues-route-"));
    app = await testApp(async (a) => {
      await a.register(issuesRoutes, { dir });
    });
  });
  afterEach(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const post = (payload?: Record<string, unknown>) => app.inject({ method: "POST", url: "/api/issues", payload });

  it("reports how many issues are open, with the keys the web reads", async () => {
    const res = await app.inject({ url: "/api/issues" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ count: 0, max: 10 });
    expect(Object.keys(res.json())).toEqual(["count", "max"]);
  });

  it("writes a report to a file, trimmed, and answers with its id and the new count", async () => {
    const res = await post({ body: "  The refresh feels slow  " });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ id: string; count: number; max: number }>();
    expect(Object.keys(body)).toEqual(["id", "count", "max"]);
    expect(body).toMatchObject({ count: 1, max: 10 });
    expect(body.id).toMatch(/^\d+-the-refresh-feels-slow$/);
    expect(readdirSync(dir)).toEqual([`${body.id}.md`]);
  });

  it("answers 400 with the form's sentence for a body it can't take", async () => {
    const cases: [Record<string, unknown> | undefined, string][] = [
      [{ body: "   " }, "body is required"],
      [{}, "body is required"],
      [undefined, "body is required"],
      [{ body: "x".repeat(5001) }, "body too long (max 5000 chars)"],
      [{ body: 5 }, "body is required"],
    ];
    for (const [payload, error] of cases) {
      const res = await post(payload);
      expect(res.statusCode, JSON.stringify(payload)?.slice(0, 40)).toBe(400);
      expect(res.json()).toEqual({ error });
    }
    expect(readdirSync(dir)).toEqual([]);
  });

  it("answers 409 once ten are open, and writes no more", async () => {
    for (let i = 1; i <= 10; i++) expect((await post({ body: `issue number ${i}` })).statusCode).toBe(200);
    const res = await post({ body: "one more" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "max 10 open issues; resolve some before adding more" });
    expect(readdirSync(dir)).toHaveLength(10);
  });

  it("keeps Fastify's own 400 for a body that is not JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/issues",
      headers: { "content-type": "application/json" },
      payload: "{{{",
    });
    expect(res.statusCode).toBe(400);
    expect(Object.keys(res.json())).toEqual(["error"]);
  });
});
