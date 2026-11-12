import * as cheerio from "cheerio";
import { cleanText } from "../../../lib/normalize.ts";
import { textLines } from "./extract.ts";

/** Each JSON script (JSON-LD, storia's `__NEXT_DATA__`) is cut to this. */
const MAX_JSON = 6_000;
/** The visible text, one node per line, is cut to this. */
const MAX_VISIBLE = 12_000;

/**
 * What "Fill the gaps" sends the model about one listing page: the URL, the
 * `<title>`, the Open Graph and description tags, the JSON scripts, then the
 * visible text one node per line. It is the input the research scored
 * (docs/research-firecrawl-ollama.md), so the model reads what was measured.
 */
export function pageText(html: string, url: string): string {
  const $ = cheerio.load(html);
  const parts = [`URL: ${url}`];
  const title = cleanText($("title").first().text());
  if (title) parts.push(`Title: ${title}`);

  const tags: string[] = [];
  $('meta[property^="og:"], meta[name="description"], meta[property="description"]').each((_, el) => {
    const key = $(el).attr("property") ?? $(el).attr("name");
    const content = cleanText($(el).attr("content"));
    if (key && content) tags.push(`${key}: ${content}`);
  });
  if (tags.length) parts.push(tags.join("\n"));

  // Before textLines, which removes every script.
  $('script[type="application/ld+json"], script#__NEXT_DATA__').each((_, el) => {
    const json = $(el).text().trim();
    if (json) parts.push(`${$(el).attr("id") ?? "JSON-LD"}:\n${json.slice(0, MAX_JSON)}`);
  });

  const visible = textLines($).lines.join("\n").slice(0, MAX_VISIBLE);
  if (visible) parts.push(`Page text:\n${visible}`);
  return parts.join("\n\n");
}

/** About an hour: long enough to read the draft and press the button, short
 *  enough that a stale page isn't read for a draft fetched yesterday. */
export const PAGE_TEXT_TTL_MS = 60 * 60_000;
const MAX_PAGES = 50;

/**
 * The page text of recent Fetch details, keyed by the normalized URL, so
 * "Fill the gaps" never fetches the page again: the sites are asked once.
 * In memory only; a restart forgets it, and the form then asks the user to
 * press Fetch details first.
 */
export class PageTextCache {
  private readonly pages = new Map<string, { text: string; at: number }>();

  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(ttlMs = PAGE_TEXT_TTL_MS, now: () => number = Date.now) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  set(url: string, text: string): void {
    this.pages.delete(url);
    this.pages.set(url, { text, at: this.now() });
    while (this.pages.size > MAX_PAGES) {
      const oldest = this.pages.keys().next().value;
      if (oldest === undefined) break;
      this.pages.delete(oldest);
    }
  }

  get(url: string): string | undefined {
    const page = this.pages.get(url);
    if (!page) return undefined;
    if (this.now() - page.at > this.ttlMs) {
      this.pages.delete(url);
      return undefined;
    }
    return page.text;
  }
}

export const pageTexts = new PageTextCache();
