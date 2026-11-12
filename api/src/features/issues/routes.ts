import type { FastifyPluginAsync } from "fastify";
import { createIssueStore, MAX_ISSUES } from "./store.ts";

/** What this feature takes from `buildApp`. */
export interface IssuesOptions {
  /** The folder the issues are written to (`issuesDir()` in config.ts); made when the plugin starts. */
  dir: string;
}

export const issuesRoutes: FastifyPluginAsync<IssuesOptions> = async (app, { dir }) => {
  const issues = createIssueStore(dir);

  app.get("/api/issues", async () => {
    return { count: issues.count(), max: MAX_ISSUES };
  });

  app.post<{ Body: { body?: string } }>("/api/issues", async (req, reply) => {
    const body = (req.body?.body ?? "").trim();
    if (!body) {
      return reply.code(400).send({ error: "body is required" });
    }
    if (body.length > 5000) {
      return reply.code(400).send({ error: "body too long (max 5000 chars)" });
    }
    if (issues.count() >= MAX_ISSUES) {
      return reply.code(409).send({ error: "max 10 open issues; resolve some before adding more" });
    }
    const id = issues.add(body, new Date());
    return { id, count: issues.count(), max: MAX_ISSUES };
  });
};
