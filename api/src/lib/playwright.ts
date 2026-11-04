import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;

/** One shared Chromium, launched on first use. A launch that fails (Chromium
 *  not installed yet) and a browser that goes away (a crash, the laptop
 *  sleeping) clear the cache, so the next call launches again instead of
 *  failing until the API is restarted. */
/** Chromium's flags. In the container, `/dev/shm` is Docker's 64 MB default,
 *  too small for a heavy page; the image sets `CHROMIUM_DISABLE_DEV_SHM=1` and
 *  Chromium writes that memory to `/tmp` instead. (Playwright already turns
 *  the sandbox off, which a root user in a container needs.) */
export function launchArgs(env: NodeJS.ProcessEnv = process.env): string[] {
  return env.CHROMIUM_DISABLE_DEV_SHM === '1' ? ['--disable-dev-shm-usage'] : [];
}

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const launching: Promise<Browser> = chromium.launch({ headless: true, args: launchArgs() }).then(
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
