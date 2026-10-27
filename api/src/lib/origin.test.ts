import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_WEB_ORIGINS, originAllowed, refuseOtherOrigins, webOrigins } from './origin.ts';

describe('webOrigins', () => {
  it('defaults to the Vite dev origin under both names', () => {
    expect([...webOrigins(undefined)]).toEqual(DEFAULT_WEB_ORIGINS);
    expect(webOrigins('')).toEqual(new Set(DEFAULT_WEB_ORIGINS));
  });

  it('reads a comma-separated override and drops trailing slashes', () => {
    expect(webOrigins(' http://localhost:5174/ , http://127.0.0.1:5174 ')).toEqual(
      new Set(['http://localhost:5174', 'http://127.0.0.1:5174']),
    );
  });
});

describe('originAllowed', () => {
  const allowed = new Set(DEFAULT_WEB_ORIGINS);

  it('lets through a request with no Origin, or the app’s own', () => {
    expect(originAllowed(undefined, allowed)).toBe(true);
    expect(originAllowed('http://127.0.0.1:5173', allowed)).toBe(true);
    expect(originAllowed('http://localhost:5173', allowed)).toBe(true);
  });

  it('refuses any other origin, including "null" and other local ports', () => {
    expect(originAllowed('https://evil.example', allowed)).toBe(false);
    expect(originAllowed('null', allowed)).toBe(false);
    expect(originAllowed('http://localhost:5174', allowed)).toBe(false);
    expect(originAllowed('http://127.0.0.1:3000', allowed)).toBe(false);
  });
});

// A bare Fastify instance with the hook and stand-in routes, driven with
// inject(): nothing listens on a port and the real database is not opened.
describe('refuseOtherOrigins', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    refuseOtherOrigins(app, new Set(DEFAULT_WEB_ORIGINS));
    await app.register(async (routes: FastifyInstance) => {
      routes.get('/api/saved', async () => [{ notes: 'private' }]);
      routes.post('/api/issues', async () => ({ id: 'written' }));
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers 403 to another website, for reads and for form posts', async () => {
    const read = await app.inject({
      method: 'GET',
      url: '/api/saved',
      headers: { origin: 'https://evil.example' },
    });
    expect(read.statusCode).toBe(403);
    expect(read.json()).toEqual({ error: 'requests from other websites are refused' });

    // A plain HTML form post: no CORS preflight, so only the Origin check stops it.
    const post = await app.inject({
      method: 'POST',
      url: '/api/issues',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'body=planted',
    });
    expect(post.statusCode).toBe(403);
  });

  it('answers 403 to a preflight from another website and sends no CORS headers', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/issues',
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'POST',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers 403 to Origin "null" (sandboxed frames, file pages)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/saved', headers: { origin: 'null' } });
    expect(res.statusCode).toBe(403);
  });

  it('serves requests with no Origin', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/saved' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ notes: 'private' }]);
  });

  it('serves the app’s own origin, as the Vite proxy passes it on', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/issues',
      headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' },
      payload: { body: 'real feedback' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'written' });
  });
});
