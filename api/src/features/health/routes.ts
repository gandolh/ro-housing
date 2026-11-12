import type { FastifyPluginAsync } from "fastify";

/** `GET /api/health`: open with no session, the deploy's health check (plugins/auth.ts lists it). */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async () => ({ ok: true }));
};
