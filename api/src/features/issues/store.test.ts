import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createIssueStore, MAX_ISSUES, slugify } from "./store.ts";

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function freshIssuesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "ro-housing-issues-"));
  created.push(dir);
  return dir;
}

describe("slugify", () => {
  it("slugifies the first six words", () => {
    expect(slugify("Refresh feels slow when storia is enabled, please show progress")).toBe(
      "refresh-feels-slow-when-storia-is",
    );
  });

  it('falls back to "issue" if body has no alphanumerics', () => {
    expect(slugify("!!!")).toBe("issue");
  });

  it("truncates very long slugs", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });
});

describe("the issue store", () => {
  it("makes its folder, and counts only the .md files in it", () => {
    const dir = join(freshIssuesDir(), "nested");
    const store = createIssueStore(dir);
    writeFileSync(join(dir, "README.txt"), "ignore me");
    expect(store.count()).toBe(0);
    store.add("one", new Date("2026-11-12T10:00:00.000Z"));
    expect(store.count()).toBe(1);
  });

  it("writes one file per issue, named by time and slug, with front matter", () => {
    const dir = freshIssuesDir();
    const now = new Date("2026-11-12T10:00:00.000Z");
    const id = createIssueStore(dir).add("The refresh feels slow", now);
    expect(id).toBe(`${now.getTime()}-the-refresh-feels-slow`);
    expect(readdirSync(dir)).toEqual([`${id}.md`]);
    expect(readFileSync(join(dir, `${id}.md`), "utf8")).toBe(
      `---\nid: ${id}\ncreatedAt: 2026-11-12T10:00:00.000Z\n---\n\nThe refresh feels slow\n`,
    );
  });

  it("counts up to the cap the route enforces", () => {
    const dir = freshIssuesDir();
    for (let i = 0; i < MAX_ISSUES; i++) writeFileSync(join(dir, `${i}.md`), "---\n");
    expect(createIssueStore(dir).count()).toBe(MAX_ISSUES);
  });
});
