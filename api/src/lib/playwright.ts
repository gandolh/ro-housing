import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { LocalAddressError, publicAddresses, type Resolve } from './fetch.ts';

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

/**
 * Whether Chromium may load a URL: http(s) only, on a host that is, or
 * resolves to, public addresses only (the check `lib/fetch.ts` makes before
 * each hop). A name that does not resolve is refused too. One verdict per
 * host, kept for the page's lifetime, so a page's dozens of requests to the
 * same hosts cost one lookup each.
 */
export function browserFilter(resolve?: Resolve): (url: string) => Promise<boolean> {
  const verdicts = new Map<string, Promise<boolean>>();
  return async (raw) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    let verdict = verdicts.get(url.hostname);
    if (!verdict) {
      verdict = publicAddresses(url.hostname, resolve).then(
        () => true,
        () => false,
      );
      verdicts.set(url.hostname, verdict);
    }
    return verdict;
  };
}

/**
 * Refuses every request Chromium would make to a local address, in two places,
 * because Playwright's route handler sees only the first request of a chain,
 * never the hops a redirect leads to:
 *
 * - `context.route` checks the first request of every chain, from every frame
 *   and from any page the page opens; a request from another page than ours
 *   (a popup) is refused outright, since nothing reads it.
 * - a DevTools session on the page pauses every request and checks each one a
 *   redirect produced (`redirectedRequestId`) before it goes out.
 *
 * Chromium still resolves names itself when it connects, so a name that
 * answers public to the check and private to Chromium (DNS rebinding) gets
 * through; docs/decisions.md records that gap.
 */
export async function guardPage(
  ctx: BrowserContext,
  page: Page,
  allowed: (url: string) => Promise<boolean>,
): Promise<void> {
  await ctx.route('**/*', async (route) => {
    const request = route.request();
    let ours = false;
    try {
      ours = request.frame().page() === page;
    } catch {
      // A service worker's request has no frame; the context blocks those.
    }
    const ok = ours && (await allowed(request.url()));
    await (ok ? route.continue() : route.abort('blockedbyclient')).catch(() => {});
  });

  const cdp = await ctx.newCDPSession(page);
  cdp.on('Fetch.requestPaused', (event) => {
    const requestId = event.requestId;
    const check = event.redirectedRequestId ? allowed(event.request.url) : Promise.resolve(true);
    void check
      .then((ok) =>
        ok
          ? cdp.send('Fetch.continueRequest', { requestId })
          : cdp.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }),
      )
      .catch(() => {
        // The page closed while the request waited; nothing left to answer.
      });
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
}

/** The page at `url` as Chromium renders it, for sites that refuse plain
 *  requests or build the page in JavaScript. A link to a local address, or a
 *  redirect to one, throws `LocalAddressError` as the plain session does. */
export async function fetchRenderedHtml(
  url: string,
  waitForSelector?: string,
): Promise<string> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ro-RO',
    // Requests a service worker makes are not seen by route handlers.
    serviceWorkers: 'block',
  });
  try {
    const page = await ctx.newPage();
    await guardPage(ctx, page, browserFilter());
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    } catch (err) {
      // Only the guard blocks requests here, so the page itself, or a hop of
      // its redirect, was a local address.
      if (err instanceof Error && err.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        throw new LocalAddressError();
      }
      throw err;
    }
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 20_000 });
    }
    return await page.content();
  } finally {
    await ctx.close();
  }
}
