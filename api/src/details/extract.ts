import * as cheerio from 'cheerio';
import {
  cleanText,
  isPlusVat,
  parsePriceEur,
  parseRooms,
  parseSqm,
} from '../lib/normalize.ts';

export const PARTITIONINGS = [
  'decomandat',
  'semidecomandat',
  'nedecomandat',
  'circular',
] as const;
export type Partitioning = (typeof PARTITIONINGS)[number];

/** What a single listing page can tell us about one apartment. Every field is
 *  nullable: the page is a draft the user confirms, never the final word. */
export interface DetailFields {
  title: string | null;
  priceEur: number | null;
  rooms: number | null;
  sqm: number | null;
  /** 0 = parter, -1 = demisol/subsol. */
  floor: number | null;
  floorsTotal: number | null;
  yearBuilt: number | null;
  location: string | null;
  partitioning: Partitioning | null;
  imageUrl: string | null;
  /** The price is marked as before VAT ("+ TVA", "fără TVA"). Part of the
   *  price, not a field of its own: not in DETAIL_FIELDS, not counted. */
  pricePlusVat: boolean | null;
}
export type DetailField = Exclude<keyof DetailFields, 'pricePlusVat'>;

export const DETAIL_FIELDS: DetailField[] = [
  'title',
  'priceEur',
  'rooms',
  'sqm',
  'floor',
  'floorsTotal',
  'yearBuilt',
  'location',
  'partitioning',
  'imageUrl',
];

/** Where a field came from, kept in raw_json so a wrong value can be traced. */
export type Layer = 'storia' | 'labels' | 'meta' | 'text';

export interface Extraction {
  fields: DetailFields;
  found: DetailField[];
  sources: Partial<Record<DetailField, Layer>>;
  description: string | null;
}

/** One layer's findings: any subset of the fields. */
type Found = { [K in DetailField]?: DetailFields[K] | null | undefined } & {
  pricePlusVat?: boolean;
};

/** Lowercases and strips diacritics one character at a time, so the folded
 *  string has the same length as the original and indices carry over. */
export function fold(s: string): string {
  let out = '';
  for (const ch of s) {
    out += ch.length === 1 ? ch.normalize('NFD').charAt(0).toLowerCase() : ch;
  }
  return out;
}

export function parseFloor(
  value: string,
): { floor?: number; floorsTotal?: number } {
  const v = fold(value)
    .replace(/^etaj(?:ul)?\s*:?\s*/, '')
    .trim();
  const m = v.match(
    /^(parter|p|demisol|subsol|d|s|\d{1,2})\b(?:\s*(?:\/|din)\s*(?:p\s*\+\s*)?(\d{1,2}))?/,
  );
  if (!m?.[1]) return {};
  const head = m[1];
  const floor = /^\d/.test(head)
    ? Number(head)
    : head === 'parter' || head === 'p'
      ? 0
      : -1;
  return {
    floor,
    floorsTotal: m[2] ? Number(m[2]) : undefined,
  };
}

/** "D+P+2" → 2, "S+P+10E" → 10, "P+4+M" → 4, "5" → 5, "Parter" → 0. */
export function parseFloorsTotal(value: string): number | undefined {
  const v = fold(value).trim();
  const plus = v.match(/(?:^|[^a-z])(?:p|parter)\s*\+\s*(\d{1,2})/);
  if (plus?.[1]) return Number(plus[1]);
  const bare = v.match(/^(\d{1,2})\b/);
  if (bare?.[1]) return Number(bare[1]);
  if (/^(p|parter)$/.test(v)) return 0;
  return undefined;
}

export function parseYear(value: string): number | undefined {
  const m = value.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return m?.[1] ? Number(m[1]) : undefined;
}

export function parsePartitioning(value: string): Partitioning | undefined {
  const m = fold(value).match(
    /\b(semi-?decomandat|nedecomandat|decomandat|circular)/,
  );
  if (!m?.[1]) return undefined;
  return m[1].replace('-', '') as Partitioning;
}

function parseCount(value: string): number | undefined {
  const m = value.trim().match(/^(\d{1,2})\b/);
  return m?.[1] ? Number(m[1]) : undefined;
}

function parseArea(value: string): number | undefined {
  const withUnit = parseSqm(value);
  if (withUnit !== undefined) return withUnit;
  const bare = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*$/);
  return bare?.[1] ? Number(bare[1].replace(',', '.')) : undefined;
}

