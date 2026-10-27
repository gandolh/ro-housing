import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in for playwright's chromium: each test queues what launch() does.
const launch = vi.hoisted(() => vi.fn());
vi.mock('playwright', () => ({ chromium: { launch } }));

function fakeBrowser() {
  return Object.assign(new EventEmitter(), { close: vi.fn(async () => {}) });
}

let getBrowser: typeof import('./playwright.ts').getBrowser;
let closeBrowser: typeof import('./playwright.ts').closeBrowser;

beforeEach(async () => {
  launch.mockReset();
  vi.resetModules();
  ({ getBrowser, closeBrowser } = await import('./playwright.ts'));
});

describe('getBrowser', () => {
  it('launches again after a failed launch', async () => {
    const browser = fakeBrowser();
    launch
      .mockRejectedValueOnce(new Error("Executable doesn't exist; run npx playwright install"))
      .mockResolvedValueOnce(browser);

    await expect(getBrowser()).rejects.toThrow("Executable doesn't exist");
    await expect(getBrowser()).resolves.toBe(browser);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('shares one browser between calls', async () => {
    launch.mockResolvedValue(fakeBrowser());

    const [a, b] = await Promise.all([getBrowser(), getBrowser()]);
    expect(a).toBe(b);
    expect(await getBrowser()).toBe(a);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it('launches a new browser after the old one disconnects', async () => {
    const crashed = fakeBrowser();
    const fresh = fakeBrowser();
    launch.mockResolvedValueOnce(crashed).mockResolvedValueOnce(fresh);

    expect(await getBrowser()).toBe(crashed);
    crashed.emit('disconnected');
    expect(await getBrowser()).toBe(fresh);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('does not forget a newer browser when an old one disconnects late', async () => {
    const old = fakeBrowser();
    const current = fakeBrowser();
    launch.mockResolvedValueOnce(old).mockResolvedValueOnce(current);

    await getBrowser();
    old.emit('disconnected');
    await getBrowser();
    old.emit('disconnected');
    expect(await getBrowser()).toBe(current);
    expect(launch).toHaveBeenCalledTimes(2);
  });
});

describe('closeBrowser', () => {
  it('closes the browser, and shrugs off a launch that failed', async () => {
    const browser = fakeBrowser();
    launch.mockResolvedValueOnce(browser);
    await getBrowser();
    await closeBrowser();
    expect(browser.close).toHaveBeenCalledTimes(1);

    launch.mockRejectedValueOnce(new Error('no chromium'));
    const failed = getBrowser();
    await closeBrowser();
    await expect(failed).rejects.toThrow('no chromium');
  });
});
