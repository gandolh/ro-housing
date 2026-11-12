import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "@fastify/type-provider-zod";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { afterEach, describe, expect, it } from "vitest";
import { errors, INTERNAL_ERROR_MESSAGE } from "./errors.ts";

describe("the error handler", () => {
  let app: FastifyInstance;

  async function build(): Promise<FastifyInstance> {
    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    // Registered first, the way buildApp does, so a route registered after it answers through it.
    await app.register(errors);
    await app.register(async (feature) => {
      feature.get("/boom", async () => {
        throw new Error("secret detail: the database is at /var/lib/ro.db");
      });
      feature.post("/echo", async (request) => request.body ?? null);
      feature
        .withTypeProvider<ZodTypeProvider>()
        .post("/checked", { schema: { body: z.object({ name: z.string("name is required") }) } }, async () => ({
          ok: true,
        }));
      feature.withTypeProvider<ZodTypeProvider>().get(
        "/wrong",
        { schema: { response: { 200: z.object({ n: z.number() }) } } },
        // @ts-expect-error: a reply that does not match its schema, on purpose
        async () => ({ n: "secret value" }),
      );
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

  it("answers a request that fails its schema with 400 and the first issue's message", async () => {
    await build();
    const res = await app.inject({ method: "POST", url: "/checked", payload: { name: 5 } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "name is required" });
  });

  it("answers a reply that breaks its response schema with the fixed 500, and leaves the values out", async () => {
    await build();
    const res = await app.inject({ url: "/wrong" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: INTERNAL_ERROR_MESSAGE });
    expect(res.body).not.toContain("secret value");
  });
});
