import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_TEXT_TTL_MS, PageTextCache, pageText } from "./pageText.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("pageText", () => {
  it("gives the URL, title, tags, JSON scripts and visible text, scripts removed from the text", () => {
    const html = `<html><head><title>Apartament 2 camere</title>
      <meta property="og:title" content="Apartament 2 camere, Lipovei">
      <meta name="description" content="Etaj 2 din 4">
      <script type="application/ld+json">{"@type":"Apartment"}</script>
      <script>var tracking = 1;</script></head>
      <body><nav>Menu</nav><h1>Apartament</h1><p>Suprafață utilă: 52 m²</p><footer>Contact</footer></body></html>`;
    const text = pageText(html, "https://example.com/a");
    expect(text).toContain("URL: https://example.com/a");
    expect(text).toContain("Title: Apartament 2 camere");
    expect(text).toContain("og:title: Apartament 2 camere, Lipovei");
    expect(text).toContain("description: Etaj 2 din 4");
    expect(text).toContain('{"@type":"Apartment"}');
    expect(text).toContain("Suprafață utilă: 52 m²");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("Menu");
    expect(text).not.toContain("Contact");
  });

  it("caps each JSON script and the visible text", () => {
    const big = "x".repeat(20_000);
    const html = `<script id="__NEXT_DATA__" type="application/json">${big}</script><body><p>${big}</p></body>`;
    const text = pageText(html, "https://example.com/b");
    expect(text.length).toBeLessThan(6_000 + 12_000 + 200);
  });

  it("reads a real fixture page", () => {
    expect(pageText(fixture("storia.html"), "https://www.storia.ro/x")).toContain("__NEXT_DATA__");
  });
});

describe("PageTextCache", () => {
  it("forgets a page after about an hour", () => {
    let now = 0;
    const cache = new PageTextCache(PAGE_TEXT_TTL_MS, () => now);
    cache.set("https://a", "text");
    now = PAGE_TEXT_TTL_MS - 1;
    expect(cache.get("https://a")).toBe("text");
    now = PAGE_TEXT_TTL_MS + 1;
    expect(cache.get("https://a")).toBeUndefined();
  });
});
