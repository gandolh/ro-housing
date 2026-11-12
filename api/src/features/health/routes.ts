import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { healthSchema } from "./schema.ts";

/** `GET /api/health`: open with no session, the deploy's health check (plugins/auth.ts lists it). */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/api/health", { schema: { response: { 200: healthSchema } } }, async () => ({ ok: true as const }));
};
