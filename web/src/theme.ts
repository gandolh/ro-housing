/** The theme the user picked. `system` follows the operating system, live, through CSS `color-scheme`. */
export type Theme = "light" | "dark" | "system";

export const THEMES: readonly { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const KEY = "theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** The saved choice; light on a first visit, or when storage is blocked. */
export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return isTheme(value) ? value : "light";
  } catch {
    return "light";
  }
}

/** Keeps the choice on this device. */
export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage is blocked (a private window): the choice lasts until the tab closes.
  }
}

/** Puts the choice on <html>: CSS picks each light-dark() token from it, and `system` tracks the OS live. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
