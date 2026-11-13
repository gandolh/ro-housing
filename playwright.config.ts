import { defineConfig } from "@playwright/test";

// The browser checks run against a dev server the caller starts (the app's `npm run dev` in web/, over an API on
// a scratch database; see e2e/README.md). They never start one themselves, and they stub the three routes that
// reach real sites or Wicket (e2e/fixtures.ts).
export default defineConfig({
  testDir: "e2e",
  workers: 2,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173/ro-housing/",
    browserName: "chromium",
    headless: true,
  },
});
