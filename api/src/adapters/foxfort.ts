import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  cleanText,
  extractPriceEur,
  parseRooms,
  parseSqm,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const foxfortAdapter: Adapter = {
  id: 'foxfort',
  displayName: 'foxfort.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];

    $('a[href*="oferta-p"], a[href*="/vanzare-apartamente/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      const m = url.match(/oferta-p(\d+)/);
      const sourceUid = m && m[1] ? `p${m[1]}` : url;
      if (seen.has(sourceUid) || !/oferta-p/.test(url)) return;
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
