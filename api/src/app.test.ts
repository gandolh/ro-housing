import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The real app on a throwaway database: set before the database module loads.
const issues = mkdtempSync(join(tmpdir(), 'ro-housing-app-test-'));
process.env.RO_HOUSING_DB = ':memory:';
process.env.RO_HOUSING_ISSUES_DIR = issues;

const { buildApp, stripApiPrefix } = await import('./app.ts');
const { seedUser } = await import('./accounts.ts');

const PUBLIC = 'https://example.com';

describe('stripApiPrefix', () => {
  it('takes /ro-housing-api off the front, and nothing else', () => {
    expect(stripApiPrefix('/ro-housing-api/api/health')).toBe('/api/health');
    expect(stripApiPrefix('/ro-housing-api')).toBe('/');
    expect(stripApiPrefix('/ro-housing-api?x=1')).toBe('/?x=1');
    expect(stripApiPrefix('/ro-housing-apix/api')).toBe('/ro-housing-apix/api');
    expect(stripApiPrefix('/api/health')).toBe('/api/health');
  });
});

describe('the API behind sign-in', () => {
  let app: FastifyInstance;
  let cookie = '';

  beforeAll(async () => {
    app = await buildApp({ publicOrigin: PUBLIC, ward: undefined, trustedProxies: [], bindHost: '0.0.0.0' });
    await seedUser(app.accounts, { username: 'owner', password: 'a long test passphrase' });
  });
  afterAll(async () => {
    await app.close();
    rmSync(issues, { recursive: true, force: true });
  });

  it('answers the health check with no session, with or without the prefix', async () => {
    for (const url of ['/api/health', '/ro-housing-api/api/health']) {
      const res = await app.inject({ url, headers: { host: 'example.com' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    }
  });

  it('refuses every other /api route without a session', async () => {
    for (const [method, url] of [
      ['GET', '/api/listings'],
      ['GET', '/api/sources'],
      ['GET', '/api/saved'],
      ['POST', '/api/refresh'],
      ['GET', '/ro-housing-api/api/issues'],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('has no sign-up and no rename', async () => {
    const register = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: { origin: PUBLIC },
      payload: { username: 'someone', password: 'another long passphrase' },
    });
    // Not a route: the guard answers before the 404 would.
    expect([401, 404]).toContain(register.statusCode);
    const asSomeone = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: PUBLIC },
      payload: { username: 'someone', password: 'another long passphrase' },
    });
    expect(asSomeone.statusCode).toBe(401);
    const rename = await app.inject({
      method: 'POST',
      url: '/auth/username',
      headers: { origin: PUBLIC },
      payload: { username: 'renamed' },
    });
    expect([401, 404]).toContain(rename.statusCode);
  });

  it('signs the seeded account in from the public origin, and the session reads and writes', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/ro-housing-api/auth/login',
      headers: { origin: PUBLIC, host: 'example.com' },
      payload: { username: 'owner', password: 'a long test passphrase' },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = String(login.headers['set-cookie']);
    expect(setCookie).toMatch(/^ro_housing_session=/);
    expect(setCookie).toMatch(/Path=\/ro-housing-api/);
    cookie = setCookie.split(';')[0]!;

    const sources = await app.inject({ url: '/api/sources', headers: { cookie, host: 'example.com' } });
    expect(sources.statusCode).toBe(200);
    expect(sources.json().map((s: { id: string }) => s.id)).toContain('imobiliare-feed');

    const save = await app.inject({
      method: 'PUT',
      url: '/ro-housing-api/api/sources/storia',
      headers: { cookie, origin: PUBLIC, host: 'example.com' },
      payload: { enabled: false },
    });
    expect(save.statusCode).toBe(200);
  });

  it('keeps the Host and Origin guards in front of the session', async () => {
    const rebound = await app.inject({ url: '/api/sources', headers: { cookie, host: 'evil.example' } });
    expect(rebound.statusCode).toBe(403);
    const otherSite = await app.inject({
      method: 'PUT',
      url: '/api/sources/storia',
      headers: { cookie, origin: 'https://evil.example', host: 'example.com' },
      payload: { enabled: true },
    });
    expect(otherSite.statusCode).toBe(403);
  });

  it('offers a signed-in session no rename', async () => {
    const rename = await app.inject({
      method: 'POST',
      url: '/auth/username',
      headers: { cookie, origin: PUBLIC },
      payload: { username: 'renamed' },
    });
    expect(rename.statusCode).toBe(404);
  });

  it('refuses a wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: PUBLIC },
      payload: { username: 'owner', password: 'not the passphrase' },
    });
    expect(res.statusCode).toBe(401);
  });
});
