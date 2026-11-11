import { afterEach, describe, expect, it, vi } from "vitest";
import { FEED_URL, imobiliareFeedAdapter, parseFeed } from "./imobiliare-feed.ts";

// Made-up items in the feed's shape (link, pubDate, title); no real listing.
const item = (slug: string, title: string) =>
  `<item><link>https://www.imobiliare.ro/oferta/${slug}</link><pubDate>Wed, 04 Nov 2026 09:00:00 +0000</pubDate><title>${title}</title></item>`;

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0"><channel><title>Feed</title><link>https://www.imobiliare.ro</link>
${item("apartament-de-vanzare-timisoara-exemplu-2-camere-100000001", "Apartament cu 2 camere în Exemplu")}
${item("garsoniera-de-vanzare-timisoara-exemplu-30mp-100000002", "Garsonieră în Exemplu")}
${item("penthouse-de-vanzare-timisoara-exemplu-4-camere-100000003", "Penthouse cu 4 camere")}
${item("apartament-de-inchiriat-timisoara-exemplu-2-camere-100000004", "De închiriat")}
${item("casa-individuala-de-vanzare-timisoara-exemplu-5-camere-100000005", "Casă")}
${item("teren-constructii-de-vanzare-timisoara-exemplu-100000006", "Teren")}
${item("apartament-de-vanzare-cluj-napoca-exemplu-2-camere-100000007", "Alt oraș")}
${item("apartament-de-vanzare-dumbravita-timisoara-2-camere-100000008", "Lângă Timișoara")}
${item("apartament-de-vanzare-timisoara-exemplu-2-camere-100000001", "Același anunț, din nou")}
<item><link>https://evil.example/oferta/apartament-de-vanzare-timisoara-x-100000009</link><title>Alt site</title></item>
</channel></rss>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseFeed", () => {
  it("keeps flats for sale in Timișoara, with title and link only", () => {
    const rows = parseFeed(FEED);
    expect(rows.map((r) => r.sourceUid)).toEqual(["100000001", "100000002", "100000003"]);
    expect(rows[0]).toEqual({
      sourceUid: "100000001",
      url: "https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-exemplu-2-camere-100000001",
      title: "Apartament cu 2 camere în Exemplu",
      raw: {
        link: "https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-exemplu-2-camere-100000001",
        title: "Apartament cu 2 camere în Exemplu",
        pubDate: "Wed, 04 Nov 2026 09:00:00 +0000",
      },
    });
    for (const r of rows) {
      expect(r).not.toHaveProperty("priceEur");
      expect(r).not.toHaveProperty("rooms");
    }
  });

  it("gives nothing for an empty feed or a page that is not RSS", () => {
    expect(parseFeed("<rss><channel></channel></rss>")).toEqual([]);
    expect(parseFeed("<html><body>Attention Required!</body></html>")).toEqual([]);
  });
});

describe("imobiliareFeedAdapter", () => {
  it("starts with the feed URL as its search URL", () => {
    expect(imobiliareFeedAdapter.defaultSearchUrl).toBe(FEED_URL);
  });

  it("refuses any URL but the feed, without a request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      imobiliareFeedAdapter.scrape("https://www.imobiliare.ro/oferta/apartament-de-vanzare-timisoara-x-1"),
    ).rejects.toThrow(/only reads/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("makes one plain request that names the app, and reads the feed", async () => {
    const fetchSpy = vi.fn(async () => new Response(FEED, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const rows = await imobiliareFeedAdapter.scrape(FEED_URL);
    expect(rows).toHaveLength(3);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FEED_URL);
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^ro-housing/);
    expect(init.headers).not.toHaveProperty("Cookie");
  });

  it("fails on a refusal or a bot-check page, with no retry", async () => {
    const refused = vi.fn(async () => new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", refused);
    await expect(imobiliareFeedAdapter.scrape(FEED_URL)).rejects.toThrow("HTTP 403");
    expect(refused).toHaveBeenCalledTimes(1);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!DOCTYPE html><html><title>Just a moment...</title></html>", { status: 200 })),
    );
    await expect(imobiliareFeedAdapter.scrape(FEED_URL)).rejects.toThrow(/not RSS/);
  });
});
