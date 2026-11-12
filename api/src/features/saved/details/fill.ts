import type { ChatMessage } from "../../../lib/wicket.ts";
import { DETAIL_FIELDS, PARTITIONINGS, sane, type DetailField, type DetailFields } from "./extract.ts";

/**
 * Each field as the model is told it: the Romanian words a listing uses and
 * the conventions the extractor follows, as in the research's prompt
 * (docs/research-firecrawl-ollama.md).
 */
const FIELD_HINTS: Record<DetailField, string> = {
  title: "the listing's headline (titlu), as the page writes it",
  priceEur: "the asking price in euro (preț), a whole number; not the price per m²",
  rooms: "the number of rooms (camere); a garsonieră is 1",
  sqm: "the usable area in m² (suprafață utilă), not the built area (construită)",
  floor: 'the flat\'s floor (etaj): "parter" is 0, "demisol" or "subsol" is -1',
  floorsTotal: 'the building\'s top floor (regim de înălțime): "P+4" is 4, "D+P+2" is 2, "P+10E" is 10',
  yearBuilt: "the year the building was finished (an construcție)",
  location: "the neighbourhood or street (zona, cartier), not the city",
  partitioning: `the layout (compartimentare), one of ${PARTITIONINGS.join(", ")}`,
  imageUrl: "the listing's main photo, an absolute http(s) link",
};

const NUMBER_FIELDS = new Set<DetailField>(["priceEur", "rooms", "sqm", "floor", "floorsTotal", "yearBuilt"]);

export function isDetailField(value: unknown): value is DetailField {
  return typeof value === "string" && (DETAIL_FIELDS as string[]).includes(value);
}

/** The messages for one page: the fields asked for, then the page text. */
export function fillMessages(text: string, fields: DetailField[]): ChatMessage[] {
  const system = [
    "You read one Romanian apartment listing page and return these fields as JSON:",
    ...fields.map((f) => `- ${f}: ${FIELD_HINTS[f]}`),
    "When the page does not give a field, return null. Never guess.",
    'Read only this listing; ignore "similar listings" and other flats on the page.',
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: text },
  ];
}

/** Ollama's `format`: a JSON schema with every asked field nullable, and
 *  partitioning held to its four values. */
export function fillSchema(fields: DetailField[]): Record<string, unknown> {
  const property = (f: DetailField) =>
    f === "partitioning"
      ? { type: ["string", "null"], enum: [...PARTITIONINGS, null] }
      : { type: [NUMBER_FIELDS.has(f) ? "number" : "string", "null"] };
  return {
    type: "object",
    properties: Object.fromEntries(fields.map((f) => [f, property(f)])),
    required: fields,
    additionalProperties: false,
  };
}

/** Thrown when the model's answer is not a JSON object. */
export class FillAnswerError extends Error {}

/**
 * The model's answer as values for the asked fields only: anything else is
 * dropped, a value of the wrong type is dropped, and the rest go through the
 * extractor's sanity ranges (`sane()`). Only non-null values come back, so
 * the form never blanks a field because of the model.
 */
export function mergeFill(answer: string, fields: DetailField[]): Partial<DetailFields> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    throw new FillAnswerError("The model's answer was not JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FillAnswerError("The model's answer was not a JSON object.");
  }
  const given = parsed as Record<string, unknown>;

  const draft = {
    ...Object.fromEntries(DETAIL_FIELDS.map((f) => [f, null])),
    pricePlusVat: null,
  } as unknown as DetailFields;
  const raw = draft as unknown as Record<DetailField, unknown>;
  for (const field of fields) {
    const value = given[field];
    if (NUMBER_FIELDS.has(field)) {
      if (typeof value === "number" && Number.isFinite(value)) raw[field] = value;
    } else if (field === "partitioning") {
      if ((PARTITIONINGS as readonly unknown[]).includes(value)) raw[field] = value;
    } else if (field === "imageUrl") {
      if (typeof value === "string" && /^https?:\/\/\S+$/.test(value.trim())) raw[field] = value.trim();
    } else if (typeof value === "string" && value.trim()) {
      raw[field] = value.trim();
    }
  }

  const checked = sane(draft);
  const out: Partial<DetailFields> = {};
  for (const field of fields) {
    const value = checked[field];
    if (value !== null) (out as Record<string, unknown>)[field] = value;
  }
  return out;
}
