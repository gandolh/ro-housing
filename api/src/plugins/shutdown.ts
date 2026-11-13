import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/** Why the signal aborted; a route that sees it answers `RESTARTING`. */
export const SHUTTING_DOWN = "the server is shutting down";

/** What a request cut by the shutdown answers (503). */
export const RESTARTING = "The server is restarting; try again in a moment.";

declare module "fastify" {
  interface FastifyInstance {
    /** Aborts when the app starts to close. Long jobs (a refresh, a Wicket poll) take it. */
    shutdownSignal: AbortSignal;
  }
}

/**
 * `app.close()` waits for every request in flight, so a job that takes minutes holds a shutdown until
 * `close-with-grace` gives up. This aborts `app.shutdownSignal` in `preClose`, which runs before that
 * wait (an `onClose` hook runs after it). Wrapped in `fastify-plugin`, so every feature sees the signal.
 */
const shutdownHook: FastifyPluginAsync = async (app) => {
  const controller = new AbortController();
  app.decorate("shutdownSignal", controller.signal);
  app.addHook("preClose", async () => {
    controller.abort(new Error(SHUTTING_DOWN));
  });
};

export const shutdown = fp(shutdownHook, { name: "shutdown" });
