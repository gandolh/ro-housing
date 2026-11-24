import { z } from "zod";

/** The longest report the form accepts. */
export const MAX_ISSUE_CHARS = 5000;

/** `GET /api/issues`: how many are open, and the cap. */
export const issueStatusSchema = z.object({ count: z.number(), max: z.number() });

/** `POST /api/issues`: the report's text. Surrounding spaces go before the length is checked. */
export const issueInputSchema = z.object(
  {
    body: z
      .string({ error: "body is required" })
      .trim()
      .min(1, "body is required")
      .max(MAX_ISSUE_CHARS, `body too long (max ${MAX_ISSUE_CHARS} chars)`),
  },
  { error: "body is required" },
);

/** What a saved report answers: its id (the file's name) and the new count. */
export const issueCreatedSchema = z.object({ id: z.string(), count: z.number(), max: z.number() });
