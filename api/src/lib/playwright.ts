import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

/** One shared Chromium, launched on first use. A launch that fails (Chromium
 *  not installed yet) and a browser that goes away (a crash, the laptop
 *  sleeping) clear the cache, so the next call launches again instead of
 *  failing until the API is restarted. */
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const launching: Promise<Browser> = chromium.launch({ headless: true }).then(
      (browser) => {
        browser.on('disconnected', () => {
          if (browserPromise === launching) browserPromise = null;
        });
        return browser;
      },
      (err: unknown) => {
        if (browserPromise === launching) browserPromise = null;
        throw err;
      },
    );
    browserPromise = launching;
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  const b = await pending.catch(() => null);
  await b?.close();
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
