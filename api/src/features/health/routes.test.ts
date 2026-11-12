import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { testApp } from "../../testing/test-app.ts";
import { healthRoutes } from "./index.ts";

describe("GET /api/health", () => {
  let app: FastifyInstance;
  afterEach(() => app.close());

  it("answers { ok: true }, the keys the web and the deploy's check have always seen", async () => {
    app = await testApp(async (a) => {
      await a.register(healthRoutes);
    });
    const res = await app.inject({ url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(Object.keys(res.json())).toEqual(["ok"]);
  });

  it("takes no input: the route declares none, and a stray query string passes", async () => {
    app = await testApp(async (a) => {
      await a.register(healthRoutes);
    });
    expect((await app.inject({ url: "/api/health?x=1" })).statusCode).toBe(200);
  });
});
