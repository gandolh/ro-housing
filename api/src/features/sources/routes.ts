import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { errorSchema } from "../../lib/error-body.ts";
import { sourceListSchema, sourceParamsSchema, sourceSavedSchema, sourceUpdateSchema } from "./schema.ts";
import { getSource, listSources, updateSource } from "./store.ts";

export const sourcesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/sources", { schema: { response: { 200: sourceListSchema } } }, async () => {
    return listSources().map((s) => ({
      id: s.id,
      displayName: s.display_name,
      searchUrl: s.search_url,
      enabled: s.enabled === 1,
      lastRunAt: s.last_run_at,
      lastRunOk: s.last_run_ok === null ? null : s.last_run_ok === 1,
      lastRunCount: s.last_run_count,
    }));
  });

  app.put(
    "/api/sources/:id",
    {
      schema: {
        params: sourceParamsSchema,
        body: sourceUpdateSchema,
        response: { 200: sourceSavedSchema, 400: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const existing = getSource(req.params.id);
      if (!existing) {
        return reply.code(404).send({ error: "unknown source" });
      }
      updateSource(req.params.id, req.body);
      return { ok: true as const };
    },
  );
};
