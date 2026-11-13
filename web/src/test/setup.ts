import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config has `globals: false`, so RTL's vitest auto-cleanup integration
// is not registered automatically. Wire it up explicitly so each test starts
// from a clean DOM.
afterEach(() => {
  cleanup();
});

// A 1280 px wide window: Listings and Saved draw their tables (lib/useLayout.ts). A test that wants the cards
// changes `window.matchMedia` itself.
window.matchMedia = (query: string): MediaQueryList => {
  const min = /min-width:\s*(\d+)px/.exec(query);
  return {
    matches: min ? 1280 >= Number(min[1]) : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  };
};
