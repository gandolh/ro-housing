import type { FastifyInstance } from 'fastify';
import { getSource, listSources, updateSource } from '../db/queries.ts';

export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/sources', async () => {
    return listSources().map((s) => ({
      id: s.id,
      displayName: s.display_name,
      searchUrl: s.search_url,
      enabled: s.enabled === 1,
      lastRunAt: s.last_run_at,
      lastRunOk: s.last_run_ok === null ? null : s.last_run_ok === 1,
    }));
  });

  app.put<{
    Params: { id: string };
    Body: { searchUrl?: string | null; enabled?: boolean };
  }>('/api/sources/:id', async (req, reply) => {
    const existing = getSource(req.params.id);
    if (!existing) {
      return reply.code(404).send({ error: 'unknown source' });
    }
    updateSource(req.params.id, req.body);
    return { ok: true };
  });
}
