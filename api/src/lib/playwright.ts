import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}

export async function fetchRenderedHtml(
  url: string,
  waitForSelector?: string,
): Promise<string> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ro-RO',
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 20_000 });
    }
    return await page.content();
  } finally {
    await ctx.close();
  }
}
