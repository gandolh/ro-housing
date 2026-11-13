import type { Page } from "@playwright/test";
import { expect, openTab, SCREENS, setTheme, test } from "./fixtures.ts";

// The Floor's browser checks, on every screen in both themes: a visible focus ring on every control, no running
// transition under prefers-reduced-motion, no sideways scroll at 390 px, and the theme switch.

const THEMES = ["light", "dark"] as const;

/** Tabs through the open screen; every element that takes keyboard focus shows a 2px or thicker outline. */
async function everyFocusShowsARing(page: Page): Promise<string[]> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const bad: string[] = [];
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        label: `${el.tagName.toLowerCase()} ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`,
        visible: el.matches(":focus-visible"),
        style: cs.outlineStyle,
        width: parseFloat(cs.outlineWidth),
      };
    });
    if (state === null) break;
    if (!state.visible || state.style === "none" || state.width < 2) bad.push(state.label);
  }
  return bad;
}

for (const theme of THEMES) {
  for (const screen of SCREENS) {
    test(`focus ring on every control: ${screen}, ${theme}`, async ({ app: page }) => {
      await setTheme(page, theme);
      await openTab(page, screen);
      expect(await everyFocusShowsARing(page)).toEqual([]);
    });

    test(`no running transition with reduced motion: ${screen}, ${theme}`, async ({ app: page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setTheme(page, theme);
      await openTab(page, screen);
      const moving = await page.evaluate(() => ({
        animations: document.getAnimations().length,
        transitions: [...document.querySelectorAll("*")]
          .filter((el) =>
            getComputedStyle(el)
              .transitionDuration.split(",")
              .some((d) => parseFloat(d) > 0),
          )
          .map((el) => el.tagName.toLowerCase()),
      }));
      expect(moving).toEqual({ animations: 0, transitions: [] });
    });

    for (const width of [390, 360]) {
      test(`no sideways scroll at ${width}: ${screen}, ${theme}`, async ({ app: page }) => {
        await page.setViewportSize({ width, height: 844 });
        await setTheme(page, theme);
        await openTab(page, screen);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });
    }
  }
}

test("the theme switch: Light, Dark and System, and the island's shadow follows", async ({ app: page }) => {
  const shadow = () => page.locator("section[aria-label='Listings']").evaluate((el) => getComputedStyle(el).boxShadow);
  const html = page.locator("html");

  await page.getByRole("button", { name: process.env.E2E_USERNAME ?? "" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Dark" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  expect(await shadow()).not.toContain("3px 3px");

  await dialog.getByRole("radio", { name: "Light" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  expect(await shadow()).toContain("3px 3px");

  await dialog.getByRole("radio", { name: "System" }).click();
  await expect(html).toHaveAttribute("data-theme", "system");
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await shadow()).not.toContain("3px 3px");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await shadow()).toContain("3px 3px");
});
