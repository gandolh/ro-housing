import { describe, expect, it } from "vitest";
import { assertPublicHost, isPrivateAddress, normalizeListingUrl, siteOf } from "./url.ts";

describe("normalizeListingUrl", () => {
  it("drops tracking params, the hash and a trailing slash", () => {
    expect(
      normalizeListingUrl(
        " https://www.storia.ro/ro/oferta/apartament-IDIUGS/?utm_source=dark&utm_medium=social#gallery ",
      ),
    ).toBe("https://www.storia.ro/ro/oferta/apartament-IDIUGS");
  });

  it("keeps params that identify the listing", () => {
    expect(normalizeListingUrl("https://agentie.ro/oferta.php?id=42&fbclid=x")).toBe(
      "https://agentie.ro/oferta.php?id=42",
    );
  });

  it("rejects anything that is not http(s)", () => {
    expect(normalizeListingUrl("storia.ro/oferta/1")).toBeUndefined();
    expect(normalizeListingUrl("file:///etc/passwd")).toBeUndefined();
    expect(normalizeListingUrl("javascript:alert(1)")).toBeUndefined();
  });
});

describe("siteOf", () => {
  it("drops www.", () => {
    expect(siteOf("https://www.storia.ro/ro/oferta/x")).toBe("storia.ro");
    expect(siteOf("https://foxfort.ro/x")).toBe("foxfort.ro");
  });
});

describe("local-address guard", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.10",
    "169.254.169.254",
    "::1",
    "fd00::1",
    "::ffff:192.168.0.1",
  ])("%s is private", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["89.36.0.1", "172.32.0.1", "2a02:2f0c::1"])("%s is public", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );

  // IPv6 forms that carry an IPv4 address are judged as that address.
  it.each([
    "::", // unspecified
    "::ffff:7f00:1", // mapped 127.0.0.1, written in hex
    "64:ff9b::7f00:1", // NAT64 of 127.0.0.1
    "64:ff9b::a9fe:a9fe", // NAT64 of the cloud metadata address
    "64:ff9b::10.0.0.1",
    "::7f00:1", // IPv4-compatible 127.0.0.1
    "::192.168.1.1",
    "2002:7f00:1::", // 6to4, refused whatever it carries
    "2002:5d8:d822::1",
    "fe80::1%eth0", // link-local with a zone id
    "ff02::1", // multicast
    "224.0.0.1",
    "255.255.255.255",
    "not-an-ip",
  ])("%s is private", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each([
    "64:ff9b::808:808", // NAT64 of 8.8.8.8 is that public address
    "::ffff:89.36.0.1",
    "2001:db8:2002::1", // 2002 counts only as the first group
  ])("%s is public", (ip) => expect(isPrivateAddress(ip)).toBe(false));

  it("refuses localhost and private IP literals without a DNS lookup", async () => {
    await expect(assertPublicHost("http://localhost:3000/api")).rejects.toThrow(/local/);
    await expect(assertPublicHost("http://192.168.1.1/")).rejects.toThrow(/local/);
    await expect(assertPublicHost("http://[::1]/")).rejects.toThrow(/local/);
    await expect(assertPublicHost("http://89.36.0.1/")).resolves.toBeUndefined();
  });
});
