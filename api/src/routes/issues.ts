import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';

const MAX_ISSUES = 10;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ISSUES_DIR = join(__dirname, '..', '..', '..', 'issues');

mkdirSync(ISSUES_DIR, { recursive: true });

function countIssues(): number {
  return readdirSync(ISSUES_DIR).filter((f) => f.endsWith('.md')).length;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 6)
      .join('-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'issue'
  );
}

export async function issuesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/issues', async () => {
    return { count: countIssues(), max: MAX_ISSUES };
  });

  app.post<{ Body: { body?: string } }>('/api/issues', async (req, reply) => {
    const body = (req.body?.body ?? '').trim();
    if (!body) {
      return reply.code(400).send({ error: 'body is required' });
    }
    if (body.length > 5000) {
      return reply.code(400).send({ error: 'body too long (max 5000 chars)' });
    }
    if (countIssues() >= MAX_ISSUES) {
      return reply
        .code(409)
        .send({ error: 'max 10 open issues; resolve some before adding more' });
    }
    const now = new Date();
    const id = `${now.getTime()}-${slugify(body)}`;
    const file = join(ISSUES_DIR, `${id}.md`);
    const content =
      `---\n` +
      `id: ${id}\n` +
      `createdAt: ${now.toISOString()}\n` +
      `---\n\n` +
      `${body}\n`;
    writeFileSync(file, content, { flag: 'wx' });
    return { id, count: countIssues(), max: MAX_ISSUES };
  });
}
