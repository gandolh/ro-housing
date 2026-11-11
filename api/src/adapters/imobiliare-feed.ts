import * as cheerio from "cheerio";
import { cleanText } from "../lib/normalize.ts";
import type { Adapter, ScrapedListing } from "./types.ts";

/** imobiliare.ro's public feed of new listings, nationwide, about a day's
 *  worth. Its robots.txt lists it among the site's sitemaps, and it answers a
 *  plain request: no bot check, unlike the listing pages (docs/decisions.md,
 *  "imobiliare's RSS feed, title and link only"). */
export const FEED_URL = "https://www.imobiliare.ro/rss-listings.xml";

/** Says who is asking. The feed is public; nothing here pretends to be a
 *  browser. */
const USER_AGENT = "ro-housing (a personal flat search reading the public RSS feed)";

/** A flat for sale in Timișoara, by the link's path:
 *  `/oferta/apartament-de-vanzare-timisoara-<zone>-…-<id>`. Rentals, houses,
 *  land, offices and other cities are left out (buy-only, flats only,
 *  Timișoara only). The trailing number is the listing's ID. */
const FLAT_FOR_SALE_IN_TIMISOARA =
  /^\/oferta\/(?:apartament|garsoniera|penthouse)-de-vanzare-timisoara-(?:[a-z0-9-]*-)?(\d+)$/;

/** The feed's items that are flats for sale in Timișoara: title and link
 *  only. The feed has no price, area or rooms, and no listing page is fetched
 *  to find them. */
export function parseFeed(xml: string): ScrapedListing[] {
  const $ = cheerio.load(xml, { xml: true });
  const out: ScrapedListing[] = [];
  const seen = new Set<string>();
  $("item").each((_, item) => {
    const link = cleanText($(item).children("link").first().text());
    if (!link) return;
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      return;
    }
    if (url.protocol !== "https:" || url.hostname !== "www.imobiliare.ro") return;
    const id = FLAT_FOR_SALE_IN_TIMISOARA.exec(url.pathname)?.[1];
    if (!id || seen.has(id)) return;
    seen.add(id);
    const title = cleanText($(item).children("title").first().text());
    const pubDate = cleanText($(item).children("pubDate").first().text());
    out.push({
      sourceUid: id,
      url: url.toString(),
      ...(title ? { title } : {}),
      raw: { link, title: title ?? null, pubDate: pubDate ?? null },
    });
  });
  return out;
}

export const imobiliareFeedAdapter: Adapter = {
  id: "imobiliare-feed",
  displayName: "imobiliare.ro (RSS)",
  defaultSearchUrl: FEED_URL,
  async scrape(searchUrl) {
    // The Sources page lets the URL be edited; this source reads the feed and
    // nothing else, so an edited URL can't point it at a listing page.
    if (searchUrl.trim() !== FEED_URL) {
      throw new Error(`this source only reads ${FEED_URL}`);
    }
    // One plain request per Refresh: no cookies, no browser, no retry.
    const res = await fetch(FEED_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${FEED_URL}`);
    const xml = await res.text();
    // A bot check answers with an HTML page, not a feed: a failed run, not an empty one.
    if (!/<rss[\s>]/.test(xml.slice(0, 2_000))) {
      throw new Error("the feed answered with something that is not RSS (a bot check?)");
    }
    return parseFeed(xml);
  },
};
