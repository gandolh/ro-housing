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
export type Layer = 'storia' | 'jsonld' | 'labels' | 'meta' | 'text';

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
// Layer 1b: the price from JSON-LD offers. Most agency sites' JSON-LD only
// describes the agency, which gives nothing here; some put the listing in it
// as a Product or a Residence with `offers.price`. Only the price is read.

/** The schema.org types a listing's own JSON-LD uses. `Organization`,
 *  `RealEstateAgent` and `WebSite` are the agency, not the flat. */
const LISTING_TYPES = new Set([
  'product',
  'offer',
  'residence',
  'apartment',
  'singlefamilyresidence',
  'house',
  'accommodation',
  'realestatelisting',
]);

/** An asking price a flat for sale can have: the card readers' range. */
function plausiblePrice(n: number | undefined): number | undefined {
  return n !== undefined && n >= 5_000 && n <= 5_000_000 ? Math.round(n) : undefined;
}

function hasListingType(item: Record<string, unknown>): boolean {
  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
  return types.some((t) => typeof t === 'string' && LISTING_TYPES.has(t.toLowerCase()));
}

function offerPriceEur(offer: Record<string, unknown> | undefined): number | undefined {
  if (!offer) return undefined;
  const currency = str(offer.priceCurrency);
  if (!currency || currency.toUpperCase() !== 'EUR') return undefined;
  // A string goes through the Romanian reader, so "98.000" is 98000, not 98.
  const price = offer.price;
  const n = typeof price === 'string' ? parsePriceEur(`${price} EUR`) : num(price);
  return plausiblePrice(n);
}

function jsonLdItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.flatMap(jsonLdItems);
  const item = record(data);
  if (!item) return [];
  const graph = Array.isArray(item['@graph']) ? jsonLdItems(item['@graph']) : [];
  return [item, ...graph];
}

function fromJsonLd($: cheerio.CheerioAPI): Found {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data: unknown;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    for (const item of jsonLdItems(data)) {
      if (!hasListingType(item)) continue;
      const priceEur =
        offerPriceEur(record(first(item.offers))) ??
        (String(item['@type']).toLowerCase() === 'offer' ? offerPriceEur(item) : undefined);
      if (priceEur !== undefined) return { priceEur };
    }
  }
  return {};
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

/** The page's visible text, one text node per line, and the index of the
 *  first line after the first `<h1>` (undefined when the page has none). */
export function textLines($: cheerio.CheerioAPI): { lines: string[]; afterTitle?: number } {
  $('script, style, noscript, svg, template, iframe, select, nav, footer').remove();
  const lines: string[] = [];
  let afterTitle: number | undefined;
  interface WalkNode {
    type: string;
    data?: string;
    children?: WalkNode[];
  }
  const h1 = $('h1').get(0) as unknown as WalkNode | undefined;
  const walk = (node: WalkNode): void => {
    if (node.type === 'text') {
      const t = cleanText(node.data);
      if (t) lines.push(t);
      return;
    }
    for (const child of node.children ?? []) walk(child);
    if (node === h1 && afterTitle === undefined) afterTitle = lines.length;
  };
  const body = $('body').get(0) ?? $.root().get(0);
  if (body) walk(body as unknown as WalkNode);
  return { lines, afterTitle };
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

/** How many lines under the page's `<h1>` a bare price may stand. */
const TITLE_PRICE_WINDOW = 5;

// A line that is nothing but a euro price: "145.000 Eur", "145 000 €",
// "€ 145.000", "92.033 € + TVA". Matched on the folded line.
const BARE_PRICE_LINE =
  /^(?:(?:€|eur|euro)\s*)?(?:\d{1,3}(?:[., ]\d{3})+|\d{4,7})(?:,\d{2})?(?:\s*(?:€|eur|euro))?(?:\s*\(?\+\s*tva\)?|\s+fara\s+tva)?$/;

/** A price standing alone on a line just under the title, as some agency
 *  sites show it with no "Preț" label. Only that window: a "similar listings"
 *  block lower down is full of bare prices of other flats. */
export function priceUnderTitle(
  lines: string[],
  afterTitle: number | undefined,
): Found {
  if (afterTitle === undefined) return {};
  for (const line of lines.slice(afterTitle, afterTitle + TITLE_PRICE_WINDOW)) {
    const folded = fold(line).trim();
    if (!BARE_PRICE_LINE.test(folded) || !/€|eur/.test(folded)) continue;
    const priceEur = plausiblePrice(parsePriceEur(line));
    if (priceEur !== undefined) return { priceEur, pricePlusVat: isPlusVat(line) };
  }
  return {};
}

function fromText(title: string | undefined, prose: string): Found {
  const t = fold(title ?? '');
  const p = fold(prose);
  const out: Found = {};

  out.rooms = parseRooms(t) ?? (/garsonier/.test(t) ? 1 : undefined);
  out.partitioning = parsePartitioning(t) ?? parsePartitioning(p);

  // Spaces and tabs only, never a line break: "zona Lidia" at the end of one
  // line must not take the next line's first word as part of the name.
  const zone = `${title ?? ''}\n${prose}`.match(
    /\bzon[aă][ \t]+([\p{Lu}][\p{L}-]+(?:[ \t]+[\p{Lu}][\p{L}-]+)?)/u,
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

export function sane(f: DetailFields): DetailFields {
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
  // Before textLines, which removes the scripts.
  const jsonLd = fromJsonLd($);
  const { lines, afterTitle } = textLines($);
  const title = storia?.fields.title ?? metaFields.title ?? undefined;
  const prose = [description ?? '', ...lines].join('\n');

  const layers: [Layer, Found][] = [
    ...(storia ? ([['storia', storia.fields]] as [Layer, Found][]) : []),
    ['jsonld', jsonLd],
    ['labels', fromLabels(lines)],
    ['meta', metaFields],
    ['text', { ...priceUnderTitle(lines, afterTitle), ...fromText(title, prose) }],
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
  // The VAT mark goes with the price: from the layer that gave it, or from
  // any other layer that read the same amount and saw "+ TVA" beside it
  // (JSON-LD carries no VAT mark; the label next to the same price may).
  const samePrice = layers.filter(
    ([, found]) => merged.priceEur != null && found.priceEur === merged.priceEur,
  );
  merged.pricePlusVat = samePrice.some(([, found]) => found.pricePlusVat === true)
    ? true
    : (layers.find(([layer]) => layer === sources.priceEur)?.[1].pricePlusVat ?? null);

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
