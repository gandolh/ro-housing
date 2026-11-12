import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WicketClient, WicketJob } from "../../lib/wicket.ts";
import { testApp } from "../../testing/test-app.ts";

// the saved routes open the database: a throwaway one, set before it loads.
process.env.RO_HOUSING_DB = ":memory:";
const { fillRoutes } = await import("./fill-routes.ts");
const { pageTexts } = await import("./details/pageText.ts");
const { WicketError } = await import("../../lib/wicket.ts");

const URL_A = "https://www.storia.ro/ro/oferta/apartament-3-camere-ID1";
const queued = (over: Partial<WicketJob> = {}): WicketJob => ({
  id: "w1",
  ticket: 14,
  nowServing: 11,
  position: 3,
  status: "queued",
  ...over,
});

/** A Wicket whose answers the test sets, recording each call. */
function stubWicket() {
  const calls: { op: string; args: unknown[] }[] = [];
  const state = {
    submit: async (): Promise<WicketJob> => queued(),
    get: async (): Promise<WicketJob | undefined> => queued(),
    cancel: async (): Promise<WicketJob | undefined> =>
      queued({ status: "cancelled", error: "cancelled by the caller" }),
  };
  const client: WicketClient = {
    submit: (...args) => (calls.push({ op: "submit", args }), state.submit()),
    get: (...args) => (calls.push({ op: "get", args }), state.get()),
    cancel: (...args) => (calls.push({ op: "cancel", args }), state.cancel()),
  };
  return { client, calls, state };
}

