import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import {
  cardPrice,
  cleanText,
  parseRooms,
  parseSqm,
} from '../lib/normalize.ts';
import type { Adapter, ScrapedListing } from './types.ts';

export const agentieImoTmAdapter: Adapter = {
  id: 'agentie-imo-tm',
  displayName: 'agentie-imobiliare-timisoara.ro',
  async scrape(searchUrl) {
    const session = createSession();
    const html = await session.get(searchUrl);
    const $ = cheerio.load(html);

    const seen = new Set<string>();
    const out: ScrapedListing[] = [];

    $('a[href*="imobile="], a[href*="apartament-"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const url = new URL(href, searchUrl).toString();
      const idMatch = url.match(/[?&]id=(\d+)/) ?? url.match(/-(\d+)(?:[.?&]|$)/);
      const sourceUid = idMatch && idMatch[1] ? idMatch[1] : url;
      if (seen.has(sourceUid)) return;
      seen.add(sourceUid);

      const card = $(el).closest('tr, div, article, li');
      const root = card.length ? card : $(el);
      const text = root.text();

      const roomsFromUrl = url.match(/apartament-(\d+)-camer/i);

      out.push({
        sourceUid,
        url,
        title: cleanText(root.find('h2, h3, b, strong').first().text()) ??
          cleanText($(el).text()),
        ...cardPrice(text),
        rooms: roomsFromUrl && roomsFromUrl[1]
          ? Number(roomsFromUrl[1])
          : parseRooms(text.match(/\d+\s*(camere|camera|cam\b)/i)?.[0]),
        sqm: parseSqm(text.match(/[\d.,]+\s*(m\s*²|m\s*2|mp)/i)?.[0]),
        location: undefined,
        raw: { snippet: text.slice(0, 400) },
      });
    });

    return out;
  },
};
