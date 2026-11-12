import { describe, expect, it } from "vitest";
import { savedInputSchema, savedParamsSchema } from "./schema.ts";

/** The result in the shape these tests were written against: the value, or the first issue's sentence. */
function parseSavedInput(raw: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const parsed = savedInputSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: parsed.error.issues[0]?.message ?? "" };
}

describe("savedInputSchema", () => {
  it("accepts a URL alone, everything else null", () => {
    const r = parseSavedInput({ url: "https://www.imobiliare.ro/oferta/x?utm_source=a" });
    expect(r).toEqual({
      ok: true,
      value: {
        url: "https://www.imobiliare.ro/oferta/x",
        title: null,
        priceEur: null,
        pricePlusVat: false,
        rooms: null,
        sqm: null,
        floor: null,
        floorsTotal: null,
        yearBuilt: null,
        location: null,
        partitioning: null,
        imageUrl: null,
        notes: null,
      },
    });
  });

  it("trims text and treats blanks as empty", () => {
    const r = parseSavedInput({ url: "https://a.ro/1", title: "  Ap 2 camere ", location: "   " });
    expect(r.ok && r.value.title).toBe("Ap 2 camere");
    expect(r.ok && r.value.location).toBeNull();
  });

  it("keeps a full set of values", () => {
    const r = parseSavedInput({
      url: "https://a.ro/1",
      priceEur: 72000,
      rooms: 2,
      sqm: 42.5,
      floor: 0,
      floorsTotal: 4,
      yearBuilt: 1980,
      partitioning: "semidecomandat",
      imageUrl: "https://cdn.a.ro/i.jpg;s=1200x0",
      notes: "next to the tram",
    });
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toMatchObject({ floor: 0, sqm: 42.5, partitioning: "semidecomandat" });
  });

  it.each([
    [{}, /url/],
    [{ url: 5 }, /url must be an http/],
    [{ url: "https://a.ro/1", title: 5 }, /title must be text/],
    [{ url: "https://a.ro/1", title: "t".repeat(301) }, /title is too long \(max 300/],
    [{ url: "https://a.ro/1", sqm: 2001 }, /sqm must be between 1 and 2000/],
    [{ url: "https://a.ro/1", floor: -3 }, /floor must be between -2 and 60/],
    [{ url: "not a link" }, /url/],
    [{ url: "https://a.ro/1", priceEur: "72000" }, /priceEur must be a number/],
    [{ url: "https://a.ro/1", rooms: 2.5 }, /whole number/],
    [{ url: "https://a.ro/1", yearBuilt: 1500 }, /yearBuilt must be between/],
    [{ url: "https://a.ro/1", floor: 5, floorsTotal: 4 }, /above the number of floors/],
    [{ url: "https://a.ro/1", partitioning: "open space" }, /partitioning must be one of/],
    [{ url: "https://a.ro/1", imageUrl: "javascript:x" }, /imageUrl/],
    [{ url: "https://a.ro/1", notes: "x".repeat(5001) }, /notes is too long/],
  ])("rejects %j", (body, error) => {
    const r = parseSavedInput(body);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(error);
  });

  it("rejects a non-object body, with the sentence the form shows", () => {
    expect(parseSavedInput(null)).toEqual({ ok: false, error: "expected a JSON object" });
    expect(parseSavedInput([1])).toEqual({ ok: false, error: "expected a JSON object" });
  });

  it("reads an empty string as a number left empty", () => {
    expect(parseSavedInput({ url: "https://a.ro/1", priceEur: "" })).toMatchObject({
      ok: true,
      value: { priceEur: null },
    });
  });

  it("takes the newest year from the clock when the request arrives", () => {
    const next = new Date().getFullYear() + 5;
    expect(parseSavedInput({ url: "https://a.ro/1", yearBuilt: next })).toMatchObject({ ok: true });
    expect(parseSavedInput({ url: "https://a.ro/1", yearBuilt: next + 1 })).toEqual({
      ok: false,
      error: `yearBuilt must be between 1800 and ${next}`,
    });
  });

  it("keeps the before-VAT mark, and refuses anything but true or false", () => {
    const url = "https://www.storia.ro/ro/oferta/x";
    const r = parseSavedInput({ url, priceEur: 92033, pricePlusVat: true });
    expect(r.ok && r.value.pricePlusVat).toBe(true);
    expect(parseSavedInput({ url, pricePlusVat: null })).toMatchObject({ ok: true });
    expect(parseSavedInput({ url, pricePlusVat: "yes" })).toEqual({
      ok: false,
      error: "pricePlusVat must be true or false",
    });
  });
});

describe("savedParamsSchema", () => {
  it("reads the id as a positive whole number, and says bad id otherwise", () => {
    expect(savedParamsSchema.parse({ id: "12" })).toEqual({ id: 12 });
    for (const id of ["abc", "0", "-1", "1.5", ""]) {
      const parsed = savedParamsSchema.safeParse({ id });
      expect(parsed.success, id).toBe(false);
      expect(parsed.error?.issues[0]?.message, id).toBe("bad id");
    }
  });
});
