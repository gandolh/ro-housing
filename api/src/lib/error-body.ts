import { z } from "zod";

/** Every error reply, the one body the web reads: `error` holds the sentence it shows. */
export const errorSchema = z.object({ error: z.string() });
