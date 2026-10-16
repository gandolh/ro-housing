import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|yclid|mc_eid|ref|ref_src)$/i;

/** Parses a pasted listing link into a canonical form, so the same apartment
 *  pasted twice (once from a share button with `?utm_…`, once from the address
 *  bar) maps to one saved row. Returns undefined for anything that isn't an
 *  http(s) URL. */
export function normalizeListingUrl(input: string): string | undefined {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return undefined;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }
  return u.toString();
}

/** "www.storia.ro" → "storia.ro". Shown as the source badge. */
export function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a = 0, b = 0] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      /^f[cd]/.test(lower) ||
      /^fe[89ab]/.test(lower)
    );
  }
  return false;
}

/** The scrape endpoint fetches whatever URL it is given, and any page the
 *  browser has open can POST to a local API. Refuse loopback and private
 *  network targets so it can't be turned on the user's own LAN. Checks the
 *  first hop only; redirects are followed unchecked. */
export async function assertPublicHost(url: string): Promise<void> {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new Error('local addresses are not allowed');
  }
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.some(isPrivateAddress)) {
    throw new Error('local addresses are not allowed');
  }
}
