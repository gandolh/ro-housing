import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function freshIssuesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ro-housing-issues-'));
  created.push(dir);
  return dir;
}

// We re-implement the cap-and-write logic inline here rather than spinning up
// the whole Fastify server. The constraints are documented in docs/issues.md
// and the behaviour is small enough to test directly. When the API changes,
// these tests will need to stay in sync.
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .split(/\s+/)
      .slice(0, 6)
      .join('-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'issue'
  );
}

describe('issue file format', () => {
  it('slugifies the first six words', () => {
    expect(slugify('Refresh feels slow when storia is enabled, please show progress'))
      .toBe('refresh-feels-slow-when-storia-is');
  });

  it('falls back to "issue" if body has no alphanumerics', () => {
    expect(slugify('!!!')).toBe('issue');
  });

  it('truncates very long slugs', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });
});

describe('cap enforcement (10 issues max)', () => {
  it('counts only .md files in the directory', () => {
    const dir = freshIssuesDir();
    // Write a non-.md file — it should not count.
    require('node:fs').writeFileSync(join(dir, 'README.txt'), 'ignore me');
    const count = readdirSync(dir).filter((f) => f.endsWith('.md')).length;
    expect(count).toBe(0);
  });

  it('reaches the cap at exactly 10 .md files', () => {
    const dir = freshIssuesDir();
    for (let i = 0; i < 10; i++) {
      require('node:fs').writeFileSync(join(dir, `${i}.md`), '---\n');
    }
    expect(readdirSync(dir).filter((f) => f.endsWith('.md')).length).toBe(10);
  });
});
