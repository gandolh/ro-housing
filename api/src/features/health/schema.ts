import { z } from "zod";

/** `GET /api/health`: the deploy's health check reads the status, the body is for people. */
export const healthSchema = z.object({ ok: z.literal(true) });
