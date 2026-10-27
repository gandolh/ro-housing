import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  cleanText,
  extractPriceEur,
  parseRooms,
  parseSqm,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const blitzAdapter: Adapter = {
  id: 'blitz',
  displayName: 'blitz.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];

    $('a[href*="blitz"][href*="av"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      const m = url.match(/blitz(\d+)av/);
      const sourceUid = m && m[1] ? `blitz${m[1]}` : url;
      if (seen.has(sourceUid)) return;
      seen.add(sourceUid);

      const card = $(el).closest('div, article, li');
      const root = card.length ? card : $(el);
      const text = root.text();

      const roomsFromUrl = url.match(/-(\d+)-camer/);
      const neighborhood = url.match(/-camere?-([a-z0-9-]+?)(?:-blitz|$)/i);

      out.push({
        sourceUid,
        url,
        title: cleanText(root.find('h2, h3').first().text()) ??
          cleanText($(el).text()),
        priceEur: extractPriceEur(text),
        rooms: roomsFromUrl && roomsFromUrl[1]
          ? Number(roomsFromUrl[1])
          : parseRooms(text.match(/\d+\s*(camere|camera|cam\b)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp)/i)?.[0]),
        location:
          (neighborhood && neighborhood[1]
            ? neighborhood[1].replace(/-/g, ' ')
            : undefined) ??
          cleanText(root.find('[class*="locat"]').first().text()),
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
