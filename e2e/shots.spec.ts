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
