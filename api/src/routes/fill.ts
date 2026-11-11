import type { FastifyInstance, FastifyReply } from "fastify";
import type { DetailField } from "../details/extract.ts";
import { FillAnswerError, fillMessages, fillSchema, isDetailField, mergeFill } from "../details/fill.ts";
import { pageTexts } from "../details/pageText.ts";
import { normalizeListingUrl } from "../details/url.ts";
import { MAX_WAIT_SECONDS, WicketError, type WicketClient, type WicketJob } from "../lib/wicket.ts";
import { recordAiFill } from "./saved.ts";

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

/**
 * "Fill the gaps" on a Saved draft: one Wicket job per press, reading the
 * page text Fetch details kept (details/pageText.ts) for the fields the draft
 * still has empty. Registered only when `WICKET_URL` and `WICKET_TOKEN` are
 * both set; otherwise these routes are 404s. The browser never talks to
 * Wicket, and the token never leaves the server. Refresh, Fetch details and
 * the search adapters never call it.
 */
export async function fillRoutes(app: FastifyInstance, opts: { wicket: WicketClient }): Promise<void> {
  const { wicket } = opts;
  // The ids this app started: the form may see and cancel only those.
  const ownJobs = new Map<string, OwnJob>();

  const forgetOld = () => {
    const cutoff = Date.now() - FORGET_AFTER_MS;
    for (const [id, job] of ownJobs) if (job.startedAt < cutoff) ownJobs.delete(id);
  };

  const refused = (reply: FastifyReply, err: WicketError) =>
    err.code === "queue_full"
      ? reply.code(503).send({ error: "Wicket's queue is full; try again in a while." })
      : reply.code(502).send({ error: err.message });

  app.post<{ Body: { url?: unknown; missing?: unknown } }>("/api/saved/fill", async (req, reply) => {
    const url = typeof req.body?.url === "string" ? normalizeListingUrl(req.body.url) : undefined;
    const missing = req.body?.missing;
    if (!url || !Array.isArray(missing) || missing.length === 0 || !missing.every(isDetailField)) {
      return reply.code(400).send({ error: "Send the draft's link and the empty fields to fill." });
    }
    const fields = [...new Set(missing)];
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
      return refused(reply, err);
    }
  });

  app.get<{ Params: { id: string }; Querystring: { wait?: string } }>("/api/saved/fill/:id", async (req, reply) => {
    const { id } = req.params;
    const own = ownJobs.get(id);
    if (!own) return reply.code(404).send({ error: "not found" });
    const asked = Number(req.query.wait ?? 0);
    const wait = Number.isFinite(asked) ? Math.max(0, Math.min(MAX_WAIT_SECONDS, asked)) : 0;

    let job: WicketJob | undefined;
    try {
      job = await wicket.get(id, wait);
    } catch (err) {
      if (!(err instanceof WicketError)) throw err;
      return refused(reply, err);
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
  });

  app.delete<{ Params: { id: string } }>("/api/saved/fill/:id", async (req, reply) => {
    const { id } = req.params;
    if (!ownJobs.has(id)) return reply.code(404).send({ error: "not found" });
    ownJobs.delete(id);
    try {
      const job = await wicket.cancel(id);
      return job ? { ...view(id, job), error: job.error ?? null } : { id, status: "cancelled", error: LOST };
    } catch (err) {
      if (!(err instanceof WicketError)) throw err;
      return refused(reply, err);
    }
  });
}
