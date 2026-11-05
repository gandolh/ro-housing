import { describe, expect, it } from 'vitest';
import { wicketClient, WicketError, type WicketJob } from './wicket.ts';

const JOB: WicketJob = { id: 'j1', ticket: 7, nowServing: 5, position: 2, status: 'queued' };

function fakeFetch(respond: (url: string) => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return respond(String(url));
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('wicketClient', () => {
  it('posts exactly { messages, format } with the bearer token', async () => {
    const { calls, fetch } = fakeFetch(() => json(202, JOB));
    const client = wicketClient({ url: 'https://example.com/wicket-api/', token: 'tok', fetch });
    const messages = [{ role: 'user' as const, content: 'page' }];
    expect(await client.submit(messages, { type: 'object' })).toEqual(JOB);
    expect(calls[0]!.url).toBe('https://example.com/wicket-api/v1/jobs');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ messages, format: { type: 'object' } });
    expect(Object.keys(JSON.parse(String(calls[0]!.init.body))).sort()).toEqual(['format', 'messages']);
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('never long-polls past 25 seconds, and reads a 404 as gone', async () => {
    const { calls, fetch } = fakeFetch((url) => (url.includes('/gone') ? json(404, {}) : json(200, JOB)));
    const client = wicketClient({ url: 'https://w', token: 't', fetch });
    await client.get('j1', 90);
    expect(calls[0]!.url).toBe('https://w/v1/jobs/j1?wait=25');
    expect(await client.get('gone', 5)).toBeUndefined();
    expect(await client.cancel('gone')).toBeUndefined();
  });

  it('keeps Wicket\'s error code, and names an unreachable Wicket', async () => {
    const full = wicketClient({
      url: 'https://w',
      token: 't',
      fetch: fakeFetch(() => json(503, { code: 'queue_full', message: '200 waiting' })).fetch,
    });
    await expect(full.submit([], null)).rejects.toMatchObject({ code: 'queue_full' });
    const down = wicketClient({
      url: 'https://w',
      token: 't',
      fetch: (async () => {
        throw new TypeError('fetch failed');
      }) as typeof globalThis.fetch,
    });
    await expect(down.get('j1', 0)).rejects.toThrow(WicketError);
  });
});
