/**
 * Wicket, the estate's one queue for LLM calls. It holds the Ollama Cloud
 * key, runs one call at a time, first come first served, gives every call a
 * ticket and picks the model. ro-housing asks it only when the user presses
 * "Fill the gaps" (routes/fill.ts); nothing automatic ever does.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

/** A job as Wicket reports it. `position` 1 runs next, 0 once it runs. */
export interface WicketJob {
  id: string;
  ticket: number;
  nowServing: number;
  position: number;
  status: JobStatus;
  /** On `done` only: the answer (for `format`, JSON as a string) and the model. */
  result?: { text: string; model: string };
  /** Why it failed, or who cancelled it. Never the prompt. */
  error?: string;
}

/** Wicket refused the call or could not be reached. `code` is Wicket's own, when it gave one. */
export class WicketError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "WicketError";
    this.code = code;
  }
}

export interface WicketClient {
  /** Joins the queue. The body is exactly `{ messages, format }`: Wicket answers 400 to any other field. */
  submit(messages: ChatMessage[], format: unknown): Promise<WicketJob>;
  /** The job, after up to `waitSeconds` (at most 25) for a change; undefined once Wicket has forgotten it. */
  get(id: string, waitSeconds: number): Promise<WicketJob | undefined>;
  /** Cancels a job this app started; undefined once Wicket has forgotten it. */
  cancel(id: string): Promise<WicketJob | undefined>;
}

/** The longest long-poll Wicket honours. */
export const MAX_WAIT_SECONDS = 25;

/** On top of a long-poll, before a request counts as hung. */
const SLACK_MS = 15_000;

export function wicketClient({
  url,
  token,
  fetch = globalThis.fetch,
}: {
  url: string;
  token: string;
  fetch?: typeof globalThis.fetch;
}): WicketClient {
  const base = url.replace(/\/+$/, "");

  async function call(method: string, path: string, timeoutMs: number, body?: unknown): Promise<Response> {
    try {
      return await fetch(`${base}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      throw new WicketError(timedOut ? "Wicket did not answer in time." : "Could not reach Wicket.");
    }
  }

  async function refusal(res: Response): Promise<WicketError> {
    const body = (await res.json().catch(() => undefined)) as { code?: string; message?: string } | undefined;
    return new WicketError(`Wicket answered ${res.status}${body?.message ? `: ${body.message}` : ""}`, body?.code);
  }

  const jobPath = (id: string) => `/v1/jobs/${encodeURIComponent(id)}`;

  return {
    async submit(messages, format) {
      const res = await call("POST", "/v1/jobs", SLACK_MS, { messages, format });
      if (res.status !== 202) throw await refusal(res);
      return (await res.json()) as WicketJob;
    },
    async get(id, waitSeconds) {
      const wait = Math.max(0, Math.min(MAX_WAIT_SECONDS, Math.floor(waitSeconds)));
      const res = await call("GET", `${jobPath(id)}${wait > 0 ? `?wait=${wait}` : ""}`, wait * 1000 + SLACK_MS);
      if (res.status === 404) return undefined;
      if (!res.ok) throw await refusal(res);
      return (await res.json()) as WicketJob;
    },
    async cancel(id) {
      const res = await call("DELETE", jobPath(id), SLACK_MS);
      if (res.status === 404) return undefined;
      if (!res.ok) throw await refusal(res);
      return (await res.json()) as WicketJob;
    },
  };
}
