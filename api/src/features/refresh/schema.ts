import { z } from "zod";

/** What one source's run came to. `errorMsg` is on a failed run, `warning` on a run that found nothing. */
const sourceRunSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  count: z.number(),
  errorMsg: z.string().optional(),
  warning: z.string().optional(),
});

/** `POST /api/refresh`: one entry per source that ran, in the order they ran. */
export const refreshResultSchema = z.object({ perSource: z.array(sourceRunSchema) });
