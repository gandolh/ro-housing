import Fastify, { type FastifyInstance } from 'fastify';
import { connect } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_HOSTNAMES,
  allowedHostnames,
  hostAllowed,
  hostnameOf,
  refuseOtherHosts,
} from './host.ts';

describe('allowedHostnames', () => {
  it('defaults to this machine’s names', () => {
    expect(allowedHostnames(undefined)).toEqual(new Set(DEFAULT_HOSTNAMES));
    expect(allowedHostnames('')).toEqual(new Set(DEFAULT_HOSTNAMES));
    expect(allowedHostnames('127.0.0.1')).toEqual(new Set(DEFAULT_HOSTNAMES));
  });

  it('adds HOST when it binds another address, IPv6 in brackets', () => {
    expect(allowedHostnames('192.168.1.20')).toEqual(
      new Set([...DEFAULT_HOSTNAMES, '192.168.1.20']),
    );
    expect(allowedHostnames('FE80::1').has('[fe80::1]')).toBe(true);
    expect(allowedHostnames('[fe80::1]').has('[fe80::1]')).toBe(true);
  });
});

describe('hostnameOf', () => {
  it('drops the port and lowercases', () => {
    expect(hostnameOf('localhost:3000')).toBe('localhost');
    expect(hostnameOf('LocalHost')).toBe('localhost');
    expect(hostnameOf('127.0.0.1:5173')).toBe('127.0.0.1');
    expect(hostnameOf('[::1]:3000')).toBe('[::1]');
    expect(hostnameOf('[::1]')).toBe('[::1]');
    expect(hostnameOf('evil.example:3000')).toBe('evil.example');
  });

  it('gives nothing for a missing, empty or malformed header', () => {
    expect(hostnameOf(undefined)).toBeUndefined();
    expect(hostnameOf('')).toBeUndefined();
    expect(hostnameOf('  ')).toBeUndefined();
    expect(hostnameOf('localhost:evil')).toBeUndefined();
    expect(hostnameOf('user@localhost')).toBeUndefined();
    expect(hostnameOf('::1')).toBeUndefined();
  });
});

describe('hostAllowed', () => {
  const allowed = new Set(DEFAULT_HOSTNAMES);

  it('compares the hostname only, whatever the port', () => {
    expect(hostAllowed('localhost:3000', allowed)).toBe(true);
    expect(hostAllowed('localhost:3017', allowed)).toBe(true);
    expect(hostAllowed('127.0.0.1', allowed)).toBe(true);
    expect(hostAllowed('[::1]:3000', allowed)).toBe(true);
  });

  it('refuses another name, even one that resolves here', () => {
    expect(hostAllowed('evil.example:3000', allowed)).toBe(false);
    expect(hostAllowed('localhost.evil.example:3000', allowed)).toBe(false);
    expect(hostAllowed('127.0.0.1.nip.io:3000', allowed)).toBe(false);
    expect(hostAllowed(undefined, allowed)).toBe(false);
  });
});

// A bare Fastify instance with the hook and stand-in routes, driven with
// inject(): nothing listens on a port and the real database is not opened.
async function appWith(allowed: ReadonlySet<string>): Promise<FastifyInstance> {
  const app = Fastify();
  refuseOtherHosts(app, allowed);
  await app.register(async (routes: FastifyInstance) => {
    routes.get('/api/saved', async () => [{ notes: 'private' }]);
    routes.post('/api/issues', async () => ({ id: 'written' }));
  });
  await app.ready();
  return app;
}

describe('refuseOtherHosts', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('answers 403 to a rebound name, for reads and for posts', async () => {
    app = await appWith(allowedHostnames(undefined));
    // Same-origin after the rebind, so no Origin header: only Host gives it away.
    const read = await app.inject({
      method: 'GET',
      url: '/api/saved',
      headers: { host: 'evil.example:3000' },
    });
    expect(read.statusCode).toBe(403);
    expect(read.json()).toEqual({ error: 'requests for other host names are refused' });

    const post = await app.inject({
      method: 'POST',
      url: '/api/issues',
      headers: { host: 'evil.example:3000', 'content-type': 'application/json' },
      payload: { body: 'planted' },
    });
    expect(post.statusCode).toBe(403);
  });

  it('answers 403 to an empty Host', async () => {
    app = await appWith(allowedHostnames(undefined));
    // inject() fills in a missing Host, so a blank one stands in for it here;
    // the test below sends a request with none at all.
    const res = await app.inject({ method: 'GET', url: '/api/saved', headers: { host: ' ' } });
    expect(res.statusCode).toBe(403);
  });

  it('serves localhost, 127.0.0.1 and [::1] on any port', async () => {
    app = await appWith(allowedHostnames(undefined));
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', 'localhost:3017']) {
      const res = await app.inject({ method: 'GET', url: '/api/saved', headers: { host } });
      expect(res.statusCode, host).toBe(200);
      expect(res.json()).toEqual([{ notes: 'private' }]);
    }
  });

  it('serves the HOST address when it is set to one on the LAN', async () => {
    app = await appWith(allowedHostnames('192.168.1.20'));
    const lan = await app.inject({
      method: 'POST',
      url: '/api/issues',
      headers: { host: '192.168.1.20:3000', 'content-type': 'application/json' },
      payload: { body: 'from the phone' },
    });
    expect(lan.statusCode).toBe(200);

    const local = await app.inject({
      method: 'GET',
      url: '/api/saved',
      headers: { host: 'localhost:3000' },
    });
    expect(local.statusCode).toBe(200);

    const evil = await app.inject({
      method: 'GET',
      url: '/api/saved',
      headers: { host: 'evil.example:3000' },
    });
    expect(evil.statusCode).toBe(403);
  });

  // Node answers an HTTP/1.1 request without Host with 400 before Fastify sees
  // it, but HTTP/1.0 allows one. A raw socket on a throwaway port sends it.
  it('answers 403 to an HTTP/1.0 request with no Host at all', async () => {
    app = await appWith(allowedHostnames(undefined));
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (address === null || typeof address === 'string') throw new Error('no port');

    const response = await new Promise<string>((resolve, reject) => {
      const socket = connect(address.port, '127.0.0.1', () => {
        socket.write('GET /api/saved HTTP/1.0\r\n\r\n');
      });
      let data = '';
      socket.on('data', (chunk) => {
        data += chunk.toString();
      });
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
    });
    expect(response.split('\r\n')[0]).toMatch(/^HTTP\/1\.[01] 403 /);
    expect(response).not.toContain('private');
  });
});
