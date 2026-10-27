const RON_PER_EUR = 5;

export function parsePriceEur(input: string | null | undefined): number | undefined {
  if (!input) return undefined;
  const text = input.replace(/\s+/g, ' ').trim();
  const isRon = /\bron\b|\blei\b/i.test(text);
  const isEur = /€|\beur\b/i.test(text);
  const digits = text.replace(/[^\d.,]/g, '');
  if (!digits) return undefined;
  const normalized = digits.replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (isRon && !isEur) return Math.round(n / RON_PER_EUR);
  return Math.round(n);
}

/** Prices a flat for sale can have; anything outside is a discount, a fee, a
 *  €/m² figure or digits run together, not the asking price. */
const PRICE_MIN_EUR = 5_000;
const PRICE_MAX_EUR = 5_000_000;

// One euro price, tried at a fixed position (sticky): thousands groups split by
// ".", "," or a space ("89.000", "109,000", "299 000"), or 4-7 bare digits; an
// optional ",00"; then €, eur or euro, and not "/m²".
const PRICE_TOKEN = /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,7})(?:,\d{2})?\s*(?:€|euro?\b)(?!\s*\/\s*m)/iy;
// The label in front of a crossed-out price: "Preț vechi", "Pret vechi:".
const OLD_PRICE_LABEL = /pre[țţt]\s+vechi\s*:?\s*$/i;
// An amount off or on top, not the price: "+ 2000 €", "10.000 € discount",
// "Reducere: 5.000 €".
const EXTRA_BEFORE = /(?:\+|discount|reducere)\s*:?\s*$/i;
const EXTRA_AFTER = /^\s*(?:discount|reducere)/i;
// A price before VAT: "92.033 € + TVA", "+TVA", "(+TVA)", "fără TVA" after it,
// or "Preț fără TVA:" in front. "TVA inclus" and "cu TVA" mean nothing here.
const PLUS_VAT = /\+\s*tva\b|f[aăǎ]r[aăǎ]\s+tva\b/i;
const PLUS_VAT_AFTER = /^\s*\(?\s*(?:\+\s*tva\b|f[aăǎ]r[aăǎ]\s+tva\b)/i;
const PLUS_VAT_BEFORE = /f[aăǎ]r[aăǎ]\s+tva\s*:?\s*$/i;

/** True when a price text says VAT is added on top ("+ TVA", "fără TVA"). */
export function isPlusVat(text: string | null | undefined): boolean {
  return Boolean(text && PLUS_VAT.test(text));
}

/** Reads the asking price, in euro, out of a listing card's text.
 *
 *  A price starts at a digit that does not follow another digit, "." or ",",
 *  so "Etaj 2 89.000 €" gives 89000, not 289000. Where a space-grouped number
 *  can be read more than one way ("Strada Aradului 12 299 000 €"), the
 *  shortest reading in range wins: 299000. A price over 1,000,000 € written
 *  with spaces therefore loses its millions; on a flat in Timișoara that is
 *  rarer than a floor or street number in front of the price.
 *
 *  Skipped: amounts outside 5,000-5,000,000; a discount or add-on ("+ 2000 €",
 *  "10.000 € Discount"); and every amount equal to one labelled "Preț vechi",
 *  so a crossed-out old price is skipped wherever it stands in the card. Of
 *  what is left, the first wins. A range "75.000 - 80.000 €" gives 80000, the
 *  only amount followed by a currency sign. */
export function extractPriceEur(text: string | null | undefined): number | undefined {
  return extractPrice(text)?.eur;
}

/** extractPriceEur's price, and whether that amount is marked as before VAT
 *  ("92.033 € + TVA"). The mark belongs to the amount it follows: in
 *  "111.359 € 92.033 € +TVA" the price is 111359 and is not marked. */
export function extractPrice(
  text: string | null | undefined,
): { eur: number; plusVat: boolean } | undefined {
  if (!text) return undefined;

  // Every reading of a price, grouped by where it ends (at its currency sign).
  const readingsByEnd = new Map<number, { start: number; value: number }[]>();
  for (let i = 0; i < text.length; i++) {
    if (!/\d/.test(text[i]!) || (i > 0 && /[\d.,]/.test(text[i - 1]!))) continue;
    PRICE_TOKEN.lastIndex = i;
    const m = PRICE_TOKEN.exec(text);
    if (!m || !m[1]) continue;
    const end = i + m[0].length;
    const reading = { start: i, value: Number(m[1].replace(/\D/g, '')) };
    const readings = readingsByEnd.get(end);
    if (readings) readings.push(reading);
    else readingsByEnd.set(end, [reading]);
  }

  // Readings start left to right, so the last one in range is the shortest.
  const prices: { start: number; value: number; old: boolean; plusVat: boolean }[] = [];
  for (const end of [...readingsByEnd.keys()].sort((a, b) => a - b)) {
    const inRange = readingsByEnd
      .get(end)!
      .filter((r) => r.value >= PRICE_MIN_EUR && r.value <= PRICE_MAX_EUR);
    const chosen = inRange[inRange.length - 1];
    if (!chosen) continue;
    const before = text.slice(Math.max(0, chosen.start - 24), chosen.start);
    const after = text.slice(end, end + 16);
    if (EXTRA_BEFORE.test(before) || EXTRA_AFTER.test(after)) continue;
    prices.push({
      ...chosen,
      old: OLD_PRICE_LABEL.test(before),
      plusVat: PLUS_VAT_AFTER.test(after) || PLUS_VAT_BEFORE.test(before),
    });
  }

  const oldValues = new Set(prices.filter((p) => p.old).map((p) => p.value));
  const price = prices.find((p) => !oldValues.has(p.value));
  return price && { eur: price.value, plusVat: price.plusVat };
}

/** A search card's price as the adapters store it. */
export function cardPrice(text: string | null | undefined): {
  priceEur?: number;
  pricePlusVat?: boolean;
} {
  const price = extractPrice(text);
  return price ? { priceEur: price.eur, pricePlusVat: price.plusVat } : {};
}

/** Strips a trailing price-like fragment from a title string. Romanian listings
 *  often embed the price into the title text (e.g. "Apartament X 125.000 €
 *  131.890 € Preț vechi 131.890 €"); the title field should just be the title. */
export function stripTrailingPrice(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  // Find the first occurrence of a price-like token and chop the string there.
  const m = input.match(/\s*[\d][\d.,\s]*\s*(?:€|eur\b)/i);
  if (!m || m.index === undefined) return cleanText(input);
  return cleanText(input.slice(0, m.index));
}

/** Best-effort neighborhood extraction from an imobiliare-style URL slug.
 *  Pattern: `apartament-de-vanzare-timisoara-<neighborhood>-<N>-camere-<id>`. */
export function locationFromImobiliareUrl(url: string): string | undefined {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/timisoara-([a-z0-9-]+?)-(?:mobilat-)?\d+-cam/i);
    if (m && m[1]) return m[1].replace(/-/g, ' ');
    // Garsoniera fallback: `garsoniera-de-vanzare-timisoara-<neighborhood>-<...>`
    const g = path.match(/garsoniera-de-vanzare-timisoara-([a-z0-9-]+?)-\d/i);
    if (g && g[1]) return g[1].replace(/-/g, ' ');
    return undefined;
  } catch {
    return undefined;
  }
}

export function parseRooms(input: string | null | undefined): number | undefined {
  if (!input) return undefined;
  // Require a word boundary before the digit so fractional formulations like
  // "1,5 camere" don't wrongly produce 5. The negative lookbehind rejects any
  // preceding digit or decimal separator.
  const m = input.match(/(?<![\d.,])(\d+)\s*(camere|camera|cam\b|room)/i);
  if (m && m[1]) return Number(m[1]);
  const bare = input.match(/^\s*(\d+)\s*$/);
  if (bare && bare[1]) return Number(bare[1]);
  return undefined;
}

export function parseSqm(input: string | null | undefined): number | undefined {
  if (!input) return undefined;
  const m = input.match(/([\d.,]+)\s*(m\s*²|m\s*2|mp|sqm)/i);
  if (!m || !m[1]) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function cleanText(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const t = input.replace(/\s+/g, ' ').trim();
  return t.length ? t : undefined;
}

export function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const last = path.split('/').pop();
    return last && last.length > 0 ? last : path || url;
  } catch {
    return url;
  }
}
