/**
 * Where the API is, as the browser sees it. Caddy on the VPS and Vite's dev
 * proxy both forward `/ro-housing-api/*` to the API with the prefix stripped,
 * so one build runs in both places.
 */
export const API_BASE = "/ro-housing-api";

/**
 * The app's root path with one trailing slash: `/ro-housing/` unless the build
 * set `RO_HOUSING_BASE` (vite.config.ts). Read on every call, so tests can stub
 * `import.meta.env.BASE_URL`.
 */
export function appBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}
