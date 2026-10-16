const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export class CookieJar {
  private store = new Map<string, Map<string, string>>();

  setFromResponse(url: string, setCookie: string[] | string | undefined): void {
    if (!setCookie) return;
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    const host = new URL(url).host;
    let jar = this.store.get(host);
    if (!jar) {
      jar = new Map();
      this.store.set(host, jar);
    }
    for (const raw of list) {
      const first = raw.split(';')[0];
      if (!first) continue;
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      jar.set(name, value);
    }
  }

  headerFor(url: string): string | undefined {
    const host = new URL(url).host;
    const jar = this.store.get(host);
    if (!jar || jar.size === 0) return undefined;
    return Array.from(jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

export interface FetchSession {
  get(url: string): Promise<string>;
}

export function createSession(): FetchSession {
  const jar = new CookieJar();
  return {
    async get(url: string): Promise<string> {
      const cookie = jar.headerFor(url);
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');
      jar.setFromResponse(url, setCookie ?? undefined);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    },
  };
}
