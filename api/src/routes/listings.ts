import type { FastifyInstance } from 'fastify';
import { listListings } from '../db/queries.ts';

type Sort = 'price' | 'sqm' | 'firstSeen' | 'lastSeen';
type Order = 'asc' | 'desc';

export async function listingsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { sort?: Sort; order?: Order; source?: string };
  }>('/api/listings', async (req) => {
    const sort: Sort = req.query.sort ?? 'lastSeen';
    const order: Order = req.query.order ?? 'desc';
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
  });
}
