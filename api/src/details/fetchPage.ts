import * as cheerio from 'cheerio';
import { createSession } from '../lib/fetch.ts';
import { fetchRenderedHtml } from '../lib/playwright.ts';

export type FetchVia = 'fetch' | 'browser';

export type PageProblemKind = 'blocked' | 'not_found' | 'unreachable';

export class PageProblem extends Error {
  constructor(
    public kind: PageProblemKind,
    message: string,
  ) {
    super(message);
  }
}

/** A bot check (Cloudflare, DataDome) instead of the listing. Real listing
 *  pages on every site tested carry og:title; challenge pages don't, and are
 *  either a known challenge or almost empty. */
export function looksBlocked(html: string): boolean {
  const $ = cheerio.load(html);
  if ($('meta[property="og:title"]').attr('content')) return false;
  const title = $('title').first().text();
  if (/attention required|just a moment|access denied|captcha|un moment/i.test(title)) {
    return true;
  }
  if (/captcha-delivery\.com|cf-chl-/.test(html)) return true;
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().length < 500;
}

/** "fetch failed" alone says nothing; Node puts the reason in `cause`. */
function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: { code?: string } }).cause;
  return cause?.code ? `${err.message}: ${cause.code}` : err.message;
}

const RETRY_IN_BROWSER = /HTTP (401|403|429|503)\b/;

/** Plain HTTP first (fast, and enough for storia and the agency sites), then a
 *  headless Chromium when the site refuses plain requests. Never tries to get
 *  past a CAPTCHA: a bot check in the browser too is reported as `blocked`. */
export async function fetchListingPage(
  url: string,
): Promise<{ html: string; via: FetchVia }> {
  let plainError: string | undefined;
  try {
    const html = await createSession().get(url);
    if (!looksBlocked(html)) return { html, via: 'fetch' };
    plainError = 'bot check';
  } catch (err) {
    const msg = describe(err);
    if (/HTTP (404|410)\b/.test(msg)) {
      throw new PageProblem(
        'not_found',
        'The site says this page does not exist. The listing may have been taken down.',
      );
    }
    if (!RETRY_IN_BROWSER.test(msg)) {
      throw new PageProblem('unreachable', `Could not load the page (${msg}).`);
    }
    plainError = msg;
  }

  let html: string;
  try {
    html = await fetchRenderedHtml(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    throw new PageProblem(
      'unreachable',
      `The site refused a plain request (${plainError}) and the browser could not load it either (${msg}).`,
    );
  }
  if (looksBlocked(html)) {
    throw new PageProblem(
      'blocked',
      'The site answered with a bot check instead of the listing.',
    );
  }
  return { html, via: 'browser' };
}
