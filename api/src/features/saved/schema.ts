import { z } from "zod";
import { normalizeListingUrl } from "../../lib/url.ts";
import type { DetailField } from "./details/extract.ts";
import { PARTITIONINGS } from "./details/extract.ts";
import { isDetailField } from "./details/fill.ts";

// What `PUT /api/saved/:id` and `POST /api/saved` take, as the form confirms it. Only `url` is required:
// a blocked page still gets saved, with whatever the user typed in. Every message is a sentence the form
// shows as it is. Request schemas may transform: the provider only decodes a request.

/** A text field: trimmed, at most `max` characters, and null when empty or left out. */
function textField(key: string, max: number) {
  return z
    .string({ error: `${key} must be text` })
    .trim()
    .max(max, `${key} is too long (max ${max} characters)`)
    .transform((text) => text || null)
    .nullish()
    .transform((text) => text ?? null);
}

/** A number field: null when empty (`""` too) or left out; else a number within the range, whole when `integer`. */
function numberField(key: string, lo: number, hi: () => number, integer: boolean) {
  const range = () => `${key} must be between ${lo} and ${hi()}`;
  let number = z.number({ error: `${key} must be a number` });
  if (integer) number = number.int(`${key} must be a whole number`);
  return z.preprocess(
    (value) => (value === "" ? null : value),
    number
      .refine((value) => value >= lo && value <= hi(), { error: range })
      .nullish()
      .transform((value) => value ?? null),
  );
}

const fixed = (n: number) => () => n;

export const savedInputSchema = z
  .object(
    {
      url: z.unknown().transform((value, ctx) => {
        const url = normalizeListingUrl(typeof value === "string" ? value : "");
        if (!url || url.length > 2_000) {
          ctx.addIssue({ code: "custom", message: "url must be an http(s) link" });
          return z.NEVER;
        }
        return url;
      }),
      imageUrl: textField("imageUrl", 2_000).refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), {
        error: "imageUrl must be an http(s) link",
      }),
      partitioning: textField("partitioning", 20).refine(
        (value) => value === null || (PARTITIONINGS as readonly string[]).includes(value),
        { error: `partitioning must be one of ${PARTITIONINGS.join(", ")}` },
      ),
      pricePlusVat: z
        .boolean({ error: "pricePlusVat must be true or false" })
        .nullish()
        .transform((value) => value === true),
      floor: numberField("floor", -2, fixed(60), true),
      floorsTotal: numberField("floorsTotal", 0, fixed(60), true),
      title: textField("title", 300),
      priceEur: numberField("priceEur", 0, fixed(50_000_000), true),
      rooms: numberField("rooms", 1, fixed(20), true),
      sqm: numberField("sqm", 1, fixed(2_000), false),
      // The newest year is read when a request arrives, not when the module loads.
      yearBuilt: numberField("yearBuilt", 1800, () => new Date().getFullYear() + 5, true),
      location: textField("location", 120),
      notes: textField("notes", 5_000),
    },
    { error: "expected a JSON object" },
  )
  .refine(({ floor, floorsTotal }) => floor === null || floorsTotal === null || floor <= floorsTotal, {
    error: "floor is above the number of floors in the building",
  });

export type SavedInput = z.infer<typeof savedInputSchema>;

/** `:id` in the path, as a positive whole number. */
export const savedParamsSchema = z.object({
  id: z.coerce.number({ error: "bad id" }).int("bad id").positive("bad id"),
});

// What the routes send: output schemas, no transforms.

/** A saved apartment as the web's Saved page reads it. */
export const savedSchema = z.object({
  id: z.number(),
  url: z.string(),
  site: z.string(),
  title: z.string().nullable(),
  priceEur: z.number().nullable(),
  pricePlusVat: z.boolean(),
  rooms: z.number().nullable(),
  sqm: z.number().nullable(),
  floor: z.number().nullable(),
  floorsTotal: z.number().nullable(),
  yearBuilt: z.number().nullable(),
  location: z.string().nullable(),
  partitioning: z.string().nullable(),
  imageUrl: z.string().nullable(),
  notes: z.string().nullable(),
  fetchedAt: z.number().nullable(),
  savedAt: z.number(),
  updatedAt: z.number(),
});

export const savedListSchema = z.array(savedSchema);

/** `POST /api/saved/scrape`: the page's own words as a draft the user confirms, each field null when the page did not say. */
const draftSchema = z.object({
  title: z.string().nullable(),
  priceEur: z.number().nullable(),
  rooms: z.number().nullable(),
  sqm: z.number().nullable(),
  floor: z.number().nullable(),
  floorsTotal: z.number().nullable(),
  yearBuilt: z.number().nullable(),
  location: z.string().nullable(),
  partitioning: z.string().nullable(),
  imageUrl: z.string().nullable(),
  pricePlusVat: z.boolean().nullable(),
});

/** What the draft form is told when the link is missing or is not one. */
export const SCRAPE_LINK = "Paste a full link, starting with http:// or https://";

export const scrapeInputSchema = z
  .object({ url: z.string({ error: SCRAPE_LINK }).optional() }, { error: SCRAPE_LINK })
  .nullish();

export const scrapeResultSchema = z.object({
  url: z.string(),
  site: z.string(),
  existing: savedSchema.nullable(),
  fillable: z.boolean(),
  draft: draftSchema.nullable(),
  found: z.array(z.string()),
  via: z.enum(["fetch", "browser"]).nullable(),
  problem: z.object({ kind: z.string(), message: z.string() }).nullable(),
});

// "Fill the gaps".

/** Every complaint about the fill request is this one sentence. */
export const FILL_REQUEST = "Send the draft's link and the empty fields to fill.";

export const fillInputSchema = z.object(
  {
    url: z.string({ error: FILL_REQUEST }),
    missing: z
      .array(z.custom<DetailField>(isDetailField, { error: FILL_REQUEST }), { error: FILL_REQUEST })
      .min(1, FILL_REQUEST),
  },
  { error: FILL_REQUEST },
);

/** `?wait=` is a number of seconds as text. Anything else reads as 0, so the route clamps it itself. */
export const fillQuerySchema = z.object({ wait: z.string().optional() });

export const fillParamsSchema = z.object({ id: z.string() });

/** The part of a job the form sees: Wicket's own id for another app's job never reaches it. */
export const fillViewSchema = z.object({
  id: z.string(),
  ticket: z.number(),
  nowServing: z.number(),
  position: z.number(),
  status: z.string(),
});

/** A job's state: its view (or just `id` and `status` when Wicket lost it), plus the reason it ended or the values it gave. */
export const fillJobSchema = z.object({
  id: z.string(),
  ticket: z.number().optional(),
  nowServing: z.number().optional(),
  position: z.number().optional(),
  status: z.string(),
  error: z.string().nullable().optional(),
  values: z.record(z.string(), z.unknown()).optional(),
  model: z.string().optional(),
});
