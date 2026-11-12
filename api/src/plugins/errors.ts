import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/** What a 500 answers: a fixed sentence. The thrown message is logged and never sent. */
export const INTERNAL_ERROR_MESSAGE = "Something went wrong on the server.";

/** The status a thrown value carries, if it carries one (Fastify's own errors and its plugins' do). */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

/**
 * The one error handler. Wrapped in `fastify-plugin`, so it is set on the root and every feature
 * inherits it. Every reply is the repo's body, `{ error: string }`, which the web reads.
 *
 * - A 4xx that Fastify or a plugin raised (a body that is not JSON, a body too large) keeps its status
 *   and its message, which were written for clients.
 * - Anything else is a 500 with a fixed message, logged with the request. A thrown message never reaches
 *   the client.
 */
const errorHandling: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: unknown, request, reply) => {
    const status = statusOf(error);
    if (status !== undefined && status >= 400 && status < 500) {
      const message = error instanceof Error ? error.message : "The request is not valid.";
      return reply.code(status).send({ error: message });
    }
    request.log.error({ err: error }, "unhandled error");
    return reply.code(500).send({ error: INTERNAL_ERROR_MESSAGE });
  });
};

export const errors = fp(errorHandling, { name: "errors" });