describe("Fill the gaps routes", () => {
  let app: FastifyInstance;
  let wicket: ReturnType<typeof stubWicket>;

  beforeEach(async () => {
    wicket = stubWicket();
    app = await testApp(async (a) => {
      await a.register(fillRoutes, { wicket: wicket.client });
    });
    pageTexts.set(URL_A, "URL: page text");
  });
  afterEach(() => app.close());

  const start = (missing: unknown = ["floorsTotal", "partitioning"]) =>
    app.inject({ method: "POST", url: "/api/saved/fill", payload: { url: URL_A, missing } });

  it("starts a job with exactly messages and format, for the empty fields only", async () => {
    const res = await start();
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ id: "w1", ticket: 14, nowServing: 11, position: 3, status: "queued" });
    const [messages, format] = wicket.calls[0]!.args as [{ content: string }[], { properties: object }];
    expect(messages[1]!.content).toBe("URL: page text");
    expect(Object.keys(format.properties)).toEqual(["floorsTotal", "partitioning"]);
  });

  it("refuses unknown fields and asks for Fetch details when the page text has gone", async () => {
    expect((await start(["rooms", "notes"])).statusCode).toBe(400);
    expect((await start([])).statusCode).toBe(400);
    const gone = await app.inject({
      method: "POST",
      url: "/api/saved/fill",
      payload: { url: "https://example.com/never-fetched", missing: ["rooms"] },
    });
    expect(gone.statusCode).toBe(409);
    expect(gone.json().error).toMatch(/Fetch details/);
    expect(wicket.calls).toEqual([]);
  });

  it("passes queue_full on as a 503 the form can show", async () => {
    wicket.state.submit = async () => {
      throw new WicketError("Wicket answered 503: full", "queue_full");
    };
    const res = await start();
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("Wicket's queue is full; try again in a while.");
  });

  it("passes the long poll through, never above 25 seconds: queued, then running", async () => {
    await start();
    expect((await app.inject({ url: "/api/saved/fill/w1?wait=90" })).json().status).toBe("queued");
    expect(wicket.calls[1]).toEqual({ op: "get", args: ["w1", 25] });
    wicket.state.get = async () => queued({ status: "running", position: 0, nowServing: 14 });
    expect((await app.inject({ url: "/api/saved/fill/w1?wait=25" })).json()).toMatchObject({
      status: "running",
      nowServing: 14,
    });
  });

  it("answers done with the merged values and the model", async () => {
    await start();
    wicket.state.get = async () =>
      queued({
        status: "done",
        position: 0,
        result: {
          text: JSON.stringify({ floorsTotal: 4, partitioning: "decomandat", rooms: 9 }),
          model: "gpt-oss:120b",
        },
      });
    const res = await app.inject({ url: "/api/saved/fill/w1?wait=25" });
    expect(res.json()).toMatchObject({
      status: "done",
      values: { floorsTotal: 4, partitioning: "decomandat" },
      model: "gpt-oss:120b",
    });
    // Finished: the id is forgotten.
    expect((await app.inject({ url: "/api/saved/fill/w1" })).statusCode).toBe(404);
  });

  it("answers failed and cancelled with Wicket's reason, and a forgotten job as cancelled", async () => {
    await start();
    wicket.state.get = async () => queued({ status: "failed", error: "the cloud model answered 429" });
    expect((await app.inject({ url: "/api/saved/fill/w1" })).json()).toMatchObject({
      status: "failed",
      error: "the cloud model answered 429",
    });

    await start();
    wicket.state.get = async () => queued({ status: "cancelled", error: "cleared" });
    expect((await app.inject({ url: "/api/saved/fill/w1" })).json()).toMatchObject({
      status: "cancelled",
      error: "cleared",
    });

    await start();
    wicket.state.get = async () => undefined;
    expect((await app.inject({ url: "/api/saved/fill/w1" })).json()).toEqual({
      id: "w1",
      status: "cancelled",
      error: "Wicket lost the job; press Fill the gaps again.",
    });
  });

  it("answers a model reply that is not JSON as failed", async () => {
    await start();
    wicket.state.get = async () => queued({ status: "done", result: { text: "Sure!", model: "m" } });
    expect((await app.inject({ url: "/api/saved/fill/w1" })).json()).toMatchObject({ status: "failed" });
  });

  it("cancels only jobs it started", async () => {
    expect((await app.inject({ method: "DELETE", url: "/api/saved/fill/someone-elses" })).statusCode).toBe(404);
    expect((await app.inject({ url: "/api/saved/fill/someone-elses" })).statusCode).toBe(404);
    await start();
    const res = await app.inject({ method: "DELETE", url: "/api/saved/fill/w1" });
    expect(res.json()).toMatchObject({ status: "cancelled", error: "cancelled by the caller" });
    expect(wicket.calls.at(-1)).toEqual({ op: "cancel", args: ["w1"] });
  });

  it("answers a request that fails its schema with 400 and the form's one sentence, before Wicket is asked", async () => {
    const sentence = "Send the draft's link and the empty fields to fill.";
    for (const payload of [
      {},
      { url: URL_A },
      { url: 5, missing: ["rooms"] },
      { url: URL_A, missing: "rooms" },
      { url: URL_A, missing: [] },
      { url: URL_A, missing: ["rooms", "pricePlusVat"] },
      { url: "ftp://example.com/a", missing: ["rooms"] },
    ]) {
      const res = await app.inject({ method: "POST", url: "/api/saved/fill", payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
      expect(res.json()).toEqual({ error: sentence });
    }
    expect((await app.inject({ method: "POST", url: "/api/saved/fill" })).statusCode).toBe(400);
    expect(wicket.calls).toEqual([]);
  });

  it("answers with the keys the form reads, for each state of a job", async () => {
    const started = await start();
    expect(Object.keys(started.json())).toEqual(["id", "ticket", "nowServing", "position", "status"]);
    expect(Object.keys((await app.inject({ url: "/api/saved/fill/w1" })).json())).toEqual([
      "id",
      "ticket",
      "nowServing",
      "position",
      "status",
    ]);
    wicket.state.get = async () => queued({ status: "failed", error: "boom" });
    expect(Object.keys((await app.inject({ url: "/api/saved/fill/w1" })).json())).toEqual([
      "id",
      "ticket",
      "nowServing",
      "position",
      "status",
      "error",
    ]);
    await start();
    wicket.state.get = async () =>
      queued({ status: "done", result: { text: JSON.stringify({ floorsTotal: 4 }), model: "m1" } });
    expect(Object.keys((await app.inject({ url: "/api/saved/fill/w1" })).json())).toEqual([
      "id",
      "ticket",
      "nowServing",
      "position",
      "status",
      "values",
      "model",
    ]);
    await start();
    wicket.state.get = async () => undefined;
    expect(Object.keys((await app.inject({ url: "/api/saved/fill/w1" })).json())).toEqual(["id", "status", "error"]);
    await start();
    expect(Object.keys((await app.inject({ method: "DELETE", url: "/api/saved/fill/w1" })).json())).toEqual([
      "id",
      "ticket",
      "nowServing",
      "position",
      "status",
      "error",
    ]);
  });

  it("answers 502 with Wicket's message when it cannot be reached, on every route that asks it", async () => {
    await start();
    const down = async () => {
      throw new WicketError("Could not reach Wicket.");
    };
    wicket.state.submit = down;
    expect((await start()).json()).toEqual({ error: "Could not reach Wicket." });
    expect((await start()).statusCode).toBe(502);
    wicket.state.get = down;
    const poll = await app.inject({ url: "/api/saved/fill/w1" });
    expect(poll.statusCode).toBe(502);
    wicket.state.cancel = down;
    const cancel = await app.inject({ method: "DELETE", url: "/api/saved/fill/w1" });
    expect(cancel.statusCode).toBe(502);
  });

  it("reads a wait that is not a number as 0 rather than refusing it", async () => {
    await start();
    expect((await app.inject({ url: "/api/saved/fill/w1?wait=abc" })).statusCode).toBe(200);
    expect(wicket.calls.at(-1)).toEqual({ op: "get", args: ["w1", 0] });
  });
});
