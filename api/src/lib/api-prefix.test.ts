import { describe, expect, it } from "vitest";
import { stripApiPrefix } from "./api-prefix.ts";

describe("stripApiPrefix", () => {
  it("takes /ro-housing-api off the front, and nothing else", () => {
    expect(stripApiPrefix("/ro-housing-api/api/health")).toBe("/api/health");
    expect(stripApiPrefix("/ro-housing-api")).toBe("/");
    expect(stripApiPrefix("/ro-housing-api?x=1")).toBe("/?x=1");
    expect(stripApiPrefix("/ro-housing-apix/api")).toBe("/ro-housing-apix/api");
    expect(stripApiPrefix("/api/health")).toBe("/api/health");
  });
});
