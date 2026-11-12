import { API_PREFIX } from "../config.ts";

/** A URL without a leading API prefix, when `/`, `?` or the end follows it;
 *  any other URL as it is. Caddy strips the prefix on the VPS and Vite's proxy
 *  in development; this covers a request that reaches the API directly. */
export function stripApiPrefix(url: string, prefix: string = API_PREFIX): string {
  if (!url.startsWith(prefix)) return url;
  const rest = url.slice(prefix.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}
