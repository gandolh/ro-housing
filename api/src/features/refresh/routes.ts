import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import type { FastifyBaseLogger } from "fastify";
import { ADAPTER_REGISTRY } from "../../adapters/index.ts";
import { errorSchema } from "../../lib/error-body.ts";
import { RESTARTING } from "../../plugins/shutdown.ts";
import { upsertListingWithSnapshot } from "../listings/index.ts";
import { listSources, markSourceRun } from "../sources/index.ts";
import { refreshResultSchema } from "./schema.ts";

// One Refresh at a time: a second one would hit the same sites in parallel,
// which the sequential design exists to avoid (docs/decisions.md).
let running = false;

/** A run that found no listings worked, but says so: a site that changed its
 *  markup usually makes its adapter return an empty list, not throw. */
export const EMPTY_RUN_WARNING = "no listings found";

export const refreshRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/refresh",
    { schema: { response: { 200: refreshResultSchema, 409: errorSchema, 503: errorSchema } } },
    async (_req, reply) => {
      if (running) {
        return reply.code(409).send({ error: "a refresh is already running" });
      }
      running = true;
      try {
        return await refreshAll(app.log, app.shutdownSignal);
      } catch (err) {
        // The shutdown cut the run: the sources before it are saved, the rest wait for the next press.
        if (!app.shutdownSignal.aborted) throw err;
        return reply.code(503).send({ error: RESTARTING });
      } finally {
        running = false;
      }
    },
  );
};

/** Runs every enabled source with a search URL, one after another. When `signal` aborts it stops, between
 *  sources or inside one, and throws: a source the shutdown cut is not recorded as a failed run. */
async function refreshAll(log: FastifyBaseLogger, signal: AbortSignal) {
  const sources = listSources();
  const results: {
    id: string;
    ok: boolean;
    count: number;
    errorMsg?: string;
    warning?: string;
  }[] = [];

  for (const src of sources) {
    signal.throwIfAborted();
    if (src.enabled !== 1 || !src.search_url) continue;
    const adapter = ADAPTER_REGISTRY[src.id];
    if (!adapter) {
      results.push({
        id: src.id,
        ok: false,
        count: 0,
        errorMsg: "no adapter registered",
      });
      markSourceRun(src.id, false);
      continue;
    }
    try {
      const scraped = await adapter.scrape(src.search_url, signal);
      const now = Date.now();
      for (const row of scraped) {
        upsertListingWithSnapshot(src.id, row, now);
      }
      markSourceRun(src.id, true, scraped.length);
      results.push({
        id: src.id,
        ok: true,
        count: scraped.length,
        ...(scraped.length === 0 ? { warning: EMPTY_RUN_WARNING } : {}),
      });
    } catch (err) {
      signal.throwIfAborted();
      log.error({ err, sourceId: src.id }, "adapter failed");
      markSourceRun(src.id, false);
      results.push({
        id: src.id,
        ok: false,
        count: 0,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { perSource: results };
}
