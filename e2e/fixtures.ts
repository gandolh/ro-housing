import { test as base, expect, type Page } from "@playwright/test";

const HOUR = 3_600_000;

/** Every spec runs with the three routes that reach the outside stubbed: Refresh scrapes real sites, Fetch details
 *  reads a real page and Fill the gaps asks Wicket's model. A stray click gets a canned answer. */
async function stubOutside(page: Page): Promise<void> {
  await page.route("**/api/refresh", (route) =>
    route.fulfill({
      json: {
        perSource: [
          { id: "storia", ok: true, count: 4 },
          { id: "imobiliare", ok: false, count: 0, errorMsg: "Bot check" },
        ],
      },
    }),
  );
  await page.route("**/api/saved/scrape", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com/storia/stub",
        site: "storia.ro",
        existing: null,
        draft: { title: "Apartament 2 camere, Soarelui, centrală proprie", priceEur: 89000, rooms: 2, sqm: 52 },
        found: ["title", "priceEur", "rooms", "sqm"],
        via: "fetch",
        problem: null,
        fillable: true,
      },
    }),
  );
  await page.route("**/api/saved/fill**", (route) => route.fulfill({ status: 503, json: { error: "stubbed" } }));
}

export const credentials = (): { username: string; password: string } => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) throw new Error("Set E2E_USERNAME and E2E_PASSWORD to the throwaway account.");
  return { username, password };
};

interface Fixtures {
  /** A page signed in as the throwaway account, its clock frozen half a day before the demo seed's newest row
   *  was last seen, so ages and the `new` mark match the board's twins. */
  app: Page;
  stubbed: undefined;
}

export const test = base.extend<Fixtures>({
  stubbed: [
    async ({ page }, use) => {
      await stubOutside(page);
      await use(undefined);
    },
    { auto: true },
  ],
  app: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL ?? "").origin;
    const login = await page.request.post(`${origin}/ro-housing-api/auth/login`, {
      headers: { Origin: origin },
      data: credentials(),
    });
    expect(login.ok()).toBe(true);
    const listings = (await (await page.request.get(`${origin}/ro-housing-api/api/listings`)).json()) as {
      lastSeen: number;
    }[];
    const newest = Math.max(...listings.map((l) => l.lastSeen));
    await page.clock.setFixedTime(newest + 60_000 - 12 * HOUR);
    await page.goto("");
    await page.getByRole("tab", { name: /Listings/ }).waitFor();
    await use(page);
  },
});

export { expect };
export const SCREENS = ["Listings", "Saved", "Sources"] as const;

export async function openTab(page: Page, name: (typeof SCREENS)[number]): Promise<void> {
  await page.getByRole("tab", { name: new RegExp(name) }).click();
}

export async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem("theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}
