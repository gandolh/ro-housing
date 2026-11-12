import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { errorSchema } from "../../lib/error-body.ts";
import { issueCreatedSchema, issueInputSchema, issueStatusSchema } from "./schema.ts";
import { createIssueStore, MAX_ISSUES } from "./store.ts";

/** What this feature takes from `buildApp`. */
export interface IssuesOptions {
  /** The folder the issues are written to (`issuesDir()` in config.ts); made when the plugin starts. */
  dir: string;
}

export const issuesRoutes: FastifyPluginAsyncZod<IssuesOptions> = async (app, { dir }) => {
  const issues = createIssueStore(dir);

  app.get("/api/issues", { schema: { response: { 200: issueStatusSchema } } }, async () => {
    return { count: issues.count(), max: MAX_ISSUES };
  });

  app.post(
    "/api/issues",
    { schema: { body: issueInputSchema, response: { 200: issueCreatedSchema, 400: errorSchema, 409: errorSchema } } },
    async (req, reply) => {
      if (issues.count() >= MAX_ISSUES) {
        return reply.code(409).send({ error: "max 10 open issues; resolve some before adding more" });
      }
      const id = issues.add(req.body.body, new Date());
      return { id, count: issues.count(), max: MAX_ISSUES };
    },
  );
};
