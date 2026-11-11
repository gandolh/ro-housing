/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${import.meta.dirname}/styles.css`, "utf8");

/** The colour tokens of styles.css: name to [light, dark], from `light-dark(<light>, <dark>)`. */
function tokens(): Record<string, [string, string]> {
  const out: Record<string, [string, string]> = {};
  for (const m of css.matchAll(/--color-([a-z-]+): light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\);/g)) {
    out[m[1] as string] = [m[2] as string, m[3] as string];
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const t = tokens();
const pick = (name: string, theme: 0 | 1): string => {
  const pair = t[name];
  if (!pair) throw new Error(`no --color-${name} token`);
  return pair[theme];
};

// The light theme's accent on accent-soft was 3.9:1 before this test existed, and the light look stays as it
// was. It may not drop further; the dark theme meets 4.5:1.
const LIGHT_FLOOR: Record<string, number> = { "accent/accent-soft": 3.9 };

// [text token, surface token]: every pair the app draws body text with.
const BODY: [string, string][] = [
  ["ink", "paper"],
  ["ink", "panel"],
  ["ink", "panel-alt"],
  ["ink-dim", "paper"],
  ["ink-dim", "panel"],
  ["ink-dim", "panel-alt"],
  ["accent", "paper"],
  ["accent", "panel"],
  ["accent", "accent-soft"], // 3.9:1 in light; see LIGHT_FLOOR
  ["ok", "panel"],
  ["ok", "ok-soft"],
  ["bad", "panel"],
  ["bad", "bad-soft"],
  ["warn", "panel"],
  // Inverted controls: paper on an ink fill (primary buttons, highlighted rows).
  ["paper", "ink"],
];

describe.each([
  [0, "light"],
  [1, "dark"],
] as const)("contrast in the %s theme", (theme, name) => {
  it.each(BODY)(`${name}: %s on %s meets its floor (4.5:1 for body text)`, (text, surface) => {
    const min = theme === 0 ? (LIGHT_FLOOR[`${text}/${surface}`] ?? 4.5) : 4.5;
    expect(ratio(pick(text, theme), pick(surface, theme))).toBeGreaterThanOrEqual(min);
  });

  it(`${name}: faint text (placeholders, the footer) stays as legible as the light theme's`, () => {
    // ink-faint is decorative; the light theme sets the floor.
    const floor = Math.min(
      ratio(pick("ink-faint", 0), pick("paper", 0)),
      ratio(pick("ink-faint", 0), pick("panel", 0)),
    );
    expect(ratio(pick("ink-faint", theme), pick("paper", theme))).toBeGreaterThanOrEqual(floor);
    expect(ratio(pick("ink-faint", theme), pick("panel", theme))).toBeGreaterThanOrEqual(floor);
  });
});
