import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { fetchListingPage, looksBlocked, PageProblem } from "./fetchPage.ts";

const fetchRenderedHtml = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/playwright.ts", () => ({ fetchRenderedHtml }));

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, "fixtures", name), "utf8");

describe("looksBlocked", () => {
  it("spots the Cloudflare block page imobiliare.ro serves to plain fetch", () => {
    expect(looksBlocked(fixture("blocked-cloudflare.html"))).toBe(true);
  });

  it("spots the DataDome CAPTCHA imobiliare.ro serves to headless Chromium", () => {
    expect(looksBlocked(fixture("blocked-datadome.html"))).toBe(true);
  });

  it.each(["storia.html", "foxfort.html", "primum.html", "apostu.html"])("passes a real listing page (%s)", (name) => {
    expect(looksBlocked(fixture(name))).toBe(false);
  });

  it("passes a page without og:title when it has real content", () => {
    const body = "<p>Apartament 2 camere, Pret: 90.000 €.</p>".repeat(20);
    expect(looksBlocked(`<html><head><title>Oferta</title></head><body>${body}</body></html>`)).toBe(false);
  });
});

describe("fetchListingPage", () => {
  it("reports a local address as unreachable, without trying the browser", async () => {
    const err = await fetchListingPage("http://127.0.0.1:9/admin").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PageProblem);
    expect((err as InstanceType<typeof PageProblem>).kind).toBe("unreachable");
    expect((err as Error).message).toMatch(/local addresses are not allowed/);
    expect(fetchRenderedHtml).not.toHaveBeenCalled();
  });
});
