import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  cleanText,
  extractPriceEur,
  parseRooms,
  parseSqm,
  slugFromUrl,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const districtAdapter: Adapter = {
  id: 'district',
  displayName: 'districtestate.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];
    const base = new URL(searchUrl);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      const u = new URL(url);
      if (u.host !== base.host) return;
      if (!/apartament|proprietate|listing|property/i.test(u.pathname)) return;
      if (u.pathname === base.pathname || u.pathname === '/') return;
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
        priceEur: extractPriceEur(text),
        rooms: parseRooms(text.match(/\d+\s*(camere|camera|cam\b)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp)/i)?.[0]),
        location: cleanText(
          root.find('[class*="locat"], [class*="zona"]').first().text(),
        ),
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
