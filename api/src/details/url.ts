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

/** An IPv6 address (already known to be one) as its eight 16-bit groups,
 *  with a dotted IPv4 tail ("::ffff:1.2.3.4") turned into its two groups. */
function ipv6Groups(address: string): number[] {
  let text = address;
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a = 0, b = 0, c = 0, d = 0] = dotted.slice(1).map(Number);
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = '', tail] = text.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const zeros = tail === undefined ? [] : Array<string>(8 - left.length - right.length).fill('0');
  return [...left, ...zeros, ...right].map((group) => parseInt(group, 16));
}

/** The IPv4 address an IPv6 one carries in its last 32 bits, for the forms
 *  that reach it: IPv4-mapped (`::ffff:0:0/96`), NAT64 (`64:ff9b::/96`) and
 *  the old IPv4-compatible form (`::/96`, which covers `::` and `::1` too).
 *  Undefined for any other address. */
function embeddedIPv4(address: string): string | undefined {
  const g = ipv6Groups(address);
  const zero = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  const mapped = zero(0, 5) && g[5] === 0xffff;
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && zero(2, 6);
  if (!mapped && !nat64 && !zero(0, 6)) return undefined;
  const hi = g[6] ?? 0;
  const lo = g[7] ?? 0;
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

/** Loopback, private, link-local and the other ranges a fetch on someone
 *  else's say-so must never reach. An IPv6 address that carries an IPv4 one
 *  is judged as that IPv4 address, so `::ffff:127.0.0.1` and
 *  `64:ff9b::7f00:1` are private; 6to4 (`2002::/16`) is refused whatever it
 *  carries, since the relay it goes through is anyone's. Anything that is not
 *  an IP address counts as private. */
export function isPrivateAddress(ip: string): boolean {
  const bare = ip.replace(/%.*$/, ''); // an IPv6 zone id ("fe80::1%eth0")
  const v = isIP(bare);
  if (v === 4) {
    const [a = 0, b = 0] = bare.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast and reserved, the broadcast address included
    );
  }
  if (v === 6) {
    const v4 = embeddedIPv4(bare);
    if (v4 !== undefined) return isPrivateAddress(v4);
    const first = ipv6Groups(bare)[0] ?? 0;
    return (
      first === 0x2002 || // 6to4
      (first & 0xfe00) === 0xfc00 || // unique-local fc00::/7
      (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
      (first & 0xff00) === 0xff00 // multicast
    );
  }
  return true;
}

/** The scrape endpoint fetches whatever URL it is given. Refuse loopback and
 *  private network targets early, so a pasted link to one gets a plain answer
 *  before anything is fetched. The fetch itself checks every redirect hop and
 *  connects only to an address that passed (`lib/fetch.ts`); this is the
 *  cheap first refusal, not the only one. */
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
