import * as cheerio from 'cheerio';
import { fetchRenderedHtml } from '../lib/playwright.ts';
import {
  cardPrice,
  cleanText,
  parseRooms,
  parseSqm,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const storiaAdapter: Adapter = {
  id: 'storia',
  displayName: 'storia.ro',
  async scrape(searchUrl) {
    const html = await fetchRenderedHtml(
      searchUrl,
      'a[href*="/oferta/"], [data-cy="search.listing"]',
    );
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

      const card = $(el).closest('article, [data-cy*="listing"]');
      const root = card.length ? card : $(el);
      const text = root.text();

      out.push({
        sourceUid,
        url,
        title: cleanText(root.find('p, h2, h3').first().text()),
        ...cardPrice(text),
        rooms: parseRooms(text.match(/\d+\s*(camere|camera|cam\b|room)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp)/i)?.[0]),
        location: cleanText(
          root
            .find('[data-cy*="location"], [data-testid*="location"], p')
            .first()
            .text(),
        ),
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
