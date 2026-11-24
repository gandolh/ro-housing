import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** How many open issues the folder holds before the form refuses another. */
export const MAX_ISSUES = 10;

/** The first six words of the report as a file-name stem. */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 6)
      .join("-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "issue"
  );
}

/** The Report button's files: one Markdown file per open issue in one folder (docs/issues.md). */
export interface IssueStore {
  /** The open issues: the `.md` files in the folder. */
  count(): number;
  /** Writes a new issue and returns its id, the file's name without `.md`. */
  add(body: string, now: Date): string;
}

/** The store on `dir`, which is created when it is missing. */
export function createIssueStore(dir: string): IssueStore {
  mkdirSync(dir, { recursive: true });
  return {
    count: () => readdirSync(dir).filter((f) => f.endsWith(".md")).length,
    add(body, now) {
      const id = `${now.getTime()}-${slugify(body)}`;
      const content = `---\nid: ${id}\ncreatedAt: ${now.toISOString()}\n---\n\n${body}\n`;
      writeFileSync(join(dir, `${id}.md`), content, { flag: "wx" });
      return id;
    },
  };
}
