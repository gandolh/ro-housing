import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for playwright's chromium: each test queues what launch() does.
const launch = vi.hoisted(() => vi.fn());
vi.mock("playwright", () => ({ chromium: { launch } }));

function fakeBrowser() {
  return Object.assign(new EventEmitter(), { close: vi.fn(async () => {}) });
}

let getBrowser: typeof import("./playwright.ts").getBrowser;
let closeBrowser: typeof import("./playwright.ts").closeBrowser;

beforeEach(async () => {
  launch.mockReset();
  vi.resetModules();
  ({ getBrowser, closeBrowser } = await import("./playwright.ts"));
});

describe("getBrowser", () => {
  it("launches again after a failed launch", async () => {
    const browser = fakeBrowser();
    launch
      .mockRejectedValueOnce(new Error("Executable doesn't exist; run npx playwright install"))
      .mockResolvedValueOnce(browser);

    await expect(getBrowser()).rejects.toThrow("Executable doesn't exist");
    await expect(getBrowser()).resolves.toBe(browser);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("shares one browser between calls", async () => {
    launch.mockResolvedValue(fakeBrowser());

    const [a, b] = await Promise.all([getBrowser(), getBrowser()]);
    expect(a).toBe(b);
    expect(await getBrowser()).toBe(a);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("launches a new browser after the old one disconnects", async () => {
    const crashed = fakeBrowser();
    const fresh = fakeBrowser();
    launch.mockResolvedValueOnce(crashed).mockResolvedValueOnce(fresh);

    expect(await getBrowser()).toBe(crashed);
    crashed.emit("disconnected");
    expect(await getBrowser()).toBe(fresh);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("does not forget a newer browser when an old one disconnects late", async () => {
    const old = fakeBrowser();
    const current = fakeBrowser();
    launch.mockResolvedValueOnce(old).mockResolvedValueOnce(current);

    await getBrowser();
    old.emit("disconnected");
    await getBrowser();
    old.emit("disconnected");
    expect(await getBrowser()).toBe(current);
    expect(launch).toHaveBeenCalledTimes(2);
  });
});

describe("closeBrowser", () => {
  it("closes the browser, and shrugs off a launch that failed", async () => {
    const browser = fakeBrowser();
    launch.mockResolvedValueOnce(browser);
    await getBrowser();
    await closeBrowser();
    expect(browser.close).toHaveBeenCalledTimes(1);

    launch.mockRejectedValueOnce(new Error("no chromium"));
    const failed = getBrowser();
    await closeBrowser();
    await expect(failed).rejects.toThrow("no chromium");
  });
});

describe("launchArgs", () => {
  it("moves Chromium off /dev/shm only when the container asks", async () => {
    const { launchArgs } = await import("./playwright.ts");
    expect(launchArgs(false)).toEqual([]);
    expect(launchArgs(true)).toEqual(["--disable-dev-shm-usage"]);
  });
});

describe("browserFilter", () => {
  const dns: Record<string, string[]> = {
    "storia.example": ["93.184.216.34"],
    "inside.example": ["10.0.0.5"],
  };

  it("lets Chromium load a public host, and refuses local ones", async () => {
    const { browserFilter } = await import("./playwright.ts");
    const allowed = browserFilter(async (host) => dns[host] ?? []);
    expect(await allowed("https://storia.example/ro/oferta/x")).toBe(true);
    for (const url of [
      "http://127.0.0.1:8809/api",
      "http://[::1]/",
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:3000/",
      "https://inside.example/admin",
      "https://unknown.example/", // no address at all
      "file:///etc/passwd",
      "not a url",
    ]) {
      expect(await allowed(url), url).toBe(false);
    }
  });

  it("refuses a host whose name does not resolve", async () => {
    const { browserFilter } = await import("./playwright.ts");
    const allowed = browserFilter(async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" });
    });
    expect(await allowed("https://gone.example/")).toBe(false);
  });

  it("looks each host up once", async () => {
    const { browserFilter } = await import("./playwright.ts");
    const resolve = vi.fn(async (host: string) => dns[host] ?? []);
    const allowed = browserFilter(resolve);
    await Promise.all([
      allowed("https://storia.example/a.js"),
      allowed("https://storia.example/b.css"),
      allowed("https://storia.example/c.png"),
    ]);
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});

/** A context and page with just what `guardPage` and `fetchRenderedHtml`
 *  touch: the route handler and the DevTools session are kept for the test to
 *  drive. */
function fakeContext() {
  let routeHandler: ((route: unknown) => Promise<void>) | undefined;
  const cdp = Object.assign(new EventEmitter(), { send: vi.fn(async () => ({})) });
  const page = { goto: vi.fn(), waitForSelector: vi.fn(), content: vi.fn(async () => "<html></html>") };
  const ctx = {
    route: vi.fn(async (_pattern: string, handler: (route: unknown) => Promise<void>) => {
      routeHandler = handler;
    }),
    newCDPSession: vi.fn(async () => cdp),
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {}),
  };
  const route = (url: string, fromPage: unknown = page) => ({
    request: () => ({ url: () => url, frame: () => ({ page: () => fromPage }) }),
    continue: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  });
  return { ctx, page, cdp, route, routeHandler: () => routeHandler! };
}

describe("guardPage", () => {
  const allowed = async (url: string) => !url.includes("127.0.0.1");

  it("aborts a first request to a local address and lets a public one through", async () => {
    const { guardPage } = await import("./playwright.ts");
    const f = fakeContext();
    await guardPage(f.ctx as never, f.page as never, allowed);

    const good = f.route("https://storia.example/");
    await f.routeHandler()(good);
    expect(good.continue).toHaveBeenCalled();

    const bad = f.route("http://127.0.0.1:8809/api/saved");
    await f.routeHandler()(bad);
    expect(bad.abort).toHaveBeenCalledWith("blockedbyclient");
    expect(bad.continue).not.toHaveBeenCalled();
  });

  it("aborts every request from another page, such as a popup", async () => {
    const { guardPage } = await import("./playwright.ts");
    const f = fakeContext();
    await guardPage(f.ctx as never, f.page as never, allowed);
    const popup = f.route("https://storia.example/", { other: true });
    await f.routeHandler()(popup);
    expect(popup.abort).toHaveBeenCalledWith("blockedbyclient");
  });

  it("checks each hop a redirect produces, through the DevTools session", async () => {
    const { guardPage } = await import("./playwright.ts");
    const f = fakeContext();
    await guardPage(f.ctx as never, f.page as never, allowed);
    expect(f.cdp.send).toHaveBeenCalledWith("Fetch.enable", expect.anything());

    const paused = (requestId: string, url: string, redirectedRequestId?: string) =>
      f.cdp.emit("Fetch.requestPaused", { requestId, request: { url }, redirectedRequestId });
    paused("1", "https://storia.example/"); // a first request: the route handler judged it
    paused("2", "https://storia.example/ro/oferta/x", "1");
    paused("3", "http://127.0.0.1:8809/api/saved", "2");
    await vi.waitFor(() => expect(f.cdp.send).toHaveBeenCalledTimes(4));

    expect(f.cdp.send).toHaveBeenCalledWith("Fetch.continueRequest", { requestId: "1" });
    expect(f.cdp.send).toHaveBeenCalledWith("Fetch.continueRequest", { requestId: "2" });
    expect(f.cdp.send).toHaveBeenCalledWith("Fetch.failRequest", {
      requestId: "3",
      errorReason: "BlockedByClient",
    });
  });
});

describe("fetchRenderedHtml", () => {
  it("reports a page the guard refused as a local address", async () => {
    const f = fakeContext();
    f.page.goto.mockRejectedValueOnce(new Error("page.goto: net::ERR_BLOCKED_BY_CLIENT at http://127.0.0.1:8809/"));
    launch.mockResolvedValue(Object.assign(fakeBrowser(), { newContext: vi.fn(async () => f.ctx) }));
    const { fetchRenderedHtml } = await import("./playwright.ts");
    await expect(fetchRenderedHtml("http://127.0.0.1:8809/")).rejects.toThrow("local addresses are not allowed");
    expect(f.ctx.close).toHaveBeenCalled();
  });

  it("passes other failures on as they are", async () => {
    const f = fakeContext();
    f.page.goto.mockRejectedValueOnce(new Error("page.goto: Timeout 30000ms exceeded."));
    launch.mockResolvedValue(Object.assign(fakeBrowser(), { newContext: vi.fn(async () => f.ctx) }));
    const { fetchRenderedHtml } = await import("./playwright.ts");
    await expect(fetchRenderedHtml("https://storia.example/")).rejects.toThrow(/Timeout/);
  });

  it("blocks service workers and guards the page before loading it", async () => {
    const f = fakeContext();
    const newContext = vi.fn(async () => f.ctx);
    launch.mockResolvedValue(Object.assign(fakeBrowser(), { newContext }));
    const { fetchRenderedHtml } = await import("./playwright.ts");
    expect(await fetchRenderedHtml("https://storia.example/")).toBe("<html></html>");
    expect(newContext).toHaveBeenCalledWith(expect.objectContaining({ serviceWorkers: "block" }));
    expect(f.ctx.route.mock.invocationCallOrder[0]!).toBeLessThan(f.page.goto.mock.invocationCallOrder[0]!);
  });
});
