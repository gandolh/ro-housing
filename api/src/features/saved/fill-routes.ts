import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { errorSchema } from "../../lib/error-body.ts";
import { normalizeListingUrl } from "../../lib/url.ts";
import { RESTARTING } from "../../plugins/shutdown.ts";
import { MAX_WAIT_SECONDS, WicketError, type WicketClient, type WicketJob } from "../../lib/wicket.ts";
import type { DetailField } from "./details/extract.ts";
import { FillAnswerError, fillMessages, fillSchema, mergeFill } from "./details/fill.ts";
import { pageTexts } from "./details/pageText.ts";
import { recordAiFill } from "./routes.ts";
import {
  FILL_REQUEST,
  fillInputSchema,
  fillJobSchema,
  fillParamsSchema,
  fillQuerySchema,
  fillViewSchema,
} from "./schema.ts";

/** A job this app started: whose page it reads and what it asked for. */
interface OwnJob {
  url: string;
  fields: DetailField[];
  startedAt: number;
}

/** Wicket keeps a finished answer 10 minutes and the form polls until the
 *  job ends, so an id older than this is long gone on Wicket's side too. */
const FORGET_AFTER_MS = 2 * 60 * 60_000;

/** The part of a job the form sees: never Wicket's id for another app's job. */
function view(id: string, job: WicketJob) {
  return { id, ticket: job.ticket, nowServing: job.nowServing, position: job.position, status: job.status };
}

const LOST = "Wicket lost the job; press Fill the gaps again.";

/** What this feature takes from `buildApp`. */
export interface FillOptions {
  wicket: WicketClient;
}

/** The status and sentence for a Wicket that refused or could not be reached. */
function refusal(err: WicketError): { status: 502 | 503; error: string } {
  return err.code === "queue_full"
    ? { status: 503, error: "Wicket's queue is full; try again in a while." }
    : { status: 502, error: err.message };
}

/**
 * "Fill the gaps" on a Saved draft: one Wicket job per press, reading the
 * page text Fetch details kept (details/pageText.ts) for the fields the draft
 * still has empty. Registered only when `WICKET_URL` and `WICKET_TOKEN` are
 * both set; otherwise these routes are 404s. The browser never talks to
 * Wicket, and the token never leaves the server. Refresh, Fetch details and
 * the search adapters never call it.
 */
export const fillRoutes: FastifyPluginAsyncZod<FillOptions> = async (app, { wicket }) => {
  // The ids this app started: the form may see and cancel only those.
  const ownJobs = new Map<string, OwnJob>();

  const forgetOld = () => {
    const cutoff = Date.now() - FORGET_AFTER_MS;
    for (const [id, job] of ownJobs) if (job.startedAt < cutoff) ownJobs.delete(id);
  };

  app.post(
    "/api/saved/fill",
    {
      schema: {
        body: fillInputSchema,
        response: { 202: fillViewSchema, 400: errorSchema, 409: errorSchema, 502: errorSchema, 503: errorSchema },
      },
    },
    async (req, reply) => {
      const url = normalizeListingUrl(req.body.url);
      if (!url) return reply.code(400).send({ error: FILL_REQUEST });
      const fields = [...new Set(req.body.missing)];
      const text = pageTexts.get(url);
      if (!text) {
        return reply
          .code(409)
          .send({ error: "The page is no longer at hand: press Fetch details first, then Fill the gaps." });
      }

      forgetOld();
      try {
        const job = await wicket.submit(fillMessages(text, fields), fillSchema(fields));
        ownJobs.set(job.id, { url, fields, startedAt: Date.now() });
        return reply.code(202).send(view(job.id, job));
      } catch (err) {
        if (!(err instanceof WicketError)) throw err;
        req.log.warn({ url, msg: err.message }, "fill the gaps: Wicket refused the job");
        const { status, error } = refusal(err);
        return reply.code(status).send({ error });
      }
    },
  );

  app.get(
    "/api/saved/fill/:id",
    {
      schema: {
        params: fillParamsSchema,
        querystring: fillQuerySchema,
        response: { 200: fillJobSchema, 404: errorSchema, 502: errorSchema, 503: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const own = ownJobs.get(id);
      if (!own) return reply.code(404).send({ error: "not found" });
      const asked = Number(req.query.wait ?? 0);
      const wait = Number.isFinite(asked) ? Math.max(0, Math.min(MAX_WAIT_SECONDS, asked)) : 0;

      let job: WicketJob | undefined;
      try {
        job = await wicket.get(id, wait, app.shutdownSignal);
      } catch (err) {
        // The shutdown cut the poll; Wicket still has the job, and the form polls again once the app is back.
        if (app.shutdownSignal.aborted) return reply.code(503).send({ error: RESTARTING });
        if (!(err instanceof WicketError)) throw err;
        const { status, error } = refusal(err);
        return reply.code(status).send({ error });
      }
      if (!job) {
        ownJobs.delete(id);
        return { id, status: "cancelled", error: LOST };
      }
      if (job.status === "queued" || job.status === "running") return view(id, job);

      ownJobs.delete(id);
      if (job.status !== "done") return { ...view(id, job), error: job.error ?? null };
      try {
        const values = mergeFill(job.result?.text ?? "", own.fields);
        const model = job.result?.model ?? "";
        recordAiFill(own.url, model, values);
        return { ...view(id, job), values, model };
      } catch (err) {
        if (!(err instanceof FillAnswerError)) throw err;
        req.log.warn({ url: own.url }, `fill the gaps: ${err.message}`);
        return { ...view(id, job), status: "failed", error: err.message };
      }
    },
  );

  app.delete(
    "/api/saved/fill/:id",
    {
      schema: {
        params: fillParamsSchema,
        response: { 200: fillJobSchema, 404: errorSchema, 502: errorSchema, 503: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      if (!ownJobs.has(id)) return reply.code(404).send({ error: "not found" });
      ownJobs.delete(id);
      try {
        const job = await wicket.cancel(id);
        return job ? { ...view(id, job), error: job.error ?? null } : { id, status: "cancelled", error: LOST };
      } catch (err) {
        if (!(err instanceof WicketError)) throw err;
        const { status, error } = refusal(err);
        return reply.code(status).send({ error });
      }
    },
  );
};
