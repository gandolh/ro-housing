import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { errors, INTERNAL_ERROR_MESSAGE } from "./errors.ts";

describe("the error handler", () => {
  let app: FastifyInstance;

  async function build(): Promise<FastifyInstance> {
    app = Fastify();
    // Registered first, the way buildApp does, so a route registered after it answers through it.
    await app.register(errors);
    await app.register(async (feature) => {
      feature.get("/boom", async () => {
        throw new Error("secret detail: the database is at /var/lib/ro.db");
      });
      feature.post("/echo", async (request) => request.body ?? null);
    });
    return app;
  }

  afterEach(() => app.close());

  it("answers a thrown error with a fixed 500 and never echoes its message", async () => {
    await build();
    const res = await app.inject({ url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: INTERNAL_ERROR_MESSAGE });
    expect(res.body).not.toContain("secret detail");
  });

  it("keeps Fastify's own 4xx status for a body that is not JSON, in the repo's body", async () => {
    await build();
    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { "content-type": "application/json" },
      payload: "{{{",
    });
    expect(res.statusCode).toBe(400);
    expect(Object.keys(res.json())).toEqual(["error"]);
    expect(res.json<{ error: string }>().error).toMatch(/not valid JSON/);
  });

  it("keeps a 415 for a content type nothing parses", async () => {
    await build();
    const res = await app.inject({
      method: "POST",
      url: "/echo",
      headers: { "content-type": "application/x-unknown" },
      payload: "x",
    });
    expect(res.statusCode).toBe(415);
    expect(Object.keys(res.json())).toEqual(["error"]);
  });
});
