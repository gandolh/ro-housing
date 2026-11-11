/// <reference types="node" />
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { applyTheme, readTheme, saveTheme } from "./theme.ts";

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("theme", () => {
  it("is light on a first visit", () => {
    expect(readTheme()).toBe("light");
    applyTheme(readTheme());
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("keeps Dark across a reload", () => {
    saveTheme("dark");
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    // A reload reads the device again.
    delete document.documentElement.dataset.theme;
    expect(readTheme()).toBe("dark");
    applyTheme(readTheme());
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("puts System on <html>, where CSS color-scheme follows the system live", () => {
    saveTheme("system");
    applyTheme(readTheme());
    expect(document.documentElement.dataset.theme).toBe("system");
  });

  it("ignores a stored value that is not a theme", () => {
    localStorage.setItem("theme", "sepia");
    expect(readTheme()).toBe("light");
  });

  it("falls back to light when storage throws", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(readTheme()).toBe("light");
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe("the boot script in index.html", () => {
  const html = readFileSync(`${import.meta.dirname}/../index.html`, "utf8");
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
  const boot = () => new Function(script)();

  it("sets light when nothing is saved", () => {
    boot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("sets the saved choice before first paint", () => {
    localStorage.setItem("theme", "dark");
    boot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
