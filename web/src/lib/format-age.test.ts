import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fmtAge, isNew } from "./format.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-10T12:00:00Z");

describe("a listing's age and the new mark", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts whole days, and says today for none", () => {
    expect(fmtAge(NOW - 3_600_000)).toBe("today");
    expect(fmtAge(NOW - DAY - 1)).toBe("1d");
    expect(fmtAge(NOW - 20.9 * DAY)).toBe("20d");
  });

  it("marks a listing first seen two days ago or less, the days the Age column shows", () => {
    expect(isNew(NOW)).toBe(true);
    expect(isNew(NOW - 2.9 * DAY)).toBe(true);
    expect(isNew(NOW - 3 * DAY)).toBe(false);
  });
});
