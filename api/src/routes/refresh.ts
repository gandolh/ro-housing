import type { FastifyInstance } from 'fastify';
import { ADAPTER_REGISTRY } from '../adapters/index.ts';
import {
  listSources,
  markSourceRun,
  upsertListingWithSnapshot,
} from '../db/queries.ts';

export async function refreshRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/refresh', async () => {
    const sources = listSources();
    const results: {
      id: string;
      ok: boolean;
      count: number;
      errorMsg?: string;
    }[] = [];

    for (const src of sources) {
      if (src.enabled !== 1 || !src.search_url) continue;
      const adapter = ADAPTER_REGISTRY[src.id];
      if (!adapter) {
        results.push({
          id: src.id,
          ok: false,
          count: 0,
          errorMsg: 'no adapter registered',
        });
        markSourceRun(src.id, false);
        continue;
      }
      try {
        const scraped = await adapter.scrape(src.search_url);
        const now = Date.now();
        for (const row of scraped) {
          upsertListingWithSnapshot(src.id, row, now);
        }
        markSourceRun(src.id, true);
        results.push({ id: src.id, ok: true, count: scraped.length });
      } catch (err) {
        app.log.error({ err, sourceId: src.id }, 'adapter failed');
        markSourceRun(src.id, false);
        results.push({
          id: src.id,
          ok: false,
          count: 0,
          errorMsg: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { perSource: results };
  });
}
