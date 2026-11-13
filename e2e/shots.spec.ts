import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, openTab, SCREENS, setTheme, test } from "./fixtures.ts";

// Screenshots of every screen for comparing with the board's comps, plus the Floor's collision check and the
// first-screen counts. Run with SHOTS_DIR=<folder> (the shots stay out of git):
//   SHOTS_DIR=... npx playwright test shots
const DIR = process.env.SHOTS_DIR;
const SIZES = [
  { w: 1280, h: 800 },
  { w: 390, h: 844 },
] as const;

/** Whole rows on the first screen: not cut by the fold and not under the phone's bottom bar. */
async function firstScreenRows(page: Page, height: number): Promise<number> {
  return page.evaluate((h) => {
    const bar = document.querySelector<HTMLElement>('[role="tablist"]');
    const barTop = bar && getComputedStyle(bar).position === "sticky" ? bar.getBoundingClientRect().top : h;
    const limit = Math.min(h, barTop === h ? h : Math.max(barTop, h - 64));
    const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
    const rows = [...(panel?.querySelectorAll("tbody tr, ul > li") ?? [])] as HTMLElement[];
    return rows.filter((r) => {
      const b = r.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= limit && b.height > 0;
    }).length;
  }, height);
}

/** In each table row, the gap between the text of two neighbouring cells, smallest first. */
async function tightestCellGap(page: Page): Promise<{ gap: number; row: string } | null> {
  return page.evaluate(() => {
    let worst: { gap: number; row: string } | null = null;
    const rows = document.querySelectorAll('[role="tabpanel"]:not([hidden]) tbody tr');
    for (const tr of rows) {
      const boxes: DOMRect[] = [];
      for (const td of tr.querySelectorAll("td")) {
        const r = document.createRange();
        r.selectNodeContents(td);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        if (rects.length === 0) continue;
        const left = Math.min(...rects.map((x) => x.left));
        const right = Math.max(...rects.map((x) => x.right));
        const top = Math.min(...rects.map((x) => x.top));
        const bottom = Math.max(...rects.map((x) => x.bottom));
        boxes.push(new DOMRect(left, top, right - left, bottom - top));
      }
      for (let i = 1; i < boxes.length; i++) {
        const a = boxes[i - 1] as DOMRect;
        const b = boxes[i] as DOMRect;
        if (b.top >= a.bottom || a.top >= b.bottom) continue;
        const gap = b.left - a.right;
        if (worst === null || gap < worst.gap) worst = { gap, row: tr.textContent?.slice(0, 40) ?? "" };
      }
    }
    return worst;
  });
}

for (const size of [...SIZES, { w: 360, h: 800 }, { w: 1024, h: 800 }, { w: 768, h: 900 }] as const) {
  test(`counts and gaps at ${size.w}x${size.h}`, async ({ app: page }) => {
    await page.setViewportSize({ width: size.w, height: size.h });
    for (const screen of SCREENS) {
      await openTab(page, screen);
      await page.waitForTimeout(400); // Sources re-reads its runs when it opens
      const rows = await firstScreenRows(page, size.h);
      const gap = await tightestCellGap(page);
      console.log(
        `COUNT ${screen} ${size.w}x${size.h}: ${rows} whole rows; tightest cell gap ${gap?.gap.toFixed(1) ?? "n/a"} (${gap?.row ?? ""})`,
      );
      if (gap) expect(gap.gap, `${screen} ${size.w}: ${gap.row}`).toBeGreaterThanOrEqual(8);
    }
  });
}

test.describe("screenshots", () => {
  test.skip(!DIR, "set SHOTS_DIR");
  for (const theme of ["light", "dark"] as const) {
    for (const size of SIZES) {
      test(`drawn screens, ${theme} ${size.w}`, async ({ app: page }) => {
        mkdirSync(DIR ?? ".", { recursive: true });
        await page.setViewportSize({ width: size.w, height: size.h });
        await setTheme(page, theme);
        for (const screen of SCREENS) {
          await openTab(page, screen);
          await page.waitForTimeout(150);
          await page.screenshot({
            path: join(DIR ?? ".", `${screen.toLowerCase()}-${theme}-${size.w}.png`),
            fullPage: true,
          });
        }
      });
    }
  }
});

// The screens the board never drew, once per width in the light theme: sign-in, the dialogs, the draft and the
// empty, error and refreshing states.
test.describe("undrawn screens", () => {
  test.skip(!DIR, "set SHOTS_DIR");
  for (const size of SIZES) {
    const shoot = async (page: Page, name: string) => {
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(DIR ?? ".", `${name}-light-${size.w}.png`), fullPage: true });
    };

    test(`sign-in ${size.w}`, async ({ page }) => {
      mkdirSync(DIR ?? ".", { recursive: true });
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.goto("");
      await page.getByLabel("Username").waitFor();
      await shoot(page, "signin");
    });

    test(`dialogs and states ${size.w}`, async ({ app: page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      await setTheme(page, "light");

      await page.getByRole("button", { name: /shotuser/ }).click();
      await shoot(page, "account");
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /Report/ }).click();
      await shoot(page, "report");
      await page.keyboard.press("Escape");

      await openTab(page, "Saved");
      await page
        .getByRole("button", { name: /^Edit / })
        .first()
        .click();
      await shoot(page, "edit");
      await page.keyboard.press("Escape");

      await page.getByLabel("Listing link").fill("https://example.com/storia/stub");
      await page.getByRole("button", { name: "Fetch details" }).click();
      await page.getByText(/Read 4 of 10 fields/).waitFor();
      await shoot(page, "draft");
      await page.getByRole("button", { name: "Fill the gaps" }).click();
      await page.waitForTimeout(300);
      await shoot(page, "fill-gaps");
      await page.getByRole("button", { name: "Discard" }).first().click();

      await openTab(page, "Listings");
      await page.route("**/api/refresh", () => undefined);
      await page.getByRole("button", { name: "Refresh" }).click();
      await shoot(page, "refreshing");
    });

    test(`empty and error states ${size.w}`, async ({ app: page }) => {
      await page.setViewportSize({ width: size.w, height: size.h });
      await page.route("**/api/listings**", (route) => route.fulfill({ json: [] }));
      await page.route("**/api/saved", (route) =>
        route.request().method() === "GET" ? route.fulfill({ json: [] }) : route.continue(),
      );
      await page.reload();
      await page.getByRole("tab", { name: /Listings/ }).waitFor();
      await shoot(page, "listings-empty");
      await openTab(page, "Saved");
      await shoot(page, "saved-empty");

      await page.route("**/api/listings**", (route) => route.abort());
      await page.route("**/api/saved", (route) => route.fulfill({ status: 500, json: { error: "boom" } }));
      await page.route("**/api/sources", (route) => route.abort());
      await page.reload();
      await page.getByRole("tab", { name: /Listings/ }).waitFor();
      await shoot(page, "listings-error");
      await openTab(page, "Saved");
      await shoot(page, "saved-error");
      await openTab(page, "Sources");
      await shoot(page, "sources-error");
    });
  }
});