function parsePlace(value: string): string | undefined {
  const v = cleanText(value.replace(/^[:\s]+/, ''));
  if (!v || v.length > 50 || v.split(' ').length > 5) return undefined;
  if (!/\p{L}/u.test(v)) return undefined;
  return v;
}

// ---------------------------------------------------------------------------
// Layer 1: storia.ro (and other OLX-group sites) embed the whole ad as JSON in
// a Next.js `__NEXT_DATA__` script. Verified 2026-10-16.

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? cleanText(v) : undefined;
}

function first(v: unknown): unknown {
  return Array.isArray(v) ? v[0] : v;
}

function record(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

function storiaFloor(code: unknown): number | undefined {
  if (typeof code !== 'string') return undefined;
  if (code === 'ground_floor') return 0;
  if (code === 'cellar') return -1;
  const m = code.match(/^floor_(\d{1,2})$/);
  return m?.[1] ? Number(m[1]) : undefined;
}

function htmlToText(html: string): string {
  const spaced = html.replace(/<\/?(p|br|li|div|h\d)\b[^>]*>/gi, '\n');
  return cheerio
    .load(spaced)
    .root()
    .text()
    .split('\n')
    .map((l) => cleanText(l))
    .filter(Boolean)
    .join('\n');
}

function fromNextData(
  $: cheerio.CheerioAPI,
): { fields: Found; description?: string } | undefined {
  const json = $('script#__NEXT_DATA__').first().text();
  if (!json) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return undefined;
  }
  const ad = record(record(record(data)?.props)?.pageProps)?.ad;
  const adRec = record(ad);
  const t = record(adRec?.target);
  if (!adRec || !t) return undefined;

  let priceEur: number | undefined;
  const characteristics = Array.isArray(adRec.characteristics)
    ? adRec.characteristics.map(record)
    : [];
  const price = characteristics.find((c) => c?.key === 'price');
  if (price && typeof price.value === 'string') {
    priceEur = parsePriceEur(`${price.value} ${str(price.currency) ?? ''}`);
  }
  priceEur ??= num(t.Price);

  const places = record(record(adRec.location)?.reverseGeocoding)?.locations;
  const lastPlace = Array.isArray(places)
    ? record(places[places.length - 1])
    : undefined;
  const location =
    lastPlace &&
    !['county', 'county_capital', 'city'].includes(String(lastPlace.locationLevel))
      ? str(lastPlace.name)
      : undefined;

  const image = record(first(adRec.images));
  const description =
    typeof adRec.description === 'string'
      ? htmlToText(adRec.description)
      : undefined;

  return {
    fields: {
      title: str(adRec.title),
      priceEur,
      rooms: num(first(t.Rooms_num)),
      sqm: num(t.Area),
      floor: storiaFloor(first(t.Floor_no)),
      floorsTotal: num(t.Building_floors_num),
      yearBuilt: num(t.Build_year),
      location,
      imageUrl: str(image?.large) ?? str(image?.medium) ?? str(image?.small),
    },
    description,
  };
}

// ---------------------------------------------------------------------------
// Layer 2: label/value pairs in the page text. Agency sites render a details
// block as "Nr. camere:" + "<span>3</span>", "Pret" + "102,000 EUR", or
// "Etaj: Etaj 1". Each text node becomes one line; a label line takes its
// value from the rest of the line, or from the next line.

interface LabelRule {
  label: RegExp;
  parse: (value: string) => Found;
}

const LABEL_RULES: LabelRule[] = [
  {
    label: /pret(?:\s+(?:de\s+)?vanzare)?(?!\s*(?:\/|pe\s|per\s)\s*m)/,
    parse: (v) => {
      const priceEur = parsePriceEur(v);
      return priceEur === undefined ? {} : { priceEur, pricePlusVat: isPlusVat(v) };
    },
  },
  {
    label: /(?:nr\.?\s*|numar\s+(?:de\s+)?)camere|camere(?=\s*:)/,
    parse: (v) => ({ rooms: parseCount(v) }),
  },
  {
    label: /(?:suprafata|supr?\.?|s\.)\s*utila(?!\s+total)/,
    parse: (v) => ({ sqm: parseArea(v) }),
  },
  { label: /suprafata(?=\s*:)/, parse: (v) => ({ sqm: parseArea(v) }) },
  { label: /etaj(?:ul)?/, parse: (v) => parseFloor(v) },
  {
    label:
      /regim\s+(?:de\s+)?inaltime|(?:nr\.?|numar)\s*(?:de\s+)?etaje|etaje(?:\s+(?:bloc|imobil|cladire))?(?=\s*:)/,
    parse: (v) => ({ floorsTotal: parseFloorsTotal(v) }),
  },
  {
    label:
      /an(?:ul)?\s+(?:de\s+)?constructi(?:e|ei)|constructie|construit(?:\s+in)?/,
    parse: (v) => ({ yearBuilt: parseYear(v) }),
  },
  {
    label: /(?:tip\s+)?compartimentare|comp\./,
    parse: (v) => ({ partitioning: parsePartitioning(v) }),
  },
  {
    label: /zona\s*\/\s*cartier|cartier(?:\s*\/\s*zona)?|zona/,
    parse: (v) => ({ location: parsePlace(v) }),
  },
];

