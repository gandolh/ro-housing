import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { listingListSchema, listingQuerySchema } from "./schema.ts";
import { listListings } from "./store.ts";

export const listingsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/api/listings",
    { schema: { querystring: listingQuerySchema, response: { 200: listingListSchema } } },
    async (req) => {
      const sort = req.query.sort ?? "lastSeen";
      const order = req.query.order ?? "desc";
      const rows = listListings({ sort, order, source: req.query.source });
      return rows.map((r) => ({
        id: r.id,
        sourceId: r.source_id,
        sourceUid: r.source_uid,
        url: r.url,
        title: r.title,
        priceEur: r.price_eur,
        // NULL on rows from before the column, read as "not marked".
        pricePlusVat: r.price_plus_vat === 1,
        rooms: r.rooms,
        sqm: r.sqm,
        location: r.location,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen,
        history: r.history.map((h) => ({
          observedAt: h.observed_at,
          priceEur: h.price_eur,
        })),
      }));
    },
  );
};
