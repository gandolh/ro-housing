import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  locationFromImobiliareUrl,
  parseRooms,
  parseSqm,
  pickLargestPriceEur,
  stripTrailingPrice,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const imobiliareAdapter: Adapter = {
  id: 'imobiliare',
  displayName: 'imobiliare.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];

    $('a[href*="/oferta/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      const m = url.match(/\/oferta\/([^/?#]+)/);
      const sourceUid = m && m[1] ? m[1] : url;
      if (seen.has(sourceUid)) return;
      seen.add(sourceUid);

      const card = $(el).closest('article, [class*="card"], [class*="anunt"]');
      const root = card.length ? card : $(el);
      const text = root.text();

      const rawTitle =
        $(el).attr('title') ?? root.find('h2, h3').first().text();

      out.push({
        sourceUid,
        url,
        title: stripTrailingPrice(rawTitle),
        // Card text contains discount blurbs ("+ 2000 € Discount") plus the
        // real price; pick the largest match so we don't pin the discount.
        priceEur: pickLargestPriceEur(text),
        rooms: parseRooms(text.match(/(?<![\d.,])\d+\s*(camere|camera|cam\b)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp)/i)?.[0]),
        // Imobiliare's listing cards don't carry a stable location class, but
        // every URL embeds the neighborhood between "timisoara-" and the room
        // count. Fall back to whatever loose match the card text might hold.
        location:
          locationFromImobiliareUrl(url) ??
          stripTrailingPrice(
            root.find('[class*="locat"], [class*="zona"]').first().text(),
          ),
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