const MAX_LABEL_LINE = 60;

function textLines($: cheerio.CheerioAPI): string[] {
  $('script, style, noscript, svg, template, iframe, select, nav, footer').remove();
  const lines: string[] = [];
  interface WalkNode {
    type: string;
    data?: string;
    children?: WalkNode[];
  }
  const walk = (node: WalkNode): void => {
    if (node.type === 'text') {
      const t = cleanText(node.data);
      if (t) lines.push(t);
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  const body = $('body').get(0) ?? $.root().get(0);
  if (body) walk(body as unknown as WalkNode);
  return lines;
}

function fromLabels(lines: string[]): Found {
  const out: Found = {};
  const folded = lines.map((l) => fold(l).replace(/^[*•·\-–]\s*/, ''));
  const originals = lines.map((l) => l.replace(/^[*•·\-–]\s*/, ''));
  for (const rule of LABEL_RULES) {
    const re = new RegExp(`^(?:${rule.label.source})(?![a-z])\\s*:?\\s*(.*)$`);
    for (let i = 0; i < folded.length; i++) {
      const line = folded[i]!;
      if (line.length > MAX_LABEL_LINE) continue;
      const m = line.match(re);
      if (!m) continue;
      const original = originals[i]!;
      const rest = original.slice(original.length - (m[1] ?? '').length).trim();
      const value = rest || lines[i + 1] || '';
      if (value.length > MAX_LABEL_LINE) continue;
      const parsed = rule.parse(value);
      const fresh = Object.entries(parsed).filter(
        ([k, v]) => v != null && out[k as DetailField] == null,
      );
      if (fresh.length === 0) continue;
      Object.assign(out, Object.fromEntries(fresh));
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Layer 3: Open Graph and the document head. Every page tested has og:title
// and og:image.

function absoluteHttpUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** "Apartament 2 camere - FoxFort.ro" → "Apartament 2 camere"; also drops a
 *  trailing listing ID ("… Zona excelenta 0016647", "… - ID 0016647"). */
function stripSiteSuffix(title: string): string {
  return title
    .replace(/\s+[-|•–]\s+[^-|•–]*\.(?:ro|com|eu|net)\s*$/i, '')
    .replace(/\s+(?:[-|•–]\s+)?(?:ID:?\s*)?\d{5,}\s*$/i, '');
}

function meta($: cheerio.CheerioAPI, key: string): string | undefined {
  return cleanText(
    $(`meta[property="${key}"], meta[name="${key}"]`).first().attr('content'),
  );
}

function fromMeta($: cheerio.CheerioAPI, pageUrl: string): Found {
  const rawTitle =
    meta($, 'og:title') ??
    cleanText($('h1').first().text()) ??
    cleanText($('title').first().text());
  return {
    title: rawTitle ? stripSiteSuffix(rawTitle) : undefined,
    imageUrl:
      absoluteHttpUrl(meta($, 'og:image'), pageUrl) ??
      absoluteHttpUrl(meta($, 'twitter:image'), pageUrl),
  };
}

function metaDescription($: cheerio.CheerioAPI): string | undefined {
  return (
    meta($, 'og:description') ??
    meta($, 'description') ??
    cleanText($('meta[name="Description"]').first().attr('content'))
  );
}

// ---------------------------------------------------------------------------
// Layer 4: phrases in the title and the prose. "2 camere" in a title, "zona
// Freidorf", "situat la etajul 3 din 3", "bloc din 1980", "imobil cu 10 etaje".

function fromText(title: string | undefined, prose: string): Found {
  const t = fold(title ?? '');
  const p = fold(prose);
  const out: Found = {};

  out.rooms = parseRooms(t) ?? (/garsonier/.test(t) ? 1 : undefined);
  out.partitioning = parsePartitioning(t) ?? parsePartitioning(p);

  const zone = `${title ?? ''}\n${prose}`.match(
    /\bzon[aă]\s+([\p{Lu}][\p{L}-]+(?:\s+[\p{Lu}][\p{L}-]+)?)/u,
  );
  out.location = zone?.[1];

  const area = p.match(
    /suprafat[a]?\s+utila\s*:?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:mp|m2|m²)/,
  );
  if (area?.[1]) out.sqm = Number(area[1].replace(',', '.'));

  const floor = p.match(
    /\betaj(?:ul)?\s*:?\s*(parter|\d{1,2})\b(?:\s*(?:\/|din)\s*(\d{1,2}))?/,
  );
  if (floor?.[1]) {
    out.floor = floor[1] === 'parter' ? 0 : Number(floor[1]);
    if (floor[2]) out.floorsTotal = Number(floor[2]);
  } else if (/\bla\s+parter\b/.test(p)) {
    out.floor = 0;
  }

  const storeys =
    p.match(/\b(?:bloc|imobil|cladire)\w*\s+(?:cu\s+)?(\d{1,2})\s+etaje\b/) ??
    p.match(/regim\s+de\s+inaltime\s+(?:\S+\s*\+\s*)?(?:p|parter)\s*\+\s*(\d{1,2})/);
  if (storeys?.[1]) out.floorsTotal ??= Number(storeys[1]);

  const year = p.match(
    /\b(?:construit\w*|finalizat\w*|bloc|imobil|cladire)\s+(?:nou\s+)?(?:in|din)\s+(?:anul\s+)?(1[89]\d{2}|20\d{2})\b/,
  );
  if (year?.[1]) out.yearBuilt = Number(year[1]);

  return out;
}

// ---------------------------------------------------------------------------

function inRange(n: number | null | undefined, lo: number, hi: number): number | null {
  return n != null && Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

function sane(f: DetailFields): DetailFields {
  const thisYear = new Date().getFullYear();
  const floor = inRange(f.floor, -2, 60);
  let floorsTotal = inRange(f.floorsTotal, 0, 60);
  if (floor !== null && floorsTotal !== null && floor > floorsTotal) {
    floorsTotal = null;
  }
  const rooms = inRange(f.rooms, 1, 20);
  const priceEur = inRange(f.priceEur, 1_000, 50_000_000);
  const yearBuilt = inRange(f.yearBuilt, 1800, thisYear + 5);
  return {
    title: f.title ? f.title.slice(0, 300) : null,
    priceEur: priceEur === null ? null : Math.round(priceEur),
    rooms: rooms === null ? null : Math.round(rooms),
    sqm: inRange(f.sqm, 8, 2_000),
    floor,
    floorsTotal,
    yearBuilt,
    location: f.location ? f.location.slice(0, 120) : null,
    partitioning: f.partitioning ?? null,
    imageUrl: f.imageUrl ?? null,
    pricePlusVat: priceEur === null ? null : f.pricePlusVat === true,
  };
}

/** Reads one listing page. Layers run from most to least trustworthy; a field
 *  keeps the first value any layer finds. */
export function extractDetails(html: string, pageUrl: string): Extraction {
  const $ = cheerio.load(html);
  const storia = fromNextData($);
  const metaFields = fromMeta($, pageUrl);
  const description = storia?.description ?? metaDescription($);
  const lines = textLines($);
  const title = storia?.fields.title ?? metaFields.title ?? undefined;
  const prose = [description ?? '', ...lines].join('\n');

  const layers: [Layer, Found][] = [
    ...(storia ? ([['storia', storia.fields]] as [Layer, Found][]) : []),
    ['labels', fromLabels(lines)],
    ['meta', metaFields],
    ['text', fromText(title, prose)],
  ];

  const merged = Object.fromEntries(DETAIL_FIELDS.map((k) => [k, null])) as unknown as DetailFields;
  const sources: Partial<Record<DetailField, Layer>> = {};
  for (const [layer, found] of layers) {
    for (const k of DETAIL_FIELDS) {
      const v = found[k];
      if (merged[k] == null && v != null) {
        (merged as unknown as Record<string, unknown>)[k] = v;
        sources[k] = layer;
      }
    }
  }
  // The VAT mark goes with the price: from the layer that gave it.
  merged.pricePlusVat =
    layers.find(([layer]) => layer === sources.priceEur)?.[1].pricePlusVat ?? null;

  const fields = sane(merged);
  const found = DETAIL_FIELDS.filter((k) => fields[k] !== null);
  for (const k of DETAIL_FIELDS) if (fields[k] === null) delete sources[k];

  return {
    fields,
    found,
    sources,
    description: description ? description.slice(0, 4_000) : null,
  };
}
