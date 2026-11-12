import { z } from "zod";

const LISTING_SORTS = ["price", "sqm", "firstSeen", "lastSeen"] as const;

/** `GET /api/listings?sort=&order=&source=`: every key is optional, and the Listings page sends only the ones it set. */
export const listingQuerySchema = z.object({
  sort: z.enum(LISTING_SORTS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  source: z.string().optional(),
});

/** One listing with its price history, as the Listings table reads it. */
const listingSchema = z.object({
  id: z.number(),
  sourceId: z.string(),
  sourceUid: z.string(),
  url: z.string(),
  title: z.string().nullable(),
  priceEur: z.number().nullable(),
  pricePlusVat: z.boolean(),
  rooms: z.number().nullable(),
  sqm: z.number().nullable(),
  location: z.string().nullable(),
  firstSeen: z.number(),
  lastSeen: z.number(),
  history: z.array(z.object({ observedAt: z.number(), priceEur: z.number().nullable() })),
});

export const listingListSchema = z.array(listingSchema);
