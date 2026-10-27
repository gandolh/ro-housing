import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  cardPrice,
  cleanText,
  parseRooms,
  parseSqm,
  slugFromUrl,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const hitchmosherAdapter: Adapter = {
  id: 'hitchmosher',
  displayName: 'hitchmosher.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];

    $('a[href*="/apartments/"], a[href*="/apartamente/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      if (!/\/(apartments|apartamente)\/.+/.test(new URL(url).pathname)) return;
      const sourceUid = slugFromUrl(url);
      if (seen.has(sourceUid)) return;
      seen.add(sourceUid);

      const card = $(el).closest('div, article, li');
      const root = card.length ? card : $(el);
      const text = root.text();

      out.push({
        sourceUid,
        url,
        title: cleanText(root.find('h2, h3, .title').first().text()),
        ...cardPrice(text),
        rooms: parseRooms(text.match(/\d+\s*(camere|camera|cam\b|room|bedroom)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp|sqm)/i)?.[0]),
        location: cleanText(
          root.find('[class*="locat"], [class*="address"]').first().text(),
        ),
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
