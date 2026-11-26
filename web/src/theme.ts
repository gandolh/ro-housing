/** The theme the user picked. `system` follows the operating system, live, through CSS `color-scheme`. */
export type Theme = "light" | "dark" | "system";

export const THEMES: readonly { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** The app's own key: one localStorage serves every app on the domain, so the name carries the app's. */
const KEY = "ro-housing.theme";
/** The bare key older builds used, read once to carry the choice over and never written. */
const LEGACY_THEME_KEY = "theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** The saved choice; light on a first visit, or when storage is blocked. */
export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (isTheme(value)) return value;
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (!isTheme(legacy)) return "light";
    localStorage.setItem(KEY, legacy);
    return legacy;
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
