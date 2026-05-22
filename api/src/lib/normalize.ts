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

/** Extracts every euro-denominated monetary value from a free-form string and
 *  returns the largest. Used by adapters whose listing-card text contains a
 *  mix of discount blurbs and the real price ("+ 2000 € discount ... 111.359 €"). */
export function pickLargestPriceEur(input: string | null | undefined): number | undefined {
  if (!input) return undefined;
  const matches = input.match(/[\d.,]+\s*(?:€|eur\b)/gi);
  if (!matches) return undefined;
  let max: number | undefined;
  for (const m of matches) {
    const v = parsePriceEur(m);
    if (v !== undefined && (max === undefined || v > max)) max = v;
  }
  return max;
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
