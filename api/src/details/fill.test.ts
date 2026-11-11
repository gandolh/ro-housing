import { describe, expect, it } from "vitest";
import { FillAnswerError, fillMessages, fillSchema, mergeFill } from "./fill.ts";

describe("mergeFill", () => {
  it("keeps only the asked fields, and only values", () => {
    const answer = JSON.stringify({ rooms: 3, floorsTotal: 4, location: "Lipovei", priceEur: 99000, extra: "x" });
    expect(mergeFill(answer, ["rooms", "floorsTotal", "yearBuilt"])).toEqual({ rooms: 3, floorsTotal: 4 });
  });

  it("runs the extractor's sanity ranges", () => {
    const answer = JSON.stringify({ rooms: 40, sqm: 3, yearBuilt: 1975, priceEur: 120000.4, floor: 2 });
    expect(mergeFill(answer, ["rooms", "sqm", "yearBuilt", "priceEur", "floor"])).toEqual({
      yearBuilt: 1975,
      priceEur: 120000,
      floor: 2,
    });
  });

  it("drops a value of the wrong type, a partitioning not of the four, and a bad photo link", () => {
    const answer = JSON.stringify({
      rooms: "3",
      partitioning: "open plan",
      imageUrl: "photo.jpg",
      title: "  Apartament 2 camere  ",
    });
    expect(mergeFill(answer, ["rooms", "partitioning", "imageUrl", "title"])).toEqual({
      title: "Apartament 2 camere",
    });
    expect(mergeFill(JSON.stringify({ partitioning: "decomandat" }), ["partitioning"])).toEqual({
      partitioning: "decomandat",
    });
  });

  it("refuses an answer that is not a JSON object", () => {
    expect(() => mergeFill("Sure! Here are the fields", ["rooms"])).toThrow(FillAnswerError);
    expect(() => mergeFill("[1,2]", ["rooms"])).toThrow(FillAnswerError);
  });
});

describe("the request", () => {
  it("asks for the given fields only, every one nullable, partitioning held to four values", () => {
    const schema = fillSchema(["rooms", "partitioning"]) as {
      properties: Record<string, { type: string[]; enum?: unknown[] }>;
      required: string[];
      additionalProperties: boolean;
    };
    expect(Object.keys(schema.properties)).toEqual(["rooms", "partitioning"]);
    expect(schema.properties.rooms!.type).toEqual(["number", "null"]);
    expect(schema.properties.partitioning!.enum).toEqual([
      "decomandat",
      "semidecomandat",
      "nedecomandat",
      "circular",
      null,
    ]);
    expect(schema.required).toEqual(["rooms", "partitioning"]);
    expect(schema.additionalProperties).toBe(false);
  });

  it("names the fields and says never to guess", () => {
    const [system, user] = fillMessages("URL: https://x", ["floorsTotal"]);
    expect(system!.content).toContain("floorsTotal");
    expect(system!.content).toContain('"P+4" is 4');
    expect(system!.content).toContain("return null. Never guess.");
    expect(system!.content).not.toContain("rooms");
    expect(user).toEqual({ role: "user", content: "URL: https://x" });
  });
});
