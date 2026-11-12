import { z } from "zod";

/** One source as the web's Sources panel reads it. */
const sourceSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  searchUrl: z.string().nullable(),
  enabled: z.boolean(),
  lastRunAt: z.number().nullable(),
  lastRunOk: z.boolean().nullable(),
  lastRunCount: z.number().nullable(),
});

export const sourceListSchema = z.array(sourceSchema);

export const sourceParamsSchema = z.object({ id: z.string() });

/** `PUT /api/sources/:id`: the two things the panel edits. A key left out is left as it is; `searchUrl: null` clears it. */
export const sourceUpdateSchema = z.object({
  searchUrl: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

export const sourceSavedSchema = z.object({ ok: z.literal(true) });
